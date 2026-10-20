"""Private storage configuration tests; no real Docker, credentials, or network."""
from contextlib import ExitStack, redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('recording_host', ROOT / 'scripts/mcp-production.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class RecordingStorageTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.directory = Path(self.stack.enter_context(tempfile.TemporaryDirectory()))
        self.stack.enter_context(patch.object(p, 'STATE', self.directory))
        self.stack.enter_context(patch.object(p, 'state', return_value=dict(phase='enabled', installation='test')))
        self.stack.enter_context(patch.object(p, 'upgrade_container'))
        self.stack.enter_context(patch.object(p, 'current_lms'))
        self.stack.enter_context(patch.object(p.sys.stdin, 'isatty', return_value=True))
        self.stack.enter_context(patch.object(p.getpass, 'getpass', return_value='synthetic-read-only-key'))
        self.account = dict(applied=True, email='owner@example.test', tenantId='a' * 24)
        self.config = dict(purpose=p.MARKER, installation='test', clients=[{'scopes':['mcp_connect']}], password='db-password-unchanged')
        p.write(self.directory / 'access-applied.json', self.account)
        p.write(self.directory / 'runtime.json', self.config)
        self.args = SimpleNamespace(command='recording-storage', email='owner@example.test', storage_hostname='sg.storage.bunnycdn.com', storage_zone='existing-zone')

    def test_configuration_and_removal_preserve_scopes_account_and_db(self):
        output = io.StringIO()
        with redirect_stdout(output): p.recording_storage(self.args)
        self.assertNotIn('synthetic-read-only-key', output.getvalue())
        new = json.loads((self.directory / 'runtime.json').read_text())
        self.assertEqual(new.pop('recordingStorage')['tenantId'], self.account['tenantId'])
        self.assertEqual(new, self.config)
        self.assertEqual(json.loads((self.directory / 'access-applied.json').read_text()), self.account)
        backups = list(self.directory.glob('runtime-before-recording-storage-*.json'))
        self.assertEqual(len(backups), 1)
        self.assertEqual(backups[0].stat().st_mode & 0o777, 0o600)
        self.args.command = 'recording-storage-remove'
        with redirect_stdout(output): p.recording_storage(self.args)
        self.assertEqual(json.loads((self.directory / 'runtime.json').read_text()), self.config)

    def test_wrong_account_and_invalid_hosts_or_paths_do_not_change_config(self):
        for field, value in [('email', 'other@example.test'), ('storage_hostname', '127.0.0.1'), ('storage_hostname', 'storage.bunnycdn.com.evil.example'), ('storage_zone', '../other')]:
            old = getattr(self.args, field)
            setattr(self.args, field, value)
            with self.assertRaises(p.m.MigrationError): p.recording_storage(self.args)
            setattr(self.args, field, old)
            self.assertEqual(json.loads((self.directory / 'runtime.json').read_text()), self.config)

    def test_pending_upgrade_and_noninteractive_password_input_are_refused(self):
        p.write(self.directory / 'upgrade-pending.json', {})
        with self.assertRaises(p.m.MigrationError): p.recording_storage(self.args)
        (self.directory / 'upgrade-pending.json').unlink()
        with patch.object(p.sys.stdin, 'isatty', return_value=False):
            with self.assertRaises(p.m.MigrationError): p.recording_storage(self.args)

if __name__ == '__main__': unittest.main()
