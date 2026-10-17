"""Focused regression tests for live Nginx preservation and failed enablement."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('production', ROOT / 'scripts/mcp-production.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class InstallerTests(unittest.TestCase):
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


if __name__ == '__main__': unittest.main()
