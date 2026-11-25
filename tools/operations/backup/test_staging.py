"""Verify staging cleanup boundaries without touching real backup paths."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("run_backup", Path(__file__).with_name("run-backup.py"))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)

class StagingTests(unittest.TestCase):
    def test_only_direct_generated_directory_is_eligible(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(backup, "WORK_ROOT", Path(temporary)):
            valid = Path(temporary) / ("run-" + "a" * 32)
            valid.mkdir()
            (valid / "snapshot").mkdir()
            (valid / "snapshot/server.sqlite").write_bytes(b"fixture")
            backup.regular_tree(valid)
            for invalid in [Path(temporary), valid / "snapshot", Path(temporary) / "manual-20261122-admin"]:
                with self.assertRaises(ValueError):
                    backup.regular_tree(invalid)

    def test_symlink_and_symlink_root_rejected(self):
        with tempfile.TemporaryDirectory() as temporary, patch.object(backup, "WORK_ROOT", Path(temporary)):
            protected = Path(temporary) / "protected"
            protected.mkdir()
            (protected / "keep").write_bytes(b"retain")
            valid = Path(temporary) / ("run-" + "b" * 32)
            valid.mkdir()
            (valid / "linked").symlink_to(protected, target_is_directory=True)
            with self.assertRaises(ValueError):
                backup.regular_tree(valid)
            linked_root = Path(temporary) / ("run-" + "c" * 32)
            linked_root.symlink_to(protected, target_is_directory=True)
            with self.assertRaises(ValueError):
                backup.regular_tree(linked_root)
            self.assertEqual((protected / "keep").read_bytes(), b"retain")

if __name__ == "__main__":
    unittest.main()
