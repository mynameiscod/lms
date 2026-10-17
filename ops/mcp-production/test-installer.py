"""Focused regression tests for live Nginx preservation and failed enablement."""
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
                    patch.object(p, 'unchanged_lms'), patch.object(p, 'account_status', return_value=status), \
                    patch.object(p, 'live_permissions') as permissions, patch.object(p, 'operator') as operator:
                with self.assertRaisesRegex(p.m.MigrationError, 'initial opt-in'):
                    p.access_command(SimpleNamespace(command='access-plan', email='selected@example.test'))
                operator.assert_not_called()
                permissions.assert_not_called()
                self.assertFalse((directory / 'access-plan.json').exists())

    def test_permission_map_failure_is_explained_without_printing_secrets(self):
        result = SimpleNamespace(returncode=1, stdout='mongodb://secret', stderr='private-password')
        with patch.object(p, 'docker', return_value=result):
            with self.assertRaises(p.m.MigrationError) as error: p.live_permissions({'activeApp': 'lms-server-blue'})
            self.assertIn('permission map', str(error.exception))
            self.assertNotIn('secret', str(error.exception))
            self.assertNotIn('private-password', str(error.exception))

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
                    patch.object(p, 'unchanged_lms', side_effect=p.m.MigrationError('LMS replaced')) as check, \
                    patch.object(p, 'operator', return_value={'revoked': True}) as operator:
                p.access_command(SimpleNamespace(command='access-revoke'))
                check.assert_not_called()
                operator.assert_called_once_with({}, 'access-revoke', {'userId': 'reviewed-account'})
                self.assertFalse((directory / 'access-applied.json').exists())

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
