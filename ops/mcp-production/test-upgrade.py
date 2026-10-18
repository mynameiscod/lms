"""Fault-injected gateway replacement/recovery; no real Docker or database writes."""
import copy
from contextlib import ExitStack
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('upgrade_installer', ROOT / 'scripts/mcp-production.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class UpgradeTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.directory = Path(self.stack.enter_context(tempfile.TemporaryDirectory()))
        self.stack.enter_context(patch.object(p, 'STATE', self.directory))
        self.snippet = self.directory / 'production.conf'
        self.snippet.write_text(p.routes(True))
        self.stack.enter_context(patch.object(p, 'SNIPPET', self.snippet))
        self.old_state = {'purpose': p.MARKER, 'phase': 'enabled', 'installation': 'existing', 'commit': 'old',
                          'imageId': 'old-image', 'image': 'old-tag', 'mongoId': 'same-db', 'site': '/same-site',
                          'scopes': ['mcp_connect', 'mcp_students_read', 'mcp_batches_read']}
        self.config = {'purpose': p.MARKER, 'installation': 'existing', 'issuer': p.ISSUER, 'database': 'lms-saas',
                       'hostname': 'mongodb', 'replica': 'lms-rs0',
                       'password': 'private-existing-credential',
                       'clients': [{'scopes': self.old_state['scopes'] + ['offline_access']}]}
        p.write(self.directory / 'runtime.json', self.config)
        p.write(self.directory / 'access-applied.json', {'existing': 'reviewed-account'})
        self.runtime_before = (self.directory / 'runtime.json').read_bytes()
        self.access_before = (self.directory / 'access-applied.json').read_bytes()
        p.save(self.old_state)
        self.stack.enter_context(patch.object(p, 'state', side_effect=lambda: json.loads((self.directory / 'state.json').read_text())))
        self.stack.enter_context(patch.object(p, 'preflight', return_value={'commit': 'new', 'image': 'new-tag',
                                                                         'mongoId': 'same-db', 'site': '/same-site'}))
        self.stack.enter_context(patch.object(p, 'current_lms', return_value={'id': 'green-live'}))
        self.build = self.stack.enter_context(patch.object(p, 'build_image', return_value='new-image'))
        self.operator = self.stack.enter_context(patch.object(p, 'operator', return_value={'runtimePrivileges': 'verified'}))
        self.ready = self.stack.enter_context(patch.object(p, 'local_ready'))
        self.verify = self.stack.enter_context(patch.object(p, 'verify'))
        self.discovery = self.stack.enter_context(patch.object(p, 'verify_discovery'))
        self.old_id, self.new_id = 'a' * 64, 'b' * 64
        self.containers = {self.old_id: self.container(self.old_id, 'old-image')}
        self.fail_command = None
        self.calls = []
        self.stack.enter_context(patch.object(p, 'inspect', side_effect=self.inspect))
        self.stack.enter_context(patch.object(p, 'docker', side_effect=self.docker))

    def container(self, ident, image, operation=None):
        labels = {'codebegun.managed': p.MARKER}
        if operation: labels['codebegun.upgrade'] = operation
        return {'Id': ident, 'Name': '/' + p.CONTAINER, 'Image': image, 'State': {'Running': True},
                'Config': {'User': 'node', 'Labels': labels}, 'NetworkSettings': {'Networks': {p.NETWORK: {}}},
                'HostConfig': {'ReadonlyRootfs': True, 'RestartPolicy': {'Name': 'unless-stopped'},
                               'PortBindings': {'5000/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '5011'}]}},
                'Mounts': [{'Type': 'bind', 'Source': str(self.directory / 'runtime.json'),
                            'Destination': '/run/mcp/runtime.json', 'RW': False}]}

    def inspect(self, value):
        return next((c for c in self.containers.values() if c['Id'] == value or c['Name'] == '/' + value), None)

    def docker(self, *args, **kwargs):
        self.calls.append(args)
        if args[0] == self.fail_command:
            self.fail_command = None
            raise p.m.MigrationError('Injected Docker failure')
        command = args[0]
        if command == 'run':
            self.assertEqual(args[-1], 'new-image')
            self.assertIn('127.0.0.1:5011:5000', args)
            self.assertIn('--read-only', args)
            self.assertNotIn('admin.json', ' '.join(args))
            operation = next(x.split('=', 1)[1] for x in args if x.startswith('codebegun.upgrade='))
            self.containers[self.new_id] = self.container(self.new_id, 'new-image', operation)
        elif command == 'update':
            self.inspect(args[-1])['HostConfig']['RestartPolicy']['Name'] = args[1].split('=', 1)[1]
        elif command in ['stop', 'start']:
            self.inspect(args[1])['State']['Running'] = command == 'start'
        elif command == 'rename': self.inspect(args[1])['Name'] = '/' + args[2]
        elif command == 'rm': self.containers.pop(args[1])
        else: self.fail('Unexpected Docker command: ' + command)
        return SimpleNamespace(returncode=0, stdout='', stderr='')

    def assert_preserved(self):
        self.assertEqual((self.directory / 'runtime.json').read_bytes(), self.runtime_before)
        self.assertEqual((self.directory / 'access-applied.json').read_bytes(), self.access_before)
        self.assertEqual(self.snippet.read_text(), p.routes(True))
        self.assertTrue(all(c.args[1] == 'verify' for c in self.operator.call_args_list))

    def assert_restored(self):
        self.assertEqual(p.state(), self.old_state)
        self.assertEqual(self.inspect(p.CONTAINER)['Id'], self.old_id)
        self.assertTrue(self.containers[self.old_id]['State']['Running'])
        self.assertEqual(self.containers[self.old_id]['HostConfig']['RestartPolicy']['Name'], 'unless-stopped')
        self.assertNotIn(self.new_id, self.containers)
        self.assertFalse((self.directory / 'upgrade-pending.json').exists())
        self.assert_preserved()

    def test_success_retains_disabled_old_container_and_changes_only_gateway_image(self):
        p.upgrade()
        self.assertEqual(p.state()['imageId'], 'new-image')
        old = self.containers[self.old_id]
        self.assertFalse(old['State']['Running'])
        self.assertEqual(old['HostConfig']['RestartPolicy']['Name'], 'no')
        self.assertTrue(old['Name'].startswith('/' + p.CONTAINER + '-rollback-'))
        self.assertTrue((self.directory / 'upgrade-previous.json').exists())
        self.assertFalse((self.directory / 'upgrade-pending.json').exists())
        self.assert_preserved()

    def test_failed_build_or_runtime_validation_keeps_old_gateway_live(self):
        for mock in [self.build, self.operator]:
            with self.subTest(stage=mock):
                mock.side_effect = p.m.MigrationError('Injected preflight failure')
                with self.assertRaises(p.m.MigrationError): p.upgrade()
                mock.side_effect = None
                self.assertEqual(self.calls, [])
                self.assert_restored()

    def test_each_docker_cutover_failure_restores_old_gateway(self):
        for command in ['update', 'stop', 'rename', 'run']:
            with self.subTest(command=command):
                self.fail_command = command
                with self.assertRaises(p.m.MigrationError): p.upgrade()
                self.assert_restored()

    def test_readiness_public_verification_and_scope_failures_restore_old_gateway(self):
        for mock in [self.ready, self.verify, self.discovery]:
            with self.subTest(stage=mock):
                mock.side_effect = p.m.MigrationError('Injected verification failure')
                with self.assertRaises(p.m.MigrationError): p.upgrade()
                mock.side_effect = None
                self.assert_restored()

    def test_successful_upgrade_can_roll_back_during_lms_outage(self):
        p.upgrade()
        with patch.object(p, 'current_lms', side_effect=AssertionError('Rollback consulted LMS')):
            self.verify.side_effect = AssertionError('Rollback used new verification')
            self.discovery.side_effect = AssertionError('Rollback used new discovery')
            p.restore_upgrade()
        self.assert_restored()

    def test_recovery_after_interruption_at_each_container_state(self):
        for stage in ['before_stop', 'stopped', 'renamed', 'replacement_created', 'state_saved']:
            with self.subTest(stage=stage):
                old = self.container(self.old_id, 'old-image')
                self.containers = {self.old_id: old}
                new_state = {**self.old_state, 'commit': 'new', 'imageId': 'new-image'}
                journal = {'purpose': p.MARKER, 'operation': 'interrupted', 'oldState': self.old_state,
                           'newState': new_state, 'oldContainerId': self.old_id,
                           'runtimeDigest': p.digest((self.directory / 'runtime.json').read_text())}
                p.write(self.directory / 'upgrade-pending.json', journal)
                old['HostConfig']['RestartPolicy']['Name'] = 'no'
                if stage != 'before_stop': old['State']['Running'] = False
                if stage in ['renamed', 'replacement_created', 'state_saved']: old['Name'] += '-rollback'
                if stage in ['replacement_created', 'state_saved']:
                    self.containers[self.new_id] = self.container(self.new_id, 'new-image', 'interrupted')
                p.save(new_state if stage == 'state_saved' else self.old_state)
                p.restore_upgrade()
                self.assert_restored()

    def test_rollback_refuses_unrelated_container_without_stopping_it(self):
        p.upgrade()
        self.containers[self.new_id]['Config']['Labels']['codebegun.upgrade'] = 'unrelated'
        before = copy.deepcopy(self.containers)
        with self.assertRaisesRegex(p.m.MigrationError, 'Another container'): p.restore_upgrade()
        self.assertEqual(self.containers, before)

    def test_upgrade_refuses_runtime_drift_before_building(self):
        self.config['clients'][0]['scopes'].append('mcp_finance_read')
        p.write(self.directory / 'runtime.json', self.config)
        with self.assertRaisesRegex(p.m.MigrationError, 'scope configuration changed'): p.upgrade()
        self.build.assert_not_called()
        self.assertEqual(self.calls, [])

    def test_runtime_drift_during_build_keeps_old_gateway_running(self):
        def build(_):
            p.write(self.directory / 'runtime.json', {**self.config, 'password': 'changed'})
            return 'new-image'
        self.build.side_effect = build
        with self.assertRaisesRegex(p.m.MigrationError, 'changed during the build'): p.upgrade()
        self.assertEqual(self.calls, [])
        self.assertTrue(self.containers[self.old_id]['State']['Running'])

    def test_runtime_drift_after_cutover_stops_replacement_and_retains_recovery(self):
        self.discovery.side_effect = lambda _: p.write(self.directory / 'runtime.json', {**self.config, 'password': 'changed'})
        with self.assertRaisesRegex(p.m.MigrationError, 'configuration changed'): p.upgrade()
        self.assertFalse(self.containers[self.new_id]['State']['Running'])
        self.assertEqual(self.containers[self.new_id]['HostConfig']['RestartPolicy']['Name'], 'no')
        self.assertFalse(self.containers[self.old_id]['State']['Running'])
        self.assertTrue((self.directory / 'upgrade-pending.json').exists())
        (self.directory / 'runtime.json').write_bytes(self.runtime_before)
        p.restore_upgrade()
        self.assert_restored()

    def test_missing_retained_container_stops_replacement_without_deleting_recovery(self):
        p.upgrade()
        self.containers.pop(self.old_id)
        with self.assertRaisesRegex(p.m.MigrationError, 'rollback gateway is missing'): p.restore_upgrade()
        self.assertFalse(self.containers[self.new_id]['State']['Running'])
        self.assertEqual(self.containers[self.new_id]['HostConfig']['RestartPolicy']['Name'], 'no')
        self.assertTrue((self.directory / 'upgrade-previous.json').exists())

    def test_rollback_still_stops_replacement_if_restart_policy_update_fails(self):
        p.upgrade()
        self.fail_command = 'update'
        with self.assertRaisesRegex(p.m.MigrationError, 'Injected Docker failure'): p.restore_upgrade()
        self.assertFalse(self.containers[self.new_id]['State']['Running'])
        self.assertTrue((self.directory / 'upgrade-previous.json').exists())
        p.restore_upgrade()
        self.assert_restored()


if __name__ == '__main__': unittest.main()
