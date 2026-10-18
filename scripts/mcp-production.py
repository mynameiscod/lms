#!/usr/bin/env python3
"""Deploy the MCP router alongside the unchanged LMS, with a dedicated DB user.

See docs/runbooks/mcp-production.md. No synthetic preparer, application restart,
Mongo recreation, credential rotation, repository reset, or implicit role grant.
"""
import argparse
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('mongo_migration', ROOT / 'scripts/mcp-production-mongo.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
require, run, docker, inspect = m.require, m.run, m.docker, m.inspect
STATE = Path('/root/lms-mcp-production/app')
ISSUER = 'https://platform.codebegun.com'
CONTAINER = 'codebegun-mcp-production'
NETWORK = 'lms_lms-network'
ACTIVE_SLOT = Path('/etc/nginx/active-slot.conf')
MARKER = 'codebegun-production-mcp-v1'
SNIPPET = Path('/etc/nginx/mcp-enabled/platform.codebegun.com/production.conf')
INCLUDE = 'include /etc/nginx/mcp-enabled/platform.codebegun.com/*.conf;'
PATTERN = r'^/(mcp(/|$)|mcp-oauth(/|$)|\.well-known/oauth-authorization-server$|\.well-known/oauth-protected-resource(/mcp)?$)'
SCOPES = ['mcp_students_read', 'mcp_batches_read', 'mcp_attendance_read', 'mcp_assessments_read',
          'mcp_finance_read', 'mcp_placements_read', 'mcp_leads_read', 'mcp_calls_read']


def write(path, value, mode=0o600):
    m.private_write(path, value if isinstance(value, str) else json.dumps(value, indent=2))
    os.chmod(path, mode)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def state():
    require(STATE.is_dir() and not STATE.is_symlink(), 'Run prepare first.')
    require(STATE.stat().st_uid == 0 and STATE.stat().st_mode & 0o077 == 0, 'Protected state directory required.')
    result = json.loads((STATE / 'state.json').read_text())
    require(result['purpose'] == MARKER, 'Unknown deployment state.')
    return result


def save(s):
    write(STATE / 'state.json', s)


def fetch(url, headers=None, method='GET', data=None):
    request = urllib.request.Request(url, headers=headers or {}, method=method, data=data)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return response.status, json.loads(response.read(65536) or b'{}')
    except urllib.error.HTTPError as error:
        return error.code, {}


def healthy():
    status, result = fetch(ISSUER + '/api/health')
    require(status == 200 and result.get('data', {}).get('ready') is True, 'The public LMS is not ready.')


def nginx_blocks(content):
    """Tokenize Nginx while retaining offsets; ignore quoted/comment braces."""
    tokens = list(re.finditer(r'''\#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{};]|[^\s{};"'\#]+''', content))
    tokens = [t for t in tokens if not t.group().startswith('#')]
    stack, blocks = [], []
    for i, token in enumerate(tokens):
        if token.group() == '{':
            stack.append((i, tokens[i - 1].group() if i else ''))
        elif token.group() == '}':
            require(bool(stack), 'Unbalanced Nginx block.')
            start, name = stack.pop()
            if name == 'server':
                blocks.append((tokens[start].end(), token.start(), content[tokens[start].end():token.start()]))
    require(not stack, 'Unbalanced Nginx configuration.')
    return blocks


def site_candidate(path):
    original = path.read_text()
    matches = [(start, end, body) for start, end, body in nginx_blocks(original)
               if re.search(r'(?m)^\s*server_name\s+[^;]*\bplatform\.codebegun\.com(?:\s|;)', body)
               and re.search(r'(?m)^\s*listen\s+(?:\S+:)?443\s+[^;]*\bssl\b', body)]
    require(len(matches) == 1, 'Expected one platform HTTPS server in the active site file.')
    start, _, body = matches[0]
    if INCLUDE in body:
        return original, original
    # Fail closed on existing MCP routing, exact routes or overriding prefixes.
    require(not re.search(r'(?mi)^\s*location[^\n{]*(?:mcp|well-known|\^~\s+/\s)', body),
            'Existing MCP/discovery routes need review before installing the production include.')
    return original, original[:start] + '\n    ' + INCLUDE + '\n' + original[start:]


def locate_site():
    result = run(['nginx', '-T'])
    paths = re.findall(r'^# configuration file ([^\n]+):$', result.stdout, re.M)
    found = []
    for name in paths:
        path = Path(name).resolve()
        if path in found or not path.is_file():
            continue
        text = path.read_text()
        if re.search(r'(?m)^\s*server_name\s+[^;]*\bplatform\.codebegun\.com(?:\s|;)', text):
            try:
                site_candidate(path)
                found.append(path)
            except m.MigrationError:
                # A separate HTTP-only file is irrelevant; HTTPS conflicts are not.
                require(not re.search(r'(?m)^\s*listen\s+(?:\S+:)?443\s', text), 'Platform HTTPS site has conflicting routing.')
    require(len(found) == 1, 'Could not identify the unique active platform HTTPS site.')
    return found[0]


def routes(enabled):
    body = '''proxy_pass http://127.0.0.1:5011;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Forwarded "";
    proxy_set_header X-Forwarded-Host "";
    proxy_set_header Connection "";
    proxy_cache off;
    proxy_buffering off;
    proxy_read_timeout 30s;
    client_max_body_size 32k;
    client_body_buffer_size 32k;''' if enabled else 'return 404;'
    return '# Managed by ' + MARKER + '\nlocation ~ ' + PATTERN + ' {\n' + \
        '    access_log off;\n    error_log /dev/null crit;\n    ' + body + '\n}\n'


def preflight():
    require(os.geteuid() == 0, 'Run as root on the VPS.')
    require(ROOT != Path('/root/lms'), 'Use the separate /root/lms-mcp-test checkout.')
    commit = run(['git', '-C', ROOT, 'rev-parse', 'HEAD']).stdout.strip()
    require(run(['git', '-C', ROOT, 'diff', '--quiet', 'HEAD', '--'], check=False).returncode == 0,
            'Tracked source has local edits; commit/review them before building.')
    db = inspect('lms-mongodb')
    require(db and db['State']['Running'], 'Production MongoDB is not running.')
    require(db['Image'] == 'sha256:d65a15bd109e970d7dab5496d0a4254705793b8a5c49e344aa6126d46b0e4630', 'Mongo image changed since the reviewed migration.')
    require(any(x['Destination'] == '/data/db' and x.get('Name') == 'lms_mongodb_data' for x in db['Mounts']), 'Unexpected production data volume.')
    require(db['HostConfig']['PortBindings'].get('27017/tcp') == [{'HostIp': '127.0.0.1', 'HostPort': '27017'}], 'MongoDB is not bound only to localhost.')
    status = m.status('lms-mongodb')
    require(status['version'] == '8.2.7' and status['replicaSet'] == 'lms-rs0' and status['primary']
            and status['hosts'] == ['mongodb:27017'] and status['authorization'] == 'enabled' and status['keyFile'],
            'The reviewed authenticated replica-set migration is required.')
    require(NETWORK in db['NetworkSettings']['Networks'], 'Unexpected database network.')
    require(Path('/root/lms/docker-compose.override.yml').is_file(), 'Keep the MongoDB migration override before deploying MCP.')
    healthy()
    active = ACTIVE_SLOT.read_text().strip()
    require(active in ['server 127.0.0.1:5001;', 'server 127.0.0.1:5002;'], 'Unrecognized live LMS upstream.')
    app_name = 'lms-server-blue' if ':5001;' in active else 'lms-server-green'
    app = inspect(app_name)
    require(app and app['State']['Running'], 'Active LMS container is not running.')
    site = locate_site()
    current = inspect(CONTAINER)
    if current:
        require(current['Config'].get('Labels', {}).get('codebegun.managed') == MARKER, 'Production MCP container name is already owned by another service.')
    else:
        with socket.socket() as sock:
            try: sock.bind(('127.0.0.1', 5011))
            except OSError: raise m.MigrationError('Port 5011 is already in use.')
    if SNIPPET.exists():
        require(SNIPPET.read_text().startswith('# Managed by ' + MARKER + '\n'), 'Existing route snippet is not managed by this installer.')
    require(not SNIPPET.parent.is_symlink(), 'Refusing a symlink for the production route directory.')
    require(not any(path != SNIPPET for path in SNIPPET.parent.glob('*.conf')), 'Unexpected additional production MCP routing snippets.')
    return {'purpose': MARKER, 'commit': commit, 'image': 'codebegun-mcp-production:' + commit[:12],
            'site': str(site), 'activeApp': app_name, 'activeAppId': app['Id'], 'mongoId': db['Id'],
            'issuer': ISSUER, 'resource': ISSUER + '/mcp', 'port': '127.0.0.1:5011',
            'database': 'lms-saas', 'replicaSet': 'lms-rs0'}


def admin_credentials():
    db = inspect('lms-mongodb')
    env = dict(x.split('=', 1) for x in db['Config']['Env'] if '=' in x)
    username, password = env.get('MONGO_INITDB_ROOT_USERNAME'), env.get('MONGO_INITDB_ROOT_PASSWORD')
    require(username and password, 'Expected migration-verified MongoDB credentials are missing.')
    return {'username': username, 'password': password}


def operator(s, command, request=None):
    args = ['run', '--rm', '--network', NETWORK, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
            '--memory', '512m', '--cpus', '1', '--pids-limit', '128', '--mount',
            'type=bind,source=' + str(STATE / 'runtime.json') + ',target=/run/mcp/runtime.json,readonly']
    temporary = []
    try:
        for name, value in [('admin', admin_credentials() if command != 'verify' else None), ('request', request)]:
            if value is not None:
                path = STATE / (name + '.json')
                write(path, value, 0o444)  # The parent directory is root-only 0700.
                temporary.append(path)
                args += ['--mount', 'type=bind,source=' + str(path) + ',target=/run/mcp/' + name + '.json,readonly']
        result = docker(*args, s['imageId'], 'node', 'ops/mcp-production/operator.cjs', command, timeout=240)
        lines = [x[len('PRODUCTION_JSON='):] for x in result.stdout.splitlines() if x.startswith('PRODUCTION_JSON=')]
        require(len(lines) == 1, 'Operator returned no valid result. No secret output was printed.')
        return json.loads(lines[0])
    finally:
        for path in temporary:
            path.unlink(missing_ok=True)


def prepare(args):
    current = preflight()
    requested = ['mcp_connect'] + (SCOPES if args.all_read_domains else ['mcp_students_read', 'mcp_batches_read'])
    if (STATE / 'state.json').exists():
        s = state()
        require(s['scopes'] == requested, 'Existing installation has another scope configuration; review a scope change separately.')
        if s['commit'] != current['commit']:
            require(args.upgrade_prepared, 'A different commit was prepared. For a reviewed update before first enablement, use prepare --upgrade-prepared.')
            upgrade_prepared(s, current)
    else:
        require(not STATE.exists(), 'Unrecognized existing deployment directory.')
        STATE.mkdir(mode=0o700)
        s = {**current, 'phase': 'preparing', 'scopes': requested, 'installation': str(uuid.uuid4())}
        config = {'purpose': MARKER, 'installation': s['installation'], 'database': 'lms-saas', 'hostname': 'mongodb',
                  'replica': 'lms-rs0', 'username': 'codebegun_mcp_runtime', 'role': 'codebegun_mcp_runtime',
                  'password': secrets.token_hex(48), 'issuer': ISSUER, 'clients': [{
                      'id': 'codebegun-production-chatgpt', 'name': 'CodeBegun Production', 'applicationType': 'web',
                      'redirectUris': ['https://chatgpt.com/connector_platform_oauth_redirect'],
                      'tokenEndpointAuthMethod': 'none', 'scopes': requested + ['offline_access']}]}
        write(STATE / 'runtime.json', config, 0o444)
        save(s)
    if 'imageId' not in s:
        s['imageId'] = build_image(s)
        save(s)
    print('Preparing MCP collections and its dedicated runtime account. Existing LMS records stay unchanged.', flush=True)
    operator(s, 'prepare')
    print(json.dumps(operator(s, 'verify'), indent=2))
    s['phase'] = 'prepared' if s['phase'] == 'preparing' else s['phase']
    save(s)
    print('PASS: production MCP image, indexes and limited runtime privileges prepared. No service or account access enabled.')


def build_image(s):
    print('Building the reviewed commit with the committed workspace lockfile.', flush=True)
    # Only committed files enter the build: no local credentials or test secrets.
    archive = subprocess.Popen(['git', '-C', str(ROOT), 'archive', '--format=tar', s['commit']], stdout=subprocess.PIPE)
    try:
        built = subprocess.run(['docker', 'build', '-f', 'ops/mcp-production/Dockerfile', '-t', s['image'], '-'], stdin=archive.stdout)
        archive.stdout.close()
        require(archive.wait() == 0 and built.returncode == 0, 'Production MCP image build failed.')
    finally:
        if archive.poll() is None: archive.terminate()
    return json.loads(docker('image', 'inspect', s['image']).stdout)[0]['Id']


def start_gateway(s, operation=None):
    labels = ['--label', 'codebegun.upgrade=' + operation] if operation else []
    docker('run', '-d', '--name', CONTAINER, '--label', 'codebegun.managed=' + MARKER, *labels,
           '--restart', 'unless-stopped', '--network', NETWORK, '--read-only', '--cap-drop', 'ALL',
           '--security-opt', 'no-new-privileges:true', '--memory', '1g', '--cpus', '1', '--pids-limit', '128',
           '-e', 'NODE_OPTIONS=--max-old-space-size=768', '-p', '127.0.0.1:5011:5000',
           '--mount', 'type=bind,source=' + str(STATE / 'runtime.json') + ',target=/run/mcp/runtime.json,readonly',
           s['imageId'])


def upgrade_container(s):
    c = inspect(CONTAINER)
    require(c and c['State']['Running'] and c['Image'] == s['imageId']
            and c['Config'].get('Labels', {}).get('codebegun.managed') == MARKER, 'Recorded managed gateway is not running.')
    require(c['Config']['User'] == 'node' and c['HostConfig']['ReadonlyRootfs']
            and NETWORK in c['NetworkSettings']['Networks'], 'Gateway security or network configuration changed.')
    require(c['HostConfig']['PortBindings'] == {'5000/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '5011'}]},
            'Gateway must use only the reviewed localhost port.')
    mounts = c['Mounts']
    require(len(mounts) == 1 and mounts[0]['Destination'] == '/run/mcp/runtime.json'
            and mounts[0]['Source'] == str(STATE / 'runtime.json') and mounts[0]['Type'] == 'bind' and not mounts[0]['RW'],
            'Gateway runtime mount changed.')
    require(c['HostConfig']['RestartPolicy']['Name'] == 'unless-stopped', 'Gateway restart policy changed.')
    return c


def verify_discovery(s):
    expected = set(s['scopes'])
    for path in ['/.well-known/oauth-protected-resource', '/.well-known/oauth-protected-resource/mcp']:
        status, body = fetch(ISSUER + path)
        require(status == 200 and set(body.get('scopes_supported', [])) == expected,
                'Production resource metadata does not advertise the installed read scopes.')
    request = urllib.request.Request(ISSUER + '/mcp', method='POST',
                                    data=b'{"jsonrpc":"2.0","id":1,"method":"tools/list"}',
                                    headers={'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=15):
            raise m.MigrationError('Anonymous production MCP was not rejected.')
    except urllib.error.HTTPError as error:
        scope = re.search(r'(?:^|,\s*)scope="([^"]+)"', error.headers.get('WWW-Authenticate', ''))
        require(error.code == 401 and scope and set(scope[1].split()) == expected,
                'Production login challenge does not request the installed read scopes.')


def restore_upgrade(journal=None):
    pending = STATE / 'upgrade-pending.json'
    record = pending if pending.exists() else STATE / 'upgrade-previous.json'
    if journal is None:
        require(record.exists(), 'No saved gateway upgrade to recover.')
        journal = json.loads(record.read_text())
    require(journal.get('purpose') == MARKER, 'Unrecognized upgrade recovery record.')
    current = inspect(CONTAINER)
    replacement = current and current['Id'] != journal['oldContainerId']
    if replacement:
        require(current['Image'] == journal['newState']['imageId']
                and current['Config'].get('Labels', {}).get('codebegun.managed') == MARKER
                and current['Config'].get('Labels', {}).get('codebegun.upgrade') == journal['operation'],
                'Another container owns the gateway name; it was not modified.')
        # Stop our failed replacement even if configuration drift or a missing
        # backup prevents restoration. Retain its journal for manual recovery.
        try:
            docker('update', '--restart=no', current['Id'])
        finally:
            docker('stop', current['Id'])
    runtime = STATE / 'runtime.json'
    require(runtime.exists() and digest(runtime.read_text()) == journal['runtimeDigest'],
            'Upgrade runtime configuration changed; any identified replacement is stopped. Preserve the recovery record and restore the reviewed configuration before retrying upgrade-rollback.')
    old = inspect(journal['oldContainerId'])
    require(old and old['Image'] == journal['oldState']['imageId']
            and old['Config'].get('Labels', {}).get('codebegun.managed') == MARKER,
            'Recorded rollback gateway is missing or changed; any identified replacement is stopped. Preserve the recovery record for review.')
    if replacement:
        docker('rm', current['Id'])
    if old['Name'] != '/' + CONTAINER:
        docker('rename', old['Id'], CONTAINER)
    docker('update', '--restart=unless-stopped', old['Id'])
    docker('start', old['Id'])
    # Recovery deliberately does not depend on live LMS health or new discovery.
    restored = inspect(old['Id'])
    require(restored and restored['State']['Running'], 'Previous gateway did not restart; retain the pending recovery record.')
    save(journal['oldState'])
    write(STATE / ('upgrade-recovered-' + journal['operation'] + '.json'), journal)
    pending.unlink(missing_ok=True)
    (STATE / 'upgrade-previous.json').unlink(missing_ok=True)
    print('PASS: previous production MCP gateway restored; runtime credentials and account access retained.')


def upgrade():
    if (STATE / 'upgrade-pending.json').exists():
        restore_upgrade()
    s, current = state(), preflight()
    require(s['phase'] == 'enabled' and current['mongoId'] == s['mongoId'] and current['site'] == s['site'],
            'An enabled gateway on the recorded database/site is required for upgrade.')
    require(SNIPPET.read_text() == routes(True), 'Enabled MCP routing changed; it was not modified.')
    runtime_text = (STATE / 'runtime.json').read_text()
    runtime_digest = digest(runtime_text)
    config = json.loads(runtime_text)
    require(config['purpose'] == MARKER and config['installation'] == s['installation']
            and config['issuer'] == ISSUER and config['database'] == 'lms-saas'
            and config['hostname'] == 'mongodb' and config['replica'] == 'lms-rs0'
            and len(config['clients']) == 1 and config['clients'][0]['scopes'] == s['scopes'] + ['offline_access'],
            'Runtime identity or installed scope configuration changed.')
    old = upgrade_container(s)
    active = current_lms(s)
    if current['commit'] == s['commit']:
        verify(s)
        verify_discovery(s)
        print('PASS: this production MCP commit is already running.')
        return
    candidate = {**s, **current, 'phase': 'enabled'}
    candidate['imageId'] = build_image(candidate)
    # verify mounts only runtime.json, authenticates as the limited runtime user,
    # and uses nonmatching permission probes and a read-only transaction.
    print(json.dumps(operator(candidate, 'verify'), indent=2))
    require(current_lms(s) == active and upgrade_container(s)['Id'] == old['Id'],
            'Live deployment changed during the build; retry the upgrade.')
    require(digest((STATE / 'runtime.json').read_text()) == runtime_digest, 'Runtime configuration changed during the build; retry after review.')
    operation = str(uuid.uuid4())
    backup = CONTAINER + '-rollback-' + old['Id'][:12]
    require(not inspect(backup), 'A rollback container with this name already exists.')
    journal = {'purpose': MARKER, 'operation': operation, 'oldState': s, 'newState': candidate,
               'oldContainerId': old['Id'], 'backupName': backup, 'runtimeDigest': runtime_digest}
    write(STATE / 'upgrade-pending.json', journal)
    print('Switching only the production MCP gateway; the previous container is retained for rollback.', flush=True)
    try:
        # A retained old container must not compete for port 5011 after reboot.
        docker('update', '--restart=no', old['Id'])
        docker('stop', old['Id'])
        docker('rename', old['Id'], backup)
        start_gateway(candidate, operation)
        local_ready()
        verify(candidate)
        verify_discovery(candidate)
        require(digest((STATE / 'runtime.json').read_text()) == journal['runtimeDigest'], 'Runtime configuration changed during upgrade.')
        save(candidate)
        write(STATE / 'upgrade-previous.json', journal)
        (STATE / 'upgrade-pending.json').unlink()
    except BaseException:
        restore_upgrade(journal)
        raise
    print('PASS: production MCP upgraded and public read-scope discovery verified. Reauthorize the ChatGPT connection for the advertised read permissions.')


def upgrade_prepared(s, current):
    """Only replace a preparation which has never installed a service or grant."""
    require(s['phase'] in ['preparing', 'prepared'], 'An enabled/disabled installation needs a separately reviewed service upgrade.')
    require(not inspect(CONTAINER) and not SNIPPET.exists(), 'Pre-enable upgrade requires no gateway container or route snippet.')
    require(not any(STATE.glob('access-*.json')), 'A saved access operation needs review before upgrading.')
    unchanged_lms(s)
    config = json.loads((STATE / 'runtime.json').read_text())
    require(config['installation'] == s['installation'] and config['purpose'] == MARKER,
            'Runtime installation does not match its preparation state.')
    require(config['clients'][0]['scopes'] == s['scopes'] + ['offline_access'], 'Runtime scopes changed.')
    write(STATE / ('prepared-' + s['commit'] + '.json'), s)
    s.setdefault('preparationHistory', []).append({'commit': s['commit'], 'imageId': s.get('imageId')})
    s.update(commit=current['commit'], image=current['image'], phase='preparing')
    s.pop('imageId', None)
    save(s)
    print('Updating the never-enabled preparation; existing runtime credentials and scope configuration are retained.', flush=True)


def active_lms():
    """Resolve the live slot, never a container recorded before a normal rollout."""
    upstream = ACTIVE_SLOT.read_text().strip()
    slots = {'server 127.0.0.1:5001;': ('lms-server-blue', '5001'),
             'server 127.0.0.1:5002;': ('lms-server-green', '5002')}
    require(upstream in slots, 'Unrecognized live LMS upstream; no account permissions were changed.')
    name, port = slots[upstream]
    app = inspect(name)
    require(app and app['State']['Running'] and not app['State'].get('Paused'),
            'The LMS container selected by Nginx is not running: ' + name + '.')
    require(NETWORK in app['NetworkSettings']['Networks'], 'The live LMS is not on the production database network.')
    require(app['HostConfig']['PortBindings'].get('5000/tcp') == [{'HostIp': '127.0.0.1', 'HostPort': port}],
            'The live LMS port does not match the Nginx active slot.')
    return {'name': name, 'id': app['Id'], 'imageId': app['Image']}


def current_lms(s):
    db = inspect('lms-mongodb')
    require(db and db['State']['Running'] and db['Id'] == s['mongoId'],
            'The MongoDB container changed or stopped; review the current deployment.')
    active = active_lms()
    healthy()
    require(active_lms() == active, 'The live LMS changed during verification; retry after deployment finishes.')
    return active


def unchanged_lms(s):
    # Service installation still requires the originally reviewed LMS. Account
    # operations and routine verification follow a later normal blue/green rollout.
    active = current_lms(s)
    require(active['name'] == s['activeApp'] and active['id'] == s['activeAppId'],
            'The active LMS container changed; review the current deployment.')


def local_ready():
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            if fetch('http://127.0.0.1:5011/healthz')[1].get('ready') is True: return
        except (OSError, ValueError): pass
        time.sleep(1)
    raise m.MigrationError('Production MCP did not become ready.')


def verify(s):
    active = current_lms(s)
    current = inspect(CONTAINER)
    require(current and current['State']['Running'] and current['Image'] == s['imageId'], 'The intended MCP image is not running.')
    require(current['HostConfig']['PortBindings'].get('5000/tcp') == [{'HostIp': '127.0.0.1', 'HostPort': '5011'}], 'Unexpected MCP port binding.')
    require(current['Config']['User'] == 'node' and current['HostConfig']['ReadonlyRootfs'], 'MCP container security settings changed.')
    require([x['Destination'] for x in current['Mounts']] == ['/run/mcp/runtime.json'], 'Unexpected credentials/files mounted in MCP.')
    for path, key, value in [('/.well-known/oauth-authorization-server', 'issuer', ISSUER),
                              ('/.well-known/oauth-protected-resource', 'resource', ISSUER + '/mcp'),
                              ('/.well-known/oauth-protected-resource/mcp', 'resource', ISSUER + '/mcp')]:
        status, body = fetch(ISSUER + path)
        require(status == 200 and body.get(key) == value, 'Production HTTPS discovery failed.')
    status, _ = fetch(ISSUER + '/mcp', {'Content-Type': 'application/json'}, 'POST',
                      b'{"jsonrpc":"2.0","id":1,"method":"tools/list"}')
    require(status == 401, 'Anonymous production MCP was not rejected.')
    print(json.dumps(operator(s, 'verify'), indent=2))
    require(active_lms() == active, 'The live LMS changed during verification; retry after deployment finishes.')
    print('PASS: production HTTPS discovery, anonymous denial, exact image, limited DB account, and healthy live LMS (' + active['name'] + ').')


def enable():
    current, s = preflight(), state()
    require(current['commit'] == s['commit'] and s['phase'] in ['prepared', 'disabled', 'enabled', 'enabling'], 'Prepare the exact deployment commit first.')
    unchanged_lms(s)
    target = Path(s['site'])
    require(str(locate_site()) == s['site'], 'The active Nginx site changed.')
    original, candidate = site_candidate(target)
    previous = SNIPPET.read_text() if SNIPPET.exists() else None
    require(not SNIPPET.is_symlink(), 'Refusing a symlink for the route snippet.')
    SNIPPET.parent.mkdir(parents=True, exist_ok=True)
    existing = inspect(CONTAINER)
    if not existing:
        start_gateway(s)
    else:
        require(existing['Image'] == s['imageId'], 'Existing MCP container uses a different image.')
        docker('start', CONTAINER)
    original_mode = target.stat().st_mode & 0o777
    write(STATE / 'nginx-before.conf', original)
    s['phase'] = 'enabling'
    save(s)
    try:
        local_ready()
        write(SNIPPET, routes(True), 0o644)
        write(target, candidate, original_mode)
        run(['nginx', '-t'])
        run(['nginx', '-s', 'reload'])
        # Reload is asynchronous. Verification allows old workers to finish.
        for attempt in range(10):
            try:
                verify(s)
                break
            except (m.MigrationError, OSError, ValueError):
                if attempt == 9: raise
                time.sleep(1)
        s['phase'] = 'enabled'
        s['siteDigest'] = digest(candidate)
        save(s)
    except BaseException:
        try:
            write(target, original, original_mode)
            if previous is None: SNIPPET.unlink(missing_ok=True)
            else: write(SNIPPET, previous, 0o644)
            run(['nginx', '-t'])
            run(['nginx', '-s', 'reload'])
        finally:
            # An unrelated Nginx error must not leave a new gateway running.
            if not existing or not existing['State']['Running']: docker('stop', CONTAINER)
            s['phase'] = 'prepared' if previous is None else 'disabled' if 'return 404;' in previous else 'enabled'
            save(s)
        raise
    print('Production MCP endpoint: ' + ISSUER + '/mcp')
    print('Client ID: codebegun-production-chatgpt; OAuth client secret: leave blank.')
    print('No LMS account was granted access. Run access-plan, review it, then access-apply.')


def disable():
    s = state()
    failures = []
    try:
        if SNIPPET.exists():
            require(SNIPPET.read_text().startswith('# Managed by ' + MARKER + '\n'), 'Managed routing is missing.')
            # Keep the deny configuration on disk even if reload fails. Old
            # workers are cut off by the independent container stop below.
            write(SNIPPET, routes(False), 0o644)
            run(['nginx', '-t'])
            run(['nginx', '-s', 'reload'])
    except (m.MigrationError, OSError, subprocess.SubprocessError):
        failures.append('Nginx routing needs repair')
    current = inspect(CONTAINER)
    if current:
        require(current['Config'].get('Labels', {}).get('codebegun.managed') == MARKER, 'Unowned MCP container.')
        docker('stop', CONTAINER)
    s['phase'] = 'disabled'
    save(s)
    require(not failures, 'MCP gateway stopped, but Nginx routing could not be reloaded. Keep MCP disabled and repair Nginx before enabling it again.')
    print('PASS: production MCP disabled; no LMS service was stopped and audit history is retained.')


def live_permissions(s, active=None):
    active = active or current_lms(s)
    require(active_lms() == active, 'The live LMS changed; run a fresh access-plan after deployment finishes.')
    # Use the immutable container ID so a replacement cannot change the source
    # between inspection and exec. Only the live LMS supplies native permissions.
    result = docker('exec', active['id'], 'node', '-e',
                   'console.log("LMS_PERMISSIONS=" + JSON.stringify(require("/app/dist/middleware/roleGuard").ROLE_PERMISSIONS))', check=False)
    require(result.returncode == 0, 'Could not read the permission map from the live LMS container. No account permissions were changed.')
    lines = [line[len('LMS_PERMISSIONS='):] for line in result.stdout.splitlines() if line.startswith('LMS_PERMISSIONS=')]
    require(len(lines) == 1, 'The live LMS returned no unique permission map. No account permissions were changed.')
    try:
        value = json.loads(lines[0])
    except ValueError:
        raise m.MigrationError('The live LMS returned an invalid permission map. No account permissions were changed.')
    require(isinstance(value, dict) and isinstance(value.get('SUPER_ADMIN'), list)
            and value['SUPER_ADMIN'] and all(isinstance(x, str) for x in value['SUPER_ADMIN']),
            'The live LMS Super Admin permission map is missing or invalid.')
    require(active_lms() == active, 'The live LMS changed while reading permissions; run a fresh access-plan.')
    return value


def account_status(s, email):
    require(bool(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email)) and len(email) <= 254,
            'Enter a valid existing LMS login email.')
    current = inspect(CONTAINER)
    require(current and current['State']['Running'] and current['Image'] == s['imageId']
            and current['Config'].get('Labels', {}).get('codebegun.managed') == MARKER,
            'The recorded production gateway must be running for read-only account diagnosis.')
    result = subprocess.run(['docker', 'exec', '-i', '--workdir', '/app', CONTAINER, 'node', '-', email],
                            input=(ROOT / 'ops/mcp-production/account-status.cjs').read_text(),
                            text=True, capture_output=True, timeout=45)
    lines = [line[len('ACCOUNT_STATUS='):] for line in result.stdout.splitlines() if line.startswith('ACCOUNT_STATUS=')]
    require(len(lines) == 1, 'The account diagnostic could not run. Raw subprocess output was suppressed.')
    status = json.loads(lines[0])
    stages = ['configuration', 'database_connection', 'account_lookup', 'tenant_lookup']
    failed_at = status.get('diagnosticFailedAt')
    if failed_at in stages:
        raise m.MigrationError('Read-only account diagnostic failed at ' + failed_at + '. No permissions were changed.')
    require(result.returncode == 0 and isinstance(status.get('reasons'), list), 'The account diagnostic returned an invalid result.')
    return status


def diagnose_account(args):
    s = state()
    email = (args.email or input('Enter your existing production LMS login email: ')).strip().lower()
    status = account_status(s, email)
    try:
        active = current_lms(s)
        live_permissions(s, active)
        status['liveLmsContainer'] = active['name']
        status['liveLmsPermissionMap'] = 'available'
    except m.MigrationError as error:
        status['liveLmsPermissionMap'] = 'unavailable'
        status['liveLmsPermissionMapReason'] = str(error)
    print(json.dumps(status, indent=2))
    print('Read-only diagnosis complete. No account, role, token or deployment configuration was changed.')


def diagnose_tools(args):
    s = state()
    email = (args.email or input('Enter your existing production LMS login email: ')).strip().lower()
    require(bool(re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email)) and len(email) <= 254, 'Enter a valid existing LMS login email.')
    current = upgrade_container(s)
    result = subprocess.run(['docker', 'exec', '-i', '--workdir', '/app', current['Id'], 'node', '-', email],
                            input=(ROOT / 'ops/mcp-production/tools-status.cjs').read_text(),
                            text=True, capture_output=True, timeout=60)
    lines = [x[len('TOOL_STATUS='):] for x in result.stdout.splitlines() if x.startswith('TOOL_STATUS=')]
    require(len(lines) == 1, 'Tool diagnosis could not run; raw output was suppressed.')
    status = json.loads(lines[0])
    stage = status.get('diagnosticFailedAt')
    if stage in ['configuration', 'database_connection', 'account_access', 'connection_scopes', 'student_count']:
        raise m.MigrationError('Read-only tool diagnosis failed at ' + stage + '. No access was changed.')
    require(result.returncode == 0 and status.get('issuer') == ISSUER and status.get('database') == 'lms-saas'
            and isinstance(status.get('availableTools'), list), 'Tool diagnosis returned an invalid result.')
    print(json.dumps(status, indent=2))
    print('Read-only production diagnosis complete. Counts come from the live runtime database; ChatGPT must still complete OAuth and invoke its own production tool.')


def access_command(args):
    s = state()
    # Revocation must work during an LMS outage or after a normal app/container
    # replacement. The operator still authenticates to the configured replica
    # set and validates the exact user/tenant/role before restoring it.
    active = current_lms(s) if args.command != 'access-revoke' else None
    path = STATE / 'access-plan.json'
    if args.command == 'access-plan':
        email = (args.email or input('Enter your existing production LMS login email: ')).strip().lower()
        require(not (STATE / 'access-applied.json').exists(), 'An account has already been enabled. Review/revoke it before another individual grant.')
        status = account_status(s, email)
        if not status.get('initialOptInEligible'):
            print(json.dumps(status, indent=2))
            raise m.MigrationError('This account does not meet the reviewed initial opt-in requirements shown above. No account permissions were changed.')
        request = {'email': email, 'scopes': s['scopes'], 'basePermissions': live_permissions(s, active),
                   'lmsSource': active,
                   'newRoleId': secrets.token_hex(12), 'operationId': str(uuid.uuid4())}
        plan = operator(s, 'access-plan', request)
        require(active_lms() == active, 'The live LMS changed during the preview; run a fresh access-plan.')
        write(path, {**request, **plan})
        print(json.dumps({**{key: plan[key] for key in ['email', 'tenantName', 'userId', 'baseRole', 'scopes']},
                          'liveLmsContainer': active['name']}, indent=2))
        print('This default Super Admin will receive an individual MCP role with its existing native permission keys. Other account types are refused by this initial-production operator.')
        print('Read-only access plan saved. To grant the displayed access: python3 scripts/mcp-production.py access-apply')
    elif args.command == 'access-apply':
        require(path.exists() and not (STATE / 'access-applied.json').exists(), 'A fresh access-plan is required.')
        request = json.loads(path.read_text())
        require(request.get('lmsSource') == active,
                'The access plan belongs to an earlier LMS deployment or installer. Run a fresh access-plan before granting access.')
        permissions = live_permissions(s, active)
        require(sorted(permissions['SUPER_ADMIN']) == sorted(request['basePermissions']['SUPER_ADMIN']),
                'The live LMS permission map changed since the preview. Run a fresh access-plan before granting access.')
        result = operator(s, 'access-apply', request)
        write(STATE / 'access-applied.json', result)
        print('PASS: explicit MCP access granted to the reviewed account; its existing native permissions are retained.')
    else:
        applied = STATE / 'access-applied.json'
        # A grant may commit before an interrupted terminal saves its result.
        # The original plan contains the same role/account snapshot. The operator
        # only revokes if that exact, unshared role is currently assigned; a plan
        # which never committed fails those checks without any database writes.
        record = applied if applied.exists() else path
        require(record.exists(), 'No saved individual grant or interrupted access plan to revoke.')
        print(json.dumps(operator(s, 'access-revoke', json.loads(record.read_text()))))
        record.rename(STATE / ('access-revoked-' + str(int(time.time())) + '.json'))
        path.unlink(missing_ok=True)
        print('PASS: original role restored and this account\'s OAuth grants revoked.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['plan', 'prepare', 'enable', 'verify', 'disable', 'upgrade', 'upgrade-rollback', 'diagnose-account', 'diagnose-tools', 'access-plan', 'access-apply', 'access-revoke'])
    parser.add_argument('--email', help='Existing LMS login email for diagnose-account, diagnose-tools or access-plan; never a password.')
    parser.add_argument('--all-read-domains', action='store_true', help='prepare: allow all eight MCP read domains, including finance and CRM, instead of students/batches.')
    parser.add_argument('--upgrade-prepared', action='store_true', help='prepare: update a reviewed commit only before any gateway service, routes or account access have been installed; retain credentials/scopes.')
    args = parser.parse_args()
    require(os.geteuid() == 0, 'Run as root on the VPS.')
    fd = os.open('/run/lock/codebegun-mcp-production.lock', os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        try: fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: raise m.MigrationError('Another production MCP operation is running; wait for it to finish.')
        dispatch(args)
    finally:
        os.close(fd)


def dispatch(args):
    if args.command == 'plan':
        print(json.dumps(preflight(), indent=2))
        print('Read-only plan passed. Existing LMS, MongoDB, legacy MCP and test services are retained.')
    elif args.command == 'prepare': prepare(args)
    elif args.command == 'enable': enable()
    elif args.command == 'verify': verify(state())
    elif args.command == 'disable': disable()
    elif args.command == 'upgrade': upgrade()
    elif args.command == 'upgrade-rollback': restore_upgrade()
    elif args.command == 'diagnose-account': diagnose_account(args)
    elif args.command == 'diagnose-tools': diagnose_tools(args)
    else: access_command(args)


if __name__ == '__main__':
    try: main()
    except m.MigrationError as error:
        print('STOP: ' + str(error), file=sys.stderr)
        sys.exit(1)
    except (OSError, ValueError, KeyError, subprocess.SubprocessError):
        # Deliberately suppress subprocess/URI details that may contain secrets.
        print('STOP: production MCP checks failed; the operation did not complete. Preserve /root/lms-mcp-production/app for review.', file=sys.stderr)
        sys.exit(1)
