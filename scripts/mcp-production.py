#!/usr/bin/env python3
"""Deploy the MCP router alongside the unchanged LMS, with a dedicated DB user.

See docs/runbooks/mcp-production.md. No synthetic preparer, application restart,
Mongo recreation, credential rotation, repository reset, or implicit role grant.
"""
import argparse
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
    active = Path('/etc/nginx/active-slot.conf').read_text().strip()
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
        print('Building the reviewed commit with the committed workspace lockfile.', flush=True)
        # Archive tracked committed files only: no .env, local credentials, test secrets or dirty files.
        archive = subprocess.Popen(['git', '-C', str(ROOT), 'archive', '--format=tar', s['commit']], stdout=subprocess.PIPE)
        try:
            built = subprocess.run(['docker', 'build', '-f', 'ops/mcp-production/Dockerfile', '-t', s['image'], '-'], stdin=archive.stdout)
            archive.stdout.close()
            require(archive.wait() == 0 and built.returncode == 0, 'Production MCP image build failed.')
        finally:
            if archive.poll() is None: archive.terminate()
        s['imageId'] = json.loads(docker('image', 'inspect', s['image']).stdout)[0]['Id']
        save(s)
    print('Preparing MCP collections and its dedicated runtime account. Existing LMS records stay unchanged.', flush=True)
    operator(s, 'prepare')
    print(json.dumps(operator(s, 'verify'), indent=2))
    s['phase'] = 'prepared' if s['phase'] == 'preparing' else s['phase']
    save(s)
    print('PASS: production MCP image, indexes and limited runtime privileges prepared. No service or account access enabled.')


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


def unchanged_lms(s):
    require(inspect(s['activeApp'])['Id'] == s['activeAppId'], 'The active LMS container changed; review the current deployment.')
    require(inspect('lms-mongodb')['Id'] == s['mongoId'], 'The MongoDB container changed; review the current deployment.')
    healthy()


def local_ready():
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            if fetch('http://127.0.0.1:5011/healthz')[1].get('ready') is True: return
        except (OSError, ValueError): pass
        time.sleep(1)
    raise m.MigrationError('Production MCP did not become ready.')


def verify(s):
    unchanged_lms(s)
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
    print('PASS: production HTTPS discovery, anonymous denial, exact image, limited DB account, and unchanged live LMS.')


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
        docker('run', '-d', '--name', CONTAINER, '--label', 'codebegun.managed=' + MARKER,
               '--restart', 'unless-stopped', '--network', NETWORK, '--read-only', '--cap-drop', 'ALL',
               '--security-opt', 'no-new-privileges:true', '--memory', '1g', '--cpus', '1', '--pids-limit', '128',
               '-e', 'NODE_OPTIONS=--max-old-space-size=768', '-p', '127.0.0.1:5011:5000',
               '--mount', 'type=bind,source=' + str(STATE / 'runtime.json') + ',target=/run/mcp/runtime.json,readonly',
               s['imageId'])
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


def access_command(args):
    s = state()
    # Revocation must work during an LMS outage or after a normal app/container
    # replacement. The operator still authenticates to the configured replica
    # set and validates the exact user/tenant/role before restoring it.
    if args.command != 'access-revoke': unchanged_lms(s)
    path = STATE / 'access-plan.json'
    if args.command == 'access-plan':
        email = (args.email or input('Enter your existing production LMS login email: ')).strip().lower()
        require(not (STATE / 'access-applied.json').exists(), 'An account has already been enabled. Review/revoke it before another individual grant.')
        base = docker('exec', s['activeApp'], 'node', '-e',
                      'console.log(JSON.stringify(require("/app/dist/middleware/roleGuard").ROLE_PERMISSIONS))').stdout
        request = {'email': email, 'scopes': s['scopes'], 'basePermissions': json.loads(base),
                   'newRoleId': secrets.token_hex(12), 'operationId': str(uuid.uuid4())}
        plan = operator(s, 'access-plan', request)
        write(path, {**request, **plan})
        print(json.dumps({key: plan[key] for key in ['email', 'tenantName', 'userId', 'baseRole', 'scopes']}, indent=2))
        print('This default Super Admin will receive an individual MCP role with its existing native permission keys. Other account types are refused by this initial-production operator.')
        print('Read-only access plan saved. To grant the displayed access: python3 scripts/mcp-production.py access-apply')
    elif args.command == 'access-apply':
        require(path.exists() and not (STATE / 'access-applied.json').exists(), 'A fresh access-plan is required.')
        request = json.loads(path.read_text())
        result = operator(s, 'access-apply', request)
        write(STATE / 'access-applied.json', result)
        print('PASS: explicit MCP access granted to the reviewed account; its existing native permissions are retained.')
    else:
        applied = STATE / 'access-applied.json'
        require(applied.exists(), 'No saved individual grant to revoke.')
        print(json.dumps(operator(s, 'access-revoke', json.loads(applied.read_text()))))
        applied.rename(STATE / ('access-revoked-' + str(int(time.time())) + '.json'))
        path.unlink(missing_ok=True)
        print('PASS: original role restored and this account\'s OAuth grants revoked.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['plan', 'prepare', 'enable', 'verify', 'disable', 'access-plan', 'access-apply', 'access-revoke'])
    parser.add_argument('--email', help='Existing LMS login email, used only by access-plan; never a password.')
    parser.add_argument('--all-read-domains', action='store_true', help='prepare: allow all eight MCP read domains, including finance and CRM, instead of students/batches.')
    parser.add_argument('--upgrade-prepared', action='store_true', help='prepare: update a reviewed commit only before any gateway service, routes or account access have been installed; retain credentials/scopes.')
    args = parser.parse_args()
    require(os.geteuid() == 0, 'Run as root on the VPS.')
    if args.command == 'plan':
        print(json.dumps(preflight(), indent=2))
        print('Read-only plan passed. Existing LMS, MongoDB, legacy MCP and test services are retained.')
    elif args.command == 'prepare': prepare(args)
    elif args.command == 'enable': enable()
    elif args.command == 'verify': verify(state())
    elif args.command == 'disable': disable()
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
