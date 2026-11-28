"""Regression tests for active LMS rollouts, account plans and failed enablement."""
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('production', ROOT / 'scripts/mcp-production.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class InstallerTests(unittest.TestCase):
    def test_ineligible_account_does_not_call_admin_operator_or_save_plan(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            status = {'initialOptInEligible': False, 'reasons': ['CUSTOM_ROLE_ALREADY_ASSIGNED']}
            with patch.object(p, 'STATE', directory), patch.object(p, 'state', return_value={}), \
                    patch.object(p, 'current_lms'), patch.object(p, 'account_status', return_value=status), \
                    patch.object(p, 'live_permissions') as permissions, patch.object(p, 'operator') as operator:
                with self.assertRaisesRegex(p.m.MigrationError, 'initial opt-in'):
                    p.access_command(SimpleNamespace(command='access-plan', email='selected@example.test'))
                operator.assert_not_called()
                permissions.assert_not_called()
                self.assertFalse((directory / 'access-plan.json').exists())

    def test_permission_map_failure_is_explained_without_printing_secrets(self):
        result = SimpleNamespace(returncode=1, stdout='mongodb://secret', stderr='private-password')
        active = {'id': 'current'}
        with patch.object(p, 'current_lms', return_value=active), patch.object(p, 'active_lms', return_value=active), \
                patch.object(p, 'docker', return_value=result):
            with self.assertRaises(p.m.MigrationError) as error: p.live_permissions({'activeApp': 'lms-server-blue'})
            self.assertIn('permission map', str(error.exception))
            self.assertNotIn('secret', str(error.exception))
            self.assertNotIn('private-password', str(error.exception))

    def test_permission_map_follows_nginx_after_old_slot_stops(self):
        for live, port in [('green', '5002'), ('blue', '5001')]:
            with self.subTest(live=live), tempfile.TemporaryDirectory() as directory:
                slot = Path(directory) / 'active-slot.conf'
                slot.write_text('server 127.0.0.1:' + port + ';\n')
                old = 'blue' if live == 'green' else 'green'
                state = {'activeApp': 'lms-server-' + old, 'activeAppId': 'old-id', 'mongoId': 'mongo-id'}
                original = dict(state)
                app = {'Id': 'live-id', 'Image': 'live-image', 'State': {'Running': True},
                       'NetworkSettings': {'Networks': {p.NETWORK: {}}},
                       'HostConfig': {'PortBindings': {'5000/tcp': [{'HostIp': '127.0.0.1', 'HostPort': port}]}}}
                containers = {'lms-mongodb': {'Id': 'mongo-id', 'State': {'Running': True}},
                              'lms-server-' + old: {'Id': 'old-id', 'State': {'Running': False}},
                              'lms-server-' + live: app}
                permissions = {'SUPER_ADMIN': ['existing_native_permission']}
                result = SimpleNamespace(returncode=0, stdout='startup log\nLMS_PERMISSIONS=' + json.dumps(permissions), stderr='')
                with patch.object(p, 'ACTIVE_SLOT', slot), patch.object(p, 'inspect', side_effect=containers.get) as inspect, \
                        patch.object(p, 'healthy'), patch.object(p, 'docker', return_value=result) as docker:
                    self.assertEqual(p.live_permissions(state), permissions)
                    self.assertEqual(docker.call_args.args[:3], ('exec', 'live-id', 'node'))
                    self.assertNotIn(('lms-server-' + old,), [call.args for call in inspect.call_args_list])
                    self.assertEqual(state, original)  # Deployment history is not rewritten.
                    with self.assertRaisesRegex(p.m.MigrationError, 'active LMS container changed'):
                        p.unchanged_lms(state)  # Service-installation guard remains strict.

    def test_current_lms_refuses_unhealthy_or_unrecognized_targets(self):
        for failure in ['unknown_slot', 'missing_app', 'stopped_app', 'paused_app', 'wrong_network',
                        'wrong_port', 'missing_mongo', 'stopped_mongo', 'replaced_mongo']:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as directory:
                slot = Path(directory) / 'active-slot.conf'
                slot.write_text('server 127.0.0.1:5999;' if failure == 'unknown_slot' else 'server 127.0.0.1:5002;')
                app = {'Id': 'live', 'Image': 'image', 'State': {'Running': failure != 'stopped_app', 'Paused': failure == 'paused_app'},
                       'NetworkSettings': {'Networks': {} if failure == 'wrong_network' else {p.NETWORK: {}}},
                       'HostConfig': {'PortBindings': {'5000/tcp': [{'HostIp': '127.0.0.1',
                                                                 'HostPort': '5001' if failure == 'wrong_port' else '5002'}]}}}
                db = {'Id': 'different' if failure == 'replaced_mongo' else 'mongo',
                      'State': {'Running': failure != 'stopped_mongo'}}
                containers = {'lms-server-green': None if failure == 'missing_app' else app,
                              'lms-mongodb': None if failure == 'missing_mongo' else db}
                with patch.object(p, 'ACTIVE_SLOT', slot), patch.object(p, 'inspect', side_effect=containers.get), \
                        patch.object(p, 'healthy'), patch.object(p, 'docker') as docker:
                    with self.assertRaises(p.m.MigrationError): p.live_permissions({'mongoId': 'mongo'})
                    docker.assert_not_called()

    def test_slot_change_during_permission_read_refuses_stale_map(self):
        before, after = {'id': 'green'}, {'id': 'blue'}
        result = SimpleNamespace(returncode=0, stdout='LMS_PERMISSIONS={"SUPER_ADMIN":["native"]}', stderr='')
        with patch.object(p, 'active_lms', side_effect=[before, after]), patch.object(p, 'docker', return_value=result):
            with self.assertRaisesRegex(p.m.MigrationError, 'changed while reading'):
                p.live_permissions({}, before)

    def test_access_plan_and_apply_use_current_lms_without_upgrading_gateway(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            s = {'activeApp': 'lms-server-blue', 'activeAppId': 'stopped-blue', 'imageId': 'deployed-gateway',
                 'scopes': ['mcp_connect', 'mcp_students_read', 'mcp_batches_read']}
            active = {'name': 'lms-server-green', 'id': 'running-green', 'imageId': 'live-image'}
            permissions = {'SUPER_ADMIN': ['live_native_permission']}
            preview = {'email': 'selected@example.test', 'tenantName': 'Reviewed tenant', 'userId': 'user',
                       'baseRole': 'SUPER_ADMIN', 'scopes': s['scopes']}
            with patch.object(p, 'STATE', directory), patch.object(p, 'state', return_value=s), \
                    patch.object(p, 'current_lms', return_value=active), patch.object(p, 'active_lms', return_value=active), \
                    patch.object(p, 'account_status', return_value={'initialOptInEligible': True}), \
                    patch.object(p, 'live_permissions', return_value=permissions), \
                    patch.object(p, 'operator', side_effect=[preview, {'applied': True}]) as operator, \
                    patch.object(p, 'save') as save:
                p.access_command(SimpleNamespace(command='access-plan', email='selected@example.test'))
                plan = json.loads((directory / 'access-plan.json').read_text())
                self.assertEqual(plan['lmsSource'], active)
                self.assertEqual(plan['basePermissions'], permissions)
                self.assertFalse((directory / 'access-applied.json').exists())
                p.access_command(SimpleNamespace(command='access-apply'))
                self.assertEqual(operator.call_args_list[0].args[1], 'access-plan')
                self.assertEqual(operator.call_args_list[1].args, (s, 'access-apply', plan))
                self.assertTrue((directory / 'access-applied.json').exists())
                self.assertEqual(s['imageId'], 'deployed-gateway')
                save.assert_not_called()

    def test_apply_refuses_plan_from_old_installer_changed_slot_or_changed_permissions(self):
        active = {'name': 'lms-server-green', 'id': 'green-id', 'imageId': 'live-image'}
        for failure in ['old_installer', 'new_slot', 'replaced_container', 'permission_change']:
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as directory:
                directory = Path(directory)
                request = {'lmsSource': dict(active), 'basePermissions': {'SUPER_ADMIN': ['old_native']}}
                if failure == 'old_installer': request.pop('lmsSource')
                if failure == 'new_slot': request['lmsSource']['name'] = 'lms-server-blue'
                if failure == 'replaced_container': request['lmsSource']['id'] = 'old-green-id'
                (directory / 'access-plan.json').write_text(json.dumps(request))
                with patch.object(p, 'STATE', directory), patch.object(p, 'state', return_value={}), \
                        patch.object(p, 'current_lms', return_value=active), \
                        patch.object(p, 'live_permissions', return_value={'SUPER_ADMIN': ['new_native']}), \
                        patch.object(p, 'operator') as operator:
                    with self.assertRaisesRegex(p.m.MigrationError, 'fresh access-plan'):
                        p.access_command(SimpleNamespace(command='access-apply'))
                    operator.assert_not_called()
                    self.assertFalse((directory / 'access-applied.json').exists())

    def test_diagnostic_failure_reports_only_allowlisted_stage(self):
        container = {'State': {'Running': True}, 'Image': 'recorded',
                     'Config': {'Labels': {'codebegun.managed': p.MARKER}}}
        result = SimpleNamespace(returncode=1, stdout='ACCOUNT_STATUS={"diagnosticFailedAt":"database_connection"}\n',
                                 stderr='mongodb://private-password')
        with patch.object(p, 'inspect', return_value=container), patch.object(p.subprocess, 'run', return_value=result) as run:
            with self.assertRaises(p.m.MigrationError) as error: p.account_status({'imageId': 'recorded'}, 'selected@example.test')
            self.assertIn('database_connection', str(error.exception))
            self.assertNotIn('private-password', str(error.exception))
            self.assertEqual(run.call_args.args[0][-3:], ['node', '-', 'selected@example.test'])
            self.assertNotIn('admin.json', run.call_args.kwargs['input'])

    def test_real_site_quotes_comments_and_idempotence(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'site'
            source = (ROOT / 'nginx/platform.codebegun.com.conf').read_text().replace('    ' + p.INCLUDE + '\n', '')
            path.write_text(source)
            original, candidate = p.site_candidate(path)
            self.assertEqual(original, source)
            self.assertEqual(candidate.replace('\n    ' + p.INCLUDE + '\n', '', 1), source)
            self.assertEqual(candidate.count(p.INCLUDE), 1)
            path.write_text(candidate)
            self.assertEqual(p.site_candidate(path), (candidate, candidate))

    def test_existing_route_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'site'
            path.write_text('server {\nserver_name platform.codebegun.com;\nlisten 443 ssl;\nlocation /mcp { return 403; }\n}')
            with self.assertRaises(p.m.MigrationError): p.site_candidate(path)

    def test_https_verification_failure_restores_live_site_and_stops_only_new_mcp(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            site, snippet = directory / 'site', directory / 'snippets/production.conf'
            source = 'server {\nserver_name platform.codebegun.com;\nlisten 443 ssl;\nlocation / { proxy_pass http://lms_backend; }\n}'
            site.write_text(source)
            s = {'commit': 'reviewed', 'phase': 'prepared', 'site': str(site), 'imageId': 'sha256:tested'}
            with patch.object(p, 'STATE', directory), patch.object(p, 'SNIPPET', snippet), \
                    patch.object(p, 'preflight', return_value={'commit': 'reviewed'}), \
                    patch.object(p, 'state', return_value=s), patch.object(p, 'unchanged_lms'), \
                    patch.object(p, 'locate_site', return_value=site), patch.object(p, 'inspect', return_value=None), \
                    patch.object(p, 'docker') as docker, patch.object(p, 'run') as run, \
                    patch.object(p, 'local_ready'), patch.object(p.time, 'sleep'), \
                    patch.object(p, 'verify', side_effect=p.m.MigrationError('Injected public failure')):
                with self.assertRaises(p.m.MigrationError): p.enable()
                self.assertEqual(site.read_text(), source)
                self.assertFalse(snippet.exists())
                self.assertEqual(s['phase'], 'prepared')
                self.assertEqual(docker.call_args_list[-1].args, ('stop', p.CONTAINER))
                self.assertEqual(run.call_args_list[-2].args, (['nginx', '-t'],))
                self.assertEqual(run.call_args_list[-1].args, (['nginx', '-s', 'reload'],))

    def test_failed_rollback_reload_still_stops_new_gateway(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            site, snippet = directory / 'site', directory / 'production.conf'
            site.write_text('server {\nserver_name platform.codebegun.com;\nlisten 443 ssl;\n}')
            s = {'commit': 'reviewed', 'phase': 'prepared', 'site': str(site), 'imageId': 'sha256:tested'}
            with patch.object(p, 'STATE', directory), patch.object(p, 'SNIPPET', snippet), \
                    patch.object(p, 'preflight', return_value={'commit': 'reviewed'}), \
                    patch.object(p, 'state', return_value=s), patch.object(p, 'unchanged_lms'), \
                    patch.object(p, 'locate_site', return_value=site), patch.object(p, 'inspect', return_value=None), \
                    patch.object(p, 'docker') as docker, \
                    patch.object(p, 'run', side_effect=p.m.MigrationError('Broken Nginx configuration')), \
                    patch.object(p, 'local_ready', side_effect=p.m.MigrationError('Startup failed')):
                with self.assertRaises(p.m.MigrationError): p.enable()
                self.assertEqual(docker.call_args_list[-1].args, ('stop', p.CONTAINER))
                self.assertEqual(s['phase'], 'prepared')

    def test_disable_stops_gateway_despite_nginx_error_and_lms_outage(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            snippet = directory / 'production.conf'
            snippet.write_text(p.routes(True))
            s = {'phase': 'enabled'}
            container = {'Config': {'Labels': {'codebegun.managed': p.MARKER}}}
            with patch.object(p, 'STATE', directory), patch.object(p, 'SNIPPET', snippet), \
                    patch.object(p, 'state', return_value=s), patch.object(p, 'inspect', return_value=container), \
                    patch.object(p, 'run', side_effect=p.m.MigrationError('Unrelated Nginx error')), \
                    patch.object(p, 'healthy', side_effect=p.m.MigrationError('LMS unavailable')) as health, \
                    patch.object(p, 'docker') as docker:
                with self.assertRaisesRegex(p.m.MigrationError, 'gateway stopped'): p.disable()
                docker.assert_called_once_with('stop', p.CONTAINER)
                health.assert_not_called()
                self.assertEqual(s['phase'], 'disabled')
                self.assertIn('return 404;', snippet.read_text())

    def test_revoke_does_not_depend_on_old_lms_container_or_readiness(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            (directory / 'access-applied.json').write_text('{"userId":"reviewed-account"}')
            with patch.object(p, 'STATE', directory), patch.object(p, 'state', return_value={}), \
                    patch.object(p, 'current_lms', side_effect=p.m.MigrationError('LMS replaced')) as check, \
                    patch.object(p, 'operator', return_value={'revoked': True}) as operator:
                p.access_command(SimpleNamespace(command='access-revoke'))
                check.assert_not_called()
                operator.assert_called_once_with({}, 'access-revoke', {'userId': 'reviewed-account'})
                self.assertFalse((directory / 'access-applied.json').exists())

    def test_interrupted_apply_can_revoke_exact_saved_plan_after_lms_rollout(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            plan = {'userId': 'reviewed-account', 'newRoleId': 'planned-role', 'lmsSource': {'id': 'previous-slot'}}
            (directory / 'access-plan.json').write_text(json.dumps(plan))
            with patch.object(p, 'STATE', directory), patch.object(p, 'state', return_value={}), \
                    patch.object(p, 'current_lms', side_effect=p.m.MigrationError('LMS replaced')) as check, \
                    patch.object(p, 'operator', return_value={'revoked': True}) as operator:
                p.access_command(SimpleNamespace(command='access-revoke'))
                check.assert_not_called()
                operator.assert_called_once_with({}, 'access-revoke', plan)
                self.assertFalse((directory / 'access-plan.json').exists())
                self.assertEqual(len(list(directory.glob('access-revoked-*.json'))), 1)

    def test_rejected_recovery_revoke_keeps_original_plan(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            path = directory / 'access-plan.json'
            path.write_text('{"newRoleId":"never-assigned-or-subsequently-modified"}')
            original = path.read_text()
            with patch.object(p, 'STATE', directory), patch.object(p, 'state', return_value={}), \
                    patch.object(p, 'operator', side_effect=p.m.MigrationError('Exact role verification refused')):
                with self.assertRaises(p.m.MigrationError): p.access_command(SimpleNamespace(command='access-revoke'))
                self.assertEqual(path.read_text(), original)
                self.assertFalse(list(directory.glob('access-revoked-*.json')))

    def test_pre_enable_upgrade_preserves_runtime_credentials_and_scopes(self):
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            s = {'purpose': p.MARKER, 'phase': 'prepared', 'commit': 'old', 'imageId': 'sha256:old',
                 'scopes': ['mcp_connect', 'mcp_students_read', 'mcp_batches_read'], 'installation': 'existing'}
            config = json.dumps({'purpose': p.MARKER, 'installation': 'existing', 'password': 'retained',
                                 'clients': [{'scopes': s['scopes'] + ['offline_access']}]})
            (directory / 'runtime.json').write_text(config)
            with patch.object(p, 'STATE', directory), patch.object(p, 'SNIPPET', directory / 'no-route'), \
                    patch.object(p, 'inspect', return_value=None), patch.object(p, 'unchanged_lms'):
                p.upgrade_prepared(s, {'commit': 'reviewed-fix', 'image': 'fixed-image'})
                self.assertEqual((directory / 'runtime.json').read_text(), config)
                self.assertEqual(json.loads((directory / 'prepared-old.json').read_text())['imageId'], 'sha256:old')
                self.assertEqual(s['commit'], 'reviewed-fix')
                self.assertEqual(s['phase'], 'preparing')
                self.assertNotIn('imageId', s)

    def test_pre_enable_upgrade_refuses_any_service_route_or_account_operation(self):
        for blocker in ['enabled', 'container', 'route', 'account']:
            with self.subTest(blocker=blocker), tempfile.TemporaryDirectory() as directory:
                directory = Path(directory)
                snippet = directory / 'production.conf'
                s = {'phase': 'enabled' if blocker == 'enabled' else 'prepared', 'commit': 'old'}
                if blocker == 'route': snippet.write_text(p.routes(False))
                if blocker == 'account': (directory / 'access-plan.json').write_text('{}')
                with patch.object(p, 'STATE', directory), patch.object(p, 'SNIPPET', snippet), \
                        patch.object(p, 'inspect', return_value={'Id': 'owned'} if blocker == 'container' else None):
                    with self.assertRaises(p.m.MigrationError): p.upgrade_prepared(s, {'commit': 'new'})
                    self.assertEqual(s['commit'], 'old')


if __name__ == '__main__': unittest.main()
