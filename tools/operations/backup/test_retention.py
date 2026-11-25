"""Run with Linux Python: python3 -m unittest test_retention -v."""
import contextlib
import datetime
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("retention", Path(__file__).with_name("retention.py"))
retention = importlib.util.module_from_spec(spec)
spec.loader.exec_module(retention)

class RetentionTests(unittest.TestCase):
    def test_daily_and_weekly_union_is_stable(self):
        now = datetime.datetime(2026, 11, 22, 20, tzinfo=datetime.timezone.utc)
        records = [{"receivedAt": (now - datetime.timedelta(days=day, minutes=minute)).isoformat(),
                    "sha256": f"{day * 2 + minute:064x}"}
                   for day in range(60) for minute in range(2)]
        keep, candidates = retention.selection(records)
        self.assertEqual(retention.selection(list(reversed(records))), (keep, candidates))
        self.assertGreaterEqual(len(keep), 7)
        self.assertLessEqual(len(keep), 11)
        self.assertEqual(len(keep) + len(candidates), 120)
        self.assertTrue(set(item["sha256"] for item in keep).isdisjoint(item["sha256"] for item in candidates))
        days = {datetime.datetime.fromisoformat(item["receivedAt"]).astimezone(retention.TZ).date() for item in keep}
        for offset in range(7):
            self.assertIn((now.astimezone(retention.TZ) - datetime.timedelta(days=offset)).date(), days)
        self.assertEqual(len({day - datetime.timedelta(days=day.weekday()) for day in days}), 4)

    def test_beijing_date_not_utc_date(self):
        records = [{"receivedAt": "2026-11-22T15:59:00+00:00", "sha256": "a" * 64},
                   {"receivedAt": "2026-11-22T16:01:00+00:00", "sha256": "b" * 64}]
        self.assertEqual(len(retention.selection(records)[0]), 2)

    def test_naive_dates_rejected(self):
        with self.assertRaises(ValueError):
            retention.selection([{"receivedAt": "2026-11-22T15:59:00", "sha256": "a" * 64}])

    def setup_snapshots(self, temporary):
        base = Path(temporary) / "snapshots"
        base.mkdir()
        records = []
        now = datetime.datetime(2026, 11, 22, 20, tzinfo=datetime.timezone.utc)
        for index in range(45):
            body = f"synthetic-encrypted-fixture-{index}".encode()
            digest = hashlib.sha256(body).hexdigest()
            archive = base / f"{digest}.tar.age"
            archive.write_bytes(body)
            record = {"receivedAt": (now - datetime.timedelta(days=index)).isoformat(),
                      "automatic": index != 44, "sha256": digest, "bytes": len(body), "path": str(archive)}
            (base / f"{digest}.json").write_text(json.dumps(record))
            records.append(record)
        return base, records

    def test_dry_run_then_apply_preserves_manual_and_unknown(self):
        with tempfile.TemporaryDirectory() as temporary:
            base, records = self.setup_snapshots(temporary)
            pending = base / ".failed-upload.pending"
            pending.write_bytes(b"keep failed diagnostic")
            with patch.object(retention, "BASE", base), patch.object(retention, "OPERATIONS", Path(temporary) / "operations"):
                before = sorted(item.name for item in base.iterdir())
                with contextlib.redirect_stdout(io.StringIO()):
                    retention.run()
                self.assertEqual(sorted(item.name for item in base.iterdir() if item.name != ".receive.lock"), before)
                kept, candidates = retention.selection([item for item in records if item["automatic"]])
                with contextlib.redirect_stdout(io.StringIO()):
                    retention.run(apply=True)
                self.assertTrue(Path(records[-1]["path"]).is_file())
                self.assertTrue(pending.is_file())
                for item in kept:
                    self.assertTrue(Path(item["path"]).is_file())
                for item in candidates:
                    self.assertFalse(Path(item["path"]).exists())
                logs = list((Path(temporary) / "operations").glob("*.json"))
                self.assertEqual(len(logs), 1)
                self.assertEqual(len(json.loads(logs[0].read_text())["removed"]), len(candidates))

    def test_corrupt_candidate_aborts_before_any_delete(self):
        with tempfile.TemporaryDirectory() as temporary:
            base, records = self.setup_snapshots(temporary)
            body = Path(records[-2]["path"]).read_bytes()
            Path(records[-2]["path"]).write_bytes(b"x" * len(body))
            with patch.object(retention, "BASE", base), patch.object(retention, "OPERATIONS", Path(temporary) / "operations"):
                with self.assertRaises(ValueError), contextlib.redirect_stdout(io.StringIO()):
                    retention.run(apply=True)
            self.assertTrue(all(Path(item["path"]).is_file() for item in records))

    def test_linked_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            base, records = self.setup_snapshots(temporary)
            archive = Path(records[0]["path"])
            archive.unlink()
            archive.symlink_to(Path(records[1]["path"]))
            with patch.object(retention, "BASE", base), self.assertRaises(ValueError):
                retention.run(apply=True)
            self.assertTrue(Path(records[1]["path"]).is_file())

    def test_corrupt_newest_does_not_displace_older_valid_backups(self):
        with tempfile.TemporaryDirectory() as temporary:
            base, records = self.setup_snapshots(temporary)
            newest = Path(records[0]["path"])
            newest.write_bytes(b"x" * newest.stat().st_size)
            with patch.object(retention, "BASE", base), patch.object(retention, "OPERATIONS", Path(temporary) / "operations"):
                with self.assertRaises(ValueError), contextlib.redirect_stdout(io.StringIO()):
                    retention.run(apply=True)
            self.assertTrue(all(Path(item["path"]).is_file() for item in records))

if __name__ == "__main__":
    unittest.main()
