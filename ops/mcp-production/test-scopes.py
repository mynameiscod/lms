"""Scope cutover failure/recovery tests: fake Docker/DB, real protected files."""
import copy
from contextlib import ExitStack, redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
p = load('scope_host', 'scripts/mcp-production.py')
scope = load('scope_change', 'scripts/mcp_production_scopes.py')


class ScopeTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.directory = Path(self.stack.enter_context(tempfile.TemporaryDirectory()))
        self.stack.enter_context(patch.object(p, 'STATE', self.directory))
        self.stack.enter_context(patch.object(p, 'SNIPPET', self.directory / 'routing.conf'))
        p.SNIPPET.write_text(p.routes(True))
        self.old_state = dict(purpose=p.MARKER, phase='enabled', installation='existing', commit='old',
                              imageId='existing-image', scopes=['mcp_connect', 'mcp_students_read', 'mcp_batches_read'])
        config = dict(purpose=p.MARKER, installation='existing', issuer=p.ISSUER, database='lms-saas',
                      hostname='mongodb', replica='lms-rs0', password='private-existing-credential',
                      clients=[dict(id='codebegun-production-chatgpt', scopes=self.old_state['scopes'] + ['offline_access'],
                                    redirectUris=['https://chatgpt.com/connector_platform_oauth_redirect'])])
        self.applied = dict(email='owner@example.com', userId='user', tenantId='tenant', newRoleId='role',
                            nativePermissions=['view_fees'], scopes=sorted(self.old_state['scopes']), applied=True)
        for name, value in [('state.json', self.old_state), ('runtime.json', config),
                            ('access-applied.json', self.applied), ('access-plan.json', self.applied)]:
            p.write(self.directory / name, value)
        self.original = {name: (self.directory / name).read_text() for name in
                         ['state.json', 'runtime.json', 'access-applied.json', 'access-plan.json']}
        self.stack.enter_context(patch.object(p, 'state', side_effect=lambda: json.loads((self.directory / 'state.json').read_text())))
        self.live = self.stack.enter_context(patch.object(p, 'current_lms', return_value={'id': 'live-lms'}))
        self.ready = self.stack.enter_context(patch.object(p, 'local_ready'))
        self.verify = self.stack.enter_context(patch.object(p, 'verify'))
        self.discovery = self.stack.enter_context(patch.object(p, 'verify_discovery'))
        self.old_id, self.new_id = 'a' * 64, 'b' * 64
        self.containers = {self.old_id: self.container(self.old_id)}
        self.calls = []
        self.fail_command = None
        self.stack.enter_context(patch.object(p, 'inspect', side_effect=self.inspect))
        self.stack.enter_context(patch.object(p, 'docker', side_effect=self.docker))
        self.change = scope.ScopeChange(p)
        self.stack.enter_context(patch.object(self.change, 'reviewed_source', return_value='c' * 40))
        self.db_expanded = False
        self.fail_operator = None
        self.operator_calls = []
        self.stack.enter_context(patch.object(self.change, 'operator', side_effect=self.operator))

    def container(self, ident, operation=None):
        labels = {'codebegun.managed': p.MARKER}
        if operation: labels['codebegun.upgrade'] = operation
        return dict(Id=ident, Name='/' + p.CONTAINER, Image='existing-image', State={'Running': True},
                    Config={'User': 'node', 'Labels': labels}, NetworkSettings={'Networks': {p.NETWORK: {}}},
                    HostConfig={'ReadonlyRootfs': True, 'RestartPolicy': {'Name': 'unless-stopped'},
                                'PortBindings': {'5000/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '5011'}]}},
                    Mounts=[{'Type': 'bind', 'Source': str(self.directory / 'runtime.json'), 'Destination': '/run/mcp/runtime.json', 'RW': False}])

    def inspect(self, value):
        return next((c for c in self.containers.values() if c['Id'] == value or c['Name'] == '/' + value), None)

    def docker(self, *args, **kwargs):
        self.calls.append(args)
        if args[0] == self.fail_command:
            self.fail_command = None
            raise p.m.MigrationError('Injected Docker failure')
        command = args[0]
        if command == 'run':
            self.assertEqual(args[-1], 'existing-image')
            self.assertNotIn('scope-admin.json', ' '.join(args))
            operation = next(x.split('=', 1)[1] for x in args if x.startswith('codebegun.upgrade='))
            self.containers[self.new_id] = self.container(self.new_id, operation)
        elif command == 'update': self.inspect(args[-1])['HostConfig']['RestartPolicy']['Name'] = args[1].split('=', 1)[1]
        elif command in ['stop', 'start']: self.inspect(args[1])['State']['Running'] = command == 'start'
        elif command == 'rename': self.inspect(args[1])['Name'] = '/' + args[2]
        elif command == 'rm': self.containers.pop(args[1])
        else: self.fail('Unexpected Docker command: ' + command)
        return SimpleNamespace(returncode=0, stdout='', stderr='')

    def operator(self, state, action, request):
        self.operator_calls.append(action)
        if action == self.fail_operator: raise p.m.MigrationError('Injected operator failure')
        if action == 'plan': return dict(fingerprint='stable-policy', tools=['tool-' + str(i) for i in range(15)], tenantName='Synthetic')
        if action == 'apply': self.db_expanded = True
        elif action == 'rollback': self.db_expanded = False
        return {'completed': action}

    def plan(self):
        output = io.StringIO()
        with redirect_stdout(output):
            self.change.plan(SimpleNamespace(email='owner@example.com', all_read_domains=True, domains=None))
        self.assertNotIn('private-existing-credential', output.getvalue())
        self.plan_data = json.loads((self.directory / 'scope-plan.json').read_text())
        return self.plan_data

    def apply(self):
        self.change.apply(SimpleNamespace(plan_id=self.plan_data['operation']))

    def assert_restored(self):
        self.assertFalse(self.db_expanded)
        self.assertEqual(self.inspect(p.CONTAINER)['Id'], self.old_id)
        self.assertTrue(self.inspect(self.old_id)['State']['Running'])
        self.assertEqual(self.inspect(self.old_id)['HostConfig']['RestartPolicy']['Name'], 'unless-stopped')
        self.assertNotIn(self.new_id, self.containers)
        for name, value in self.original.items(): self.assertEqual((self.directory / name).read_text(), value)
        self.assertFalse((self.directory / 'scope-pending.json').exists())
        self.assertEqual(p.SNIPPET.read_text(), p.routes(True))

    def test_preview_is_read_only_and_requires_explicit_domains(self):
        self.plan()
        self.assertEqual(self.calls, [])
        self.assertEqual(self.operator_calls, ['plan'])
        self.assertFalse(self.db_expanded)
        self.assertEqual((self.directory / 'scope-plan.json').stat().st_mode & 0o777, 0o600)
        for name, value in self.original.items(): self.assertEqual((self.directory / name).read_text(), value)
        with self.assertRaises(p.m.MigrationError):
            self.change.plan(SimpleNamespace(email='owner@example.com', all_read_domains=False, domains=None))

    def test_recordings_require_explicit_domain_and_do_not_follow_all_reads(self):
        self.plan()
        self.assertNotIn('mcp_recordings_read', self.plan_data['newState']['scopes'])
        with redirect_stdout(io.StringIO()):
            self.change.plan(SimpleNamespace(email='owner@example.com', all_read_domains=False, domains='recordings'))
        plan = json.loads((self.directory / 'scope-plan.json').read_text())
        self.assertEqual(set(plan['newState']['scopes']) - set(self.old_state['scopes']), {'mcp_recordings_read'})

    def test_success_uses_same_image_preserves_native_snapshot_and_old_credentials(self):
        self.plan(); self.apply()
        self.assertTrue(self.db_expanded)
        self.assertEqual(p.state()['imageId'], 'existing-image')
        self.assertEqual(len(p.state()['scopes']), 9)
        current = json.loads((self.directory / 'runtime.json').read_text())
        previous = json.loads(self.original['runtime.json'])
        self.assertEqual(current['password'], previous['password'])
        self.assertEqual(current['clients'][0]['redirectUris'], previous['clients'][0]['redirectUris'])
        for name in ['access-applied.json', 'access-plan.json']:
            updated = json.loads((self.directory / name).read_text())
            self.assertEqual(updated['nativePermissions'], self.applied['nativePermissions'])
            self.assertEqual(updated['newRoleId'], self.applied['newRoleId'])
            self.assertEqual(updated['scopes'], p.state()['scopes'])
        self.assertFalse(self.containers[self.old_id]['State']['Running'])
        self.assertEqual(self.containers[self.old_id]['HostConfig']['RestartPolicy']['Name'], 'no')
        self.assertTrue((self.directory / 'scope-previous.json').exists())
        self.assertFalse((self.directory / 'scope-pending.json').exists())

    def test_wrong_confirmation_expired_plan_and_file_drift_do_not_mutate(self):
        self.plan()
        with self.assertRaises(p.m.MigrationError): self.change.apply(SimpleNamespace(plan_id='not-reviewed'))
        changed = {**self.plan_data, 'createdAt': time.time() - 3601}
        p.write(self.directory / 'scope-plan.json', changed)
        with self.assertRaises(p.m.MigrationError): self.apply()
        p.write(self.directory / 'scope-plan.json', self.plan_data)
        (self.directory / 'runtime.json').write_text(self.original['runtime.json'] + '\n')
        with self.assertRaises(p.m.MigrationError): self.apply()
        self.assertEqual(self.calls, [])
        self.assertEqual(self.operator_calls, ['plan'])

    def test_each_cutover_failure_restores_files_role_and_old_gateway(self):
        for stage in ['operator', 'update', 'stop', 'rename', 'run', 'ready', 'verify', 'discovery']:
            with self.subTest(stage=stage):
                self.plan()
                if stage == 'operator': self.fail_operator = 'apply'
                elif stage in ['ready', 'verify', 'discovery']: getattr(self, stage).side_effect = p.m.MigrationError('Injected health failure')
                else: self.fail_command = stage
                with self.assertRaises(p.m.MigrationError): self.apply()
                self.fail_operator = None
                for item in [self.ready, self.verify, self.discovery]: item.side_effect = None
                self.assert_restored()

    def test_completed_change_rolls_back_during_lms_outage(self):
        self.plan(); self.apply()
        self.live.side_effect = AssertionError('Rollback consulted live LMS')
        self.discovery.side_effect = AssertionError('Rollback consulted new discovery')
        self.change.rollback()
        self.assert_restored()

    def test_interrupted_mixed_file_updates_recover(self):
        self.plan(); self.apply()
        p.write(self.directory / 'scope-pending.json', self.plan_data)
        (self.directory / 'access-applied.json').write_text(self.original['access-applied.json'])
        (self.directory / 'state.json').write_text(self.original['state.json'])
        self.change.rollback()
        self.assert_restored()

    def test_configuration_drift_stops_replacement_retains_journal_and_can_retry(self):
        self.plan()
        def drift(_):
            p.write(self.directory / 'runtime.json', 'changed externally', 0o444)
        self.discovery.side_effect = drift
        with self.assertRaises(p.m.MigrationError): self.apply()
        self.assertFalse(self.containers[self.new_id]['State']['Running'])
        self.assertTrue((self.directory / 'scope-pending.json').exists())
        p.write(self.directory / 'runtime.json', self.plan_data['newFiles']['runtime.json'], 0o444)
        self.change.rollback()
        self.assert_restored()

    def test_role_drift_refuses_rollback_without_overwriting_records(self):
        self.plan(); self.apply()
        self.fail_operator = 'rollback'
        with self.assertRaises(p.m.MigrationError): self.change.rollback()
        self.assertFalse(self.containers[self.new_id]['State']['Running'])
        self.assertTrue(self.db_expanded)
        self.assertTrue((self.directory / 'scope-previous.json').exists())
        self.assertEqual((self.directory / 'runtime.json').read_text(), self.plan_data['newFiles']['runtime.json'])
        self.fail_operator = None
        self.change.rollback()
        self.assert_restored()

    def test_unrelated_replacement_is_not_touched(self):
        self.plan(); self.apply()
        self.containers[self.new_id]['Config']['Labels']['codebegun.upgrade'] = 'unrelated'
        before = copy.deepcopy(self.containers)
        with self.assertRaises(p.m.MigrationError): self.change.rollback()
        self.assertEqual(self.containers, before)

    def test_pending_scope_change_blocks_image_and_access_changes(self):
        p.write(self.directory / 'scope-pending.json', {})
        for command in ['upgrade', 'upgrade-rollback', 'prepare', 'access-apply', 'access-revoke']:
            with self.assertRaises(p.m.MigrationError): p.dispatch(SimpleNamespace(command=command))

    def test_real_preview_wrapper_never_reads_or_mounts_admin_credentials(self):
        change = scope.ScopeChange(p)
        with patch.object(p, 'admin_credentials', side_effect=AssertionError('Preview read admin credentials')):
            with patch.object(p, 'docker', return_value=SimpleNamespace(returncode=0, stdout='SCOPE_JSON={"fingerprint":"ok"}\n')) as docker:
                self.assertEqual(change.operator(self.old_state, 'plan', {}), {'fingerprint': 'ok'})
                self.assertNotIn('scope-admin.json', ' '.join(docker.call_args.args))
        self.assertFalse((self.directory / 'scope-request.json').exists())


if __name__ == '__main__': unittest.main()
