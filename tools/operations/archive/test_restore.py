"""Recovery preflight must refuse unsafe indexes before any network call or destination write."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("restore_evidence", Path(__file__).with_name("restore-evidence.py"))
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)


class RestoreTests(unittest.TestCase):
    def fixture(self, directory, *, malicious=False, wrong_digest=False):
        root = Path(directory)
        catalog = root / "catalog.json"
        entry = {"path": "../outside.txt" if malicious else "output/evidence.txt",
                 "bytes": 4, "sha256": "a" * 64}
        raw = json.dumps({"shardsByObjectSha256": {"a" * 64: "part-0001.tar.gz.age"},
                          "files": [entry]}).encode()
        catalog.write_bytes(raw)
        index = root / "index.json"
        index.write_text(json.dumps({
            "projectRoot": str(root),
            "archives": [{"id": "history", "catalog": "catalog.json",
                          "catalogSha256": "0" * 64 if wrong_digest else hashlib.sha256(raw).hexdigest(),
                          "remoteRoot": "/srv/bitatlas-backup/history-20261121", "shards": {}}],
        }))
        return argparse.Namespace(index=str(index), destination=str(root / "restored"), path=[entry["path"]])

    def test_changed_catalog_rejected_before_destination_or_network(self):
        with tempfile.TemporaryDirectory() as temporary:
            arguments = self.fixture(temporary, wrong_digest=True)
            with patch.object(recovery.subprocess, "Popen") as network, self.assertRaises(ValueError):
                recovery.restore(arguments)
            network.assert_not_called()
            self.assertFalse(Path(arguments.destination).exists())

    def test_traversal_in_catalog_rejected_before_destination_or_network(self):
        with tempfile.TemporaryDirectory() as temporary:
            arguments = self.fixture(temporary, malicious=True)
            with patch.object(recovery.subprocess, "Popen") as network, self.assertRaises(ValueError):
                recovery.restore(arguments)
            network.assert_not_called()
            self.assertFalse(Path(arguments.destination).exists())
            self.assertFalse((Path(temporary) / "outside.txt").exists())

    def test_existing_destination_kept_intact(self):
        with tempfile.TemporaryDirectory() as temporary:
            arguments = self.fixture(temporary)
            destination = Path(arguments.destination)
            destination.mkdir()
            protected = destination / "user-notes.txt"
            protected.write_bytes(b"original notes")
            with patch.object(recovery.subprocess, "Popen") as network, self.assertRaises(ValueError):
                recovery.restore(arguments)
            network.assert_not_called()
            self.assertEqual(protected.read_bytes(), b"original notes")


if __name__ == "__main__":
    unittest.main()
