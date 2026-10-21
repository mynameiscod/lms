"""Reviewed scope expansion for an already-enabled, individually opted-in gateway.

Uses the existing image and runtime credential. Never rebuilds the LMS/image,
adds native permissions, edits grants to widen consent, or changes MongoDB roles.
"""
import copy
import json
import time
import uuid


DOMAINS = dict(students='mcp_students_read', batches='mcp_batches_read',
               attendance='mcp_attendance_read', exams='mcp_assessments_read',
               fees='mcp_finance_read', placements='mcp_placements_read',
               leads='mcp_leads_read', calls='mcp_calls_read', recordings='mcp_recordings_read')


class ScopeChange:
    def __init__(self, host):
        self.h = host

    def path(self, name):
        return self.h.STATE / name

    def read(self, name):
        return self.path(name).read_text()

    def source_digest(self):
        return self.h.digest(''.join((self.h.ROOT / path).read_text() for path in [
            'scripts/mcp-production.py', 'scripts/mcp-production-mongo.py', 'scripts/mcp_production_scopes.py',
            'ops/mcp-production/scopes.cjs']))

    def reviewed_source(self):
        h = self.h
        files = ['scripts/mcp-production.py', 'scripts/mcp-production-mongo.py',
                 'scripts/mcp_production_scopes.py', 'ops/mcp-production/scopes.cjs']
        h.require(h.run(['git', '-C', h.ROOT, 'ls-files', '--error-unmatch', *files], check=False).returncode == 0 and
                  h.run(['git', '-C', h.ROOT, 'diff', '--quiet', 'HEAD', '--'], check=False).returncode == 0,
                  'Use the committed, reviewed operator source without tracked local edits.')
        return h.run(['git', '-C', h.ROOT, 'rev-parse', 'HEAD']).stdout.strip()

    def operator(self, state, action, request):
        h = self.h
        args = ['run', '--rm', '--network', h.NETWORK, '--read-only', '--cap-drop', 'ALL',
                '--security-opt', 'no-new-privileges:true', '--memory', '512m', '--cpus', '1', '--pids-limit', '128']
        mounts = [('runtime.json', '/run/mcp/runtime.json'), ('scope-request.json', '/run/mcp/scope-request.json')]
        temporary = [self.path('scope-request.json')]
        try:
            h.write(temporary[0], request, 0o444)
            if action != 'plan':
                temporary.append(self.path('scope-admin.json'))
                h.write(temporary[-1], h.admin_credentials(), 0o444)
                mounts.append(('scope-admin.json', '/run/mcp/scope-admin.json'))
            for name, destination in mounts:
                args += ['--mount', 'type=bind,source=' + str(self.path(name)) + ',target=' + destination + ',readonly']
            args += ['--mount', 'type=bind,source=' + str(h.ROOT / 'ops/mcp-production/scopes.cjs') +
                     ',target=/app/ops/mcp-production/scopes.cjs,readonly']
            result = h.docker(*args, state['imageId'], 'node', 'ops/mcp-production/scopes.cjs', action,
                              timeout=120, check=False)
            rows = [line[len('SCOPE_JSON='):] for line in result.stdout.splitlines() if line.startswith('SCOPE_JSON=')]
            h.require(len(rows) == 1, 'Scope operator returned no valid result; raw subprocess output was suppressed.')
            response = json.loads(rows[0])
            # Only fixed operator reason codes are printed, never subprocess errors.
            reason = response.get('error', '')
            h.require(not reason and result.returncode == 0,
                      'Scope operator refused the change: ' + (reason if isinstance(reason, str) and reason.replace('_', '').isalnum() else 'operator_failed'))
            return response
        finally:
            for path in temporary:
                path.unlink(missing_ok=True)

    def check_files(self, plan, expanded=False):
        h = self.h
        h.require(self.source_digest() == plan['sourceDigest'], 'Scope operator source changed; use the reviewed source or create a fresh preview.')
        for name, before in plan['oldFiles'].items():
            allowed = [before, plan['newFiles'][name]] if expanded else [before]
            h.require(self.path(name).exists() and self.read(name) in allowed,
                      'Scope state/configuration/recovery record changed. Preserve the journal for review.')

    def plan(self, args):
        h = self.h
        source_commit = self.reviewed_source()
        h.require(not self.path('scope-pending.json').exists() and not self.path('upgrade-pending.json').exists(),
                  'Complete pending recovery before planning another change.')
        s = h.state()
        h.require(s['phase'] == 'enabled', 'An enabled production gateway is required.')
        current = h.upgrade_container(s)
        h.current_lms(s)
        h.require(h.SNIPPET.read_text() == h.routes(True), 'Gateway routing changed; review it first.')
        runtime = json.loads(self.read('runtime.json'))
        h.require(runtime['purpose'] == h.MARKER and runtime['installation'] == s['installation'] and
                  runtime['issuer'] == h.ISSUER and runtime['database'] == 'lms-saas' and
                  runtime['hostname'] == 'mongodb' and runtime['replica'] == 'lms-rs0' and
                  len(runtime['clients']) == 1 and runtime['clients'][0]['id'] == 'codebegun-production-chatgpt' and
                  runtime['clients'][0]['scopes'] == s['scopes'] + ['offline_access'], 'Installed identity/scopes changed.')
        h.require(not (args.all_read_domains and args.domains), 'Choose --domains or --all-read-domains, not both.')
        names = [name for name in DOMAINS if name != 'recordings'] if args.all_read_domains else [name.strip() for name in (args.domains or '').split(',') if name.strip()]
        h.require(names and all(name in DOMAINS for name in names), 'Specify --domains students,batches,attendance,exams,fees,placements,leads,calls,recordings or --all-read-domains (recordings require explicit --domains recordings).')
        selected = set(s['scopes']) | {DOMAINS[name] for name in names}
        h.require(set(s['scopes']) <= {'mcp_connect', *DOMAINS.values()} and 'mcp_connect' in s['scopes'], 'Unrecognized installed scopes.')
        target = ['mcp_connect'] + [scope for scope in DOMAINS.values() if scope in selected]
        h.require(set(target) != set(s['scopes']), 'The requested domains are already installed; use diagnose-tools to inspect consent.')
        email = (args.email or '').strip().lower()
        h.require(email and self.path('access-applied.json').exists() and self.path('access-plan.json').exists(),
                  'Specify --email for the existing account; its original access-applied.json and access-plan.json must be retained.')
        applied = json.loads(self.read('access-applied.json'))
        saved_plan = json.loads(self.read('access-plan.json'))
        h.require(applied.get('email') == email and applied.get('applied') is True and
                  sorted(applied.get('scopes', [])) == sorted(s['scopes']) and all(saved_plan.get(key) == applied.get(key)
                  for key in ['userId', 'tenantId', 'newRoleId', 'nativePermissions', 'scopes']), 'Saved account recovery records do not match this installation.')
        operation = str(uuid.uuid4())
        request = dict(operationId=operation, email=email, clientId=runtime['clients'][0]['id'],
                       access=applied, oldScopes=s['scopes'], newScopes=target)
        preview = self.operator(s, 'plan', request)
        request['fingerprint'] = preview['fingerprint']
        old_files = {name: self.read(name) for name in ['state.json', 'runtime.json', 'access-applied.json', 'access-plan.json']}
        new_state = {**s, 'scopes': target}
        new_runtime = copy.deepcopy(runtime)
        new_runtime['clients'][0]['scopes'] = target + ['offline_access']
        new_files = {'state.json': json.dumps(new_state, indent=2), 'runtime.json': json.dumps(new_runtime, indent=2)}
        for name in ['access-applied.json', 'access-plan.json']:
            record = json.loads(old_files[name])
            record['scopes'] = target
            record['scopeChangeOperation'] = operation
            new_files[name] = json.dumps(record, indent=2)
        plan = dict(purpose=h.MARKER, operation=operation, createdAt=time.time(), sourceDigest=self.source_digest(), sourceCommit=source_commit,
                    oldState=s, newState=new_state, oldContainerId=current['Id'],
                    oldFiles=old_files, newFiles=new_files, request=request, preview=preview,
                    backupName=h.CONTAINER + '-scope-rollback-' + operation)
        h.write(self.path('scope-plan.json'), plan)
        print(json.dumps(dict(planId=operation, operatorCommit=source_commit, clientId=request['clientId'], email=email, tenant=preview['tenantName'],
                              currentScopes=s['scopes'], proposedScopes=target, toolsAfterConsent=preview['tools'],
                              clientAllowlistAppliesToAllAccounts=True,
                              nativePermissionsChanged=False, existingTokensExpanded=False), indent=2))
        print('Preview only. Review the domains, account and tenant. Apply exactly this plan with:')
        print('python3 scripts/mcp-production.py scope-apply --plan-id ' + operation)

    def apply(self, args):
        h = self.h
        h.require(not self.path('scope-pending.json').exists() and not self.path('upgrade-pending.json').exists(), 'Recover the pending operation first.')
        plan = json.loads(self.read('scope-plan.json'))
        h.require(plan.get('purpose') == h.MARKER and args.plan_id == plan['operation'], 'Use the exact --plan-id printed by the reviewed preview.')
        h.require(0 <= time.time() - plan['createdAt'] <= 3600, 'Preview expired; create a fresh scope-plan.')
        h.require(self.reviewed_source() == plan['sourceCommit'], 'Operator commit changed; create a fresh preview.')
        self.check_files(plan)
        current = h.upgrade_container(plan['oldState'])
        h.require(current['Id'] == plan['oldContainerId'] and h.SNIPPET.read_text() == h.routes(True), 'Gateway or routing changed since preview.')
        h.current_lms(plan['oldState'])
        h.require(not h.inspect(plan['backupName']), 'Scope rollback container name is already in use.')
        # The journal precedes every mutation, including the database transaction.
        h.write(self.path('scope-pending.json'), plan)
        try:
            self.operator(plan['oldState'], 'apply', plan['request'])
            self.check_files(plan)
            h.docker('update', '--restart=no', plan['oldContainerId'])
            h.docker('stop', plan['oldContainerId'])
            h.docker('rename', plan['oldContainerId'], plan['backupName'])
            h.write(self.path('runtime.json'), plan['newFiles']['runtime.json'], 0o444)
            # Recreate ONLY the gateway to remount the atomically replaced file.
            h.start_gateway(plan['newState'], plan['operation'])
            h.local_ready()
            h.verify(plan['newState'])
            h.verify_discovery(plan['newState'])
            self.check_files(plan, expanded=True)
            for name in ['access-applied.json', 'access-plan.json', 'state.json']:
                h.write(self.path(name), plan['newFiles'][name])
            h.write(self.path('scope-previous.json'), plan)
            self.path('scope-pending.json').unlink()
        except BaseException:
            self.rollback(plan)
            raise
        print('PASS: reviewed client scopes and individual MCP role updated; native permissions and existing tokens are unchanged.')
        print('Reconnect CodeBegun Production and explicitly consent to the approved domains. Then run diagnose-tools and verify client tools/list.')

    def rollback(self, plan=None):
        h = self.h
        if plan is None:
            record = self.path('scope-pending.json') if self.path('scope-pending.json').exists() else self.path('scope-previous.json')
            h.require(record.exists(), 'No saved scope change to roll back.')
            plan = json.loads(record.read_text())
        h.require(plan.get('purpose') == h.MARKER, 'Unrecognized scope recovery record.')
        current = h.inspect(h.CONTAINER)
        replacement = current and current['Id'] != plan['oldContainerId']
        if replacement:
            h.require(current['Image'] == plan['newState']['imageId'] and
                      current['Config'].get('Labels', {}).get('codebegun.managed') == h.MARKER and
                      current['Config'].get('Labels', {}).get('codebegun.upgrade') == plan['operation'],
                      'Another container owns the gateway name; it was not modified.')
            try:
                h.docker('update', '--restart=no', current['Id'])
            finally:
                h.docker('stop', current['Id'])
        self.check_files(plan, expanded=True)
        old = h.inspect(plan['oldContainerId'])
        h.require(old and old['Image'] == plan['oldState']['imageId'] and
                  old['Config'].get('Labels', {}).get('codebegun.managed') == h.MARKER,
                  'Original gateway is missing/changed. Any identified replacement is stopped; preserve the journal.')
        # Refuse later/shared role edits instead of overwriting them. Revocation
        # does not depend on current LMS health or the new gateway being healthy.
        self.operator(plan['oldState'], 'rollback', plan['request'])
        for name, content in plan['oldFiles'].items():
            h.write(self.path(name), content, 0o444 if name == 'runtime.json' else 0o600)
        if replacement:
            h.docker('rm', current['Id'])
        if old['Name'] != '/' + h.CONTAINER:
            h.docker('rename', old['Id'], h.CONTAINER)
        h.docker('update', '--restart=unless-stopped', old['Id'])
        h.docker('start', old['Id'])
        restored = h.inspect(old['Id'])
        h.require(restored and restored['State']['Running'], 'Original gateway did not restart; preserve the recovery journal.')
        h.write(self.path('scope-recovered-' + plan['operation'] + '.json'), plan)
        self.path('scope-pending.json').unlink(missing_ok=True)
        self.path('scope-previous.json').unlink(missing_ok=True)
        self.path('scope-plan.json').unlink(missing_ok=True)
        print('PASS: original client scopes, individual role and recovery records restored. Expanded grants revoked; existing limited grants retained.')


def command(host, args):
    change = ScopeChange(host)
    if args.command == 'scope-plan':
        change.plan(args)
    elif args.command == 'scope-apply':
        change.apply(args)
    else:
        change.rollback()
