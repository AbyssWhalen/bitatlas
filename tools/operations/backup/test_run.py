"""Verify orchestration failure boundaries with isolated files and simulated child processes."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("run_backup", Path(__file__).with_name("run-backup.py"))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


class RunTests(unittest.TestCase):
    def exercise(self, failure=None):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            work, status, credentials = (base / name for name in ("work", "status", "credentials"))
            for directory in (work, status, credentials):
                directory.mkdir()
            (credentials / "ssh-key").write_text("synthetic credential")
            configuration = base / "client.json"
            pinned = base / "test_hosts"
            pinned.write_bytes(b"isolated test host pin\n")
            destination = "fixture@backup.invalid"
            policy = {"host": destination, "knownHostsFile": str(pinned),
                      "knownHostsSha256": hashlib.sha256(pinned.read_bytes()).hexdigest()}
            config = {"recipient": "age1" + "a" * 58, "host": destination, "knownHostsFile": str(pinned)}
            if failure == "wrong user":
                config["host"] = "another@backup.invalid"
            if failure == "wrong host":
                config["host"] = "fixture@another.invalid"
            if failure == "wrong path":
                config["knownHostsFile"] = str(base / "other_hosts")
            if failure == "changed pin":
                pinned.write_bytes(b"unapproved host key\n")
            if failure != "missing policy":
                (credentials / "destination-policy").write_text(json.dumps(policy))
            configuration.write_text(json.dumps(config))
            previous = b'{"verified":true,"sha256":"previous-success"}\n'
            (status / "last-success.json").write_bytes(previous)
            old_failed = work / ("run-" + "f" * 32)
            old_failed.mkdir()
            (old_failed / "diagnostic").write_bytes(b"retain prior failure")
            generated = []
            checks = 0
            payload = b"age-encryption.org/v1\nsynthetic encrypted fixture"
            digest = hashlib.sha256(payload).hexdigest()

            def child(arguments, **kwargs):
                nonlocal checks
                if arguments[0].endswith("/node"):
                    directory = Path(arguments[arguments.index("--output") + 1])
                    directory.mkdir()
                    generated.append(directory)
                    (directory / "snapshot.tar.age").write_bytes(payload)
                    if failure == "snapshot":
                        raise subprocess.CalledProcessError(1, ["synthetic-generator"])
                    return subprocess.CompletedProcess(arguments, 0, json.dumps({
                        "encryptedFile": str(directory / "snapshot.tar.age"),
                        "bytes": len(payload), "sha256": digest, "objects": 1,
                    }).encode())
                if arguments[-1].startswith("check "):
                    self.assertIn("StrictHostKeyChecking=yes", arguments)
                    self.assertIn("GlobalKnownHostsFile=/dev/null", arguments)
                    self.assertIn("UserKnownHostsFile=" + str(pinned), arguments)
                    self.assertEqual(arguments[-2], destination)
                    checks += 1
                    if checks == 1:
                        return subprocess.CompletedProcess(arguments, 0, b'{"exists":false}')
                    value = {"exists": True, "sha256": "0" * 64 if failure == "verification" else digest,
                             "bytes": len(payload), "path": "/isolated/remote/snapshot.tar.age"}
                    return subprocess.CompletedProcess(arguments, 0, json.dumps(value).encode())
                self.assertTrue(arguments[-1].startswith("put "))
                self.assertEqual(kwargs["stdin"].read(), payload)
                if failure == "upload":
                    raise subprocess.CalledProcessError(1, ["synthetic-upload"])
                return subprocess.CompletedProcess(arguments, 0, b'{"exists":true}')

            with patch.object(backup, "CONFIG", configuration), patch.object(backup, "WORK_ROOT", work), \
                 patch.object(backup, "STATUS_ROOT", status), patch.dict(os.environ, {"CREDENTIALS_DIRECTORY": str(credentials)}), \
                 patch.object(backup.subprocess, "run", side_effect=child) as launched, contextlib.redirect_stdout(io.StringIO()):
                if failure in {"wrong user", "wrong host", "wrong path", "changed pin", "missing policy"}:
                    with self.assertRaises((ValueError, FileNotFoundError)):
                        backup.execute()
                    launched.assert_not_called()
                    self.assertEqual(list(work.iterdir()), [old_failed])
                    self.assertEqual((status / "last-success.json").read_bytes(), previous)
                    return
                if failure:
                    with self.assertRaises((subprocess.CalledProcessError, ValueError)):
                        backup.execute()
                else:
                    backup.execute()
            self.assertEqual(len(generated), 1)
            self.assertEqual((old_failed / "diagnostic").read_bytes(), b"retain prior failure")
            if failure:
                self.assertEqual((status / "last-success.json").read_bytes(), previous)
                self.assertEqual((generated[0] / "snapshot.tar.age").read_bytes(), payload)
                self.assertEqual(list(status.glob("run-*.json")), [])
            else:
                record = json.loads((status / "last-success.json").read_text())
                self.assertTrue(record["verified"] and record["stagingRemoved"])
                self.assertEqual(record["sha256"], digest)
                self.assertFalse(generated[0].exists())
                self.assertEqual(len(list(status.glob("run-*.json"))), 1)

    def test_success_only_removes_its_verified_staging(self):
        self.exercise()

    def test_generation_failure_preserves_staging_and_last_success(self):
        self.exercise("snapshot")

    def test_upload_failure_preserves_staging_and_last_success(self):
        self.exercise("upload")

    def test_wrong_remote_digest_preserves_staging_and_last_success(self):
        self.exercise("verification")

    def test_unapproved_destination_stops_before_snapshot(self):
        for problem in ("wrong user", "wrong host", "wrong path", "changed pin", "missing policy"):
            with self.subTest(problem=problem):
                self.exercise(problem)


if __name__ == "__main__":
    unittest.main()
