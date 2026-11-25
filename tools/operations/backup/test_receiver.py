"""Exercise restricted receiver subprocesses against disposable Linux fixtures."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SOURCE = Path(__file__).with_name("receive-backup.py").read_text(encoding="utf-8")

class ReceiverTests(unittest.TestCase):
    def invoke(self, base, command, body=b""):
        # Only substitute the fixed storage root in an isolated child, never the live receiver.
        script = SOURCE.replace('BASE = Path("/srv/bitatlas-backup/snapshots")', f"BASE = Path({str(base)!r})")
        return subprocess.run(["python3", "-c", script], input=body, capture_output=True,
                              env={**os.environ, "SSH_ORIGINAL_COMMAND": command}, timeout=10)

    def test_roundtrip_and_duplicate_do_not_overwrite(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            body = b"age-encryption.org/v1\n" + b"x" * 256
            digest = hashlib.sha256(body).hexdigest()
            self.assertEqual(json.loads(self.invoke(base, f"check {digest}").stdout), {"exists": False})
            first = self.invoke(base, f"put {digest} {len(body)}", body)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertEqual(json.loads(first.stdout)["sha256"], digest)
            second = self.invoke(base, f"put {digest} {len(body)}", b"invalid")
            self.assertEqual(second.returncode, 0)
            self.assertEqual((base / f"{digest}.tar.age").read_bytes(), body)
            self.assertEqual((base / f"{digest}.tar.age").stat().st_mode & 0o777, 0o600)
            self.assertTrue(json.loads((base / f"{digest}.json").read_text())["automatic"])

    def test_plaintext_and_digest_mismatch_not_published(self):
        for body in [b"plaintext\n" + b"x" * 256, b"age-encryption.org/v1\n" + b"x" * 256]:
            with self.subTest(body=body[:10]), tempfile.TemporaryDirectory() as temporary:
                base = Path(temporary)
                result = self.invoke(base, f"put {'a' * 64} {len(body)}", body)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(list(base.glob("*.tar.age")), [])
                self.assertTrue(list(base.glob("*.pending")))

    def test_shell_download_delete_and_traversal_commands_rejected(self):
        for command in ["sh", "cat /etc/passwd", "rm anything", "check ../../etc/passwd",
                        f"check {'a' * 64};id", f"put {'a' * 64} 9000000000", f"put {'a' * 64} -1"]:
            with self.subTest(command=command), tempfile.TemporaryDirectory() as temporary:
                self.assertNotEqual(self.invoke(Path(temporary), command).returncode, 0)

    def test_existing_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            base = Path(temporary)
            unrelated = base / "protected"
            unrelated.write_bytes(b"original")
            (base / f"{'a' * 64}.tar.age").symlink_to(unrelated)
            self.assertNotEqual(self.invoke(base, f"check {'a' * 64}").returncode, 0)
            self.assertEqual(unrelated.read_bytes(), b"original")

if __name__ == "__main__":
    unittest.main()
