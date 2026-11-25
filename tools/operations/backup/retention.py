"""Keep seven recent backup days and four recent weeks. Dry-run unless --apply."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
from zoneinfo import ZoneInfo

BASE = Path("/srv/bitatlas-backup/snapshots")
OPERATIONS = Path("/srv/bitatlas-backup/operations")
TZ = ZoneInfo("Asia/Shanghai")
os.umask(0o077)

def selection(records):
    days, weeks, keep, candidates = set(), set(), [], []
    for item in sorted(records, key=lambda entry: (entry["receivedAt"], entry["sha256"]), reverse=True):
        instant = datetime.datetime.fromisoformat(item["receivedAt"])
        if instant.tzinfo is None:
            raise ValueError("Backup receipt must include a timezone.")
        day = instant.astimezone(TZ).date()
        week = day - datetime.timedelta(days=day.weekday())
        preserve = False
        if len(days) < 7 and day not in days:
            days.add(day)
            preserve = True
        if len(weeks) < 4 and week not in weeks:
            weeks.add(week)
            preserve = True
        (keep if preserve else candidates).append(item)
    return keep, candidates

def run(apply=False):
    if not BASE.is_dir() or BASE.is_symlink() or BASE.resolve() != BASE:
        raise ValueError("Unexpected snapshot directory.")
    with (BASE / ".receive.lock").open("a+b") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        records, protected = [], []
        for receipt in BASE.glob("*.json"):
            if not re.fullmatch(r"[a-f0-9]{64}\.json", receipt.name) or not stat.S_ISREG(receipt.lstat().st_mode):
                raise ValueError("Unexpected snapshot receipt.")
            item = json.loads(receipt.read_text(encoding="utf-8"))
            digest = receipt.stem
            archive = BASE / f"{digest}.tar.age"
            if item["sha256"] != digest or item["path"] != str(archive):
                raise ValueError("Snapshot receipt mismatch.")
            if not stat.S_ISREG(archive.lstat().st_mode) or archive.stat().st_size != item["bytes"]:
                raise ValueError("Snapshot file mismatch.")
            if item.get("automatic") is not True:
                protected.append(digest)
                continue
            records.append(item)
        keep, candidates = selection(records)
        # Verify retained snapshots too: corrupt recent copies must not displace older valid backups.
        for item in [*keep, *candidates]:
            with Path(item["path"]).open("rb") as stream:
                if hashlib.file_digest(stream, "sha256").hexdigest() != item["sha256"]:
                    raise ValueError("Expired snapshot digest mismatch.")
        record = {"at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "apply": apply,
                  "keep": [item["sha256"] for item in keep], "protectedManual": protected,
                  "candidates": candidates, "removed": []}
        if apply:
            OPERATIONS.mkdir(mode=0o700, exist_ok=True)
            log = OPERATIONS / (datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".json")
            log.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
            for item in candidates:
                archive = BASE / f"{item['sha256']}.tar.age"
                receipt = BASE / f"{item['sha256']}.json"
                archive.unlink()
                receipt.unlink()
                record["removed"].append(item["sha256"])
                log.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(record))

if __name__ == "__main__":
    if sys.argv[1:] not in ([], ["--apply"]):
        raise SystemExit("Usage: retention.py [--apply]")
    run(apply=sys.argv[1:] == ["--apply"])
