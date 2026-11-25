"""Restricted encrypted-backup receiver. No shell, download, or delete operation."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import stat
import sys
import uuid

BASE = Path("/srv/bitatlas-backup/snapshots")
os.umask(0o077)
arguments = shlex.split(os.environ["SSH_ORIGINAL_COMMAND"]) if "SSH_ORIGINAL_COMMAND" in os.environ else sys.argv[1:]
if len(arguments) not in (2, 3) or arguments[0] not in ("check", "put"):
    raise SystemExit("Only check/put encrypted snapshots is supported.")
action, digest = arguments[:2]
if not re.fullmatch("[a-f0-9]{64}", digest) or len(arguments) != (3 if action == "put" else 2):
    raise SystemExit("Invalid arguments.")
if not BASE.is_dir() or BASE.is_symlink():
    raise SystemExit("Backup directory unavailable.")
destination = BASE / f"{digest}.tar.age"
receipt_path = BASE / f"{digest}.json"

def file_digest(filename):
    if not stat.S_ISREG(filename.lstat().st_mode) or filename.is_symlink():
        raise ValueError("Expected a regular file.")
    with filename.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()

with (BASE / ".receive.lock").open("a+b") as lock:
    fcntl.flock(lock, fcntl.LOCK_EX)
    if destination.exists() or destination.is_symlink():
        assert file_digest(destination) == digest
        print(json.dumps({"exists": True, "sha256": digest, "bytes": destination.stat().st_size, "path": str(destination)}))
        raise SystemExit(0)
    if action == "check":
        print(json.dumps({"exists": False}))
        raise SystemExit(0)
    size = int(arguments[2])
    if not 128 <= size <= 2 * 1024 ** 3 or shutil.disk_usage(BASE).free < size + 2 * 1024 ** 3:
        raise SystemExit("Size or free-space limit exceeded.")
    pending = BASE / f".{digest}.{uuid.uuid4().hex}.pending"
    actual, received = hashlib.sha256(), 0
    with pending.open("xb") as stream:
        while chunk := sys.stdin.buffer.read(256 * 1024):
            if received == 0 and not chunk.startswith(b"age-encryption.org/v1\n"):
                raise ValueError("Only age-encrypted input is accepted.")
            received += len(chunk)
            if received > size:
                raise ValueError("Declared size exceeded.")
            actual.update(chunk)
            stream.write(chunk)
        stream.flush()
        os.fsync(stream.fileno())
    assert received == size and actual.hexdigest() == digest
    assert not destination.exists() and not destination.is_symlink()
    pending.rename(destination)
    receipt = {"receivedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "sha256": digest, "automatic": True,
               "bytes": received, "path": str(destination), "encryptedOnly": True, "mode": "0600"}
    with receipt_path.open("x", encoding="utf-8") as stream:
        json.dump(receipt, stream, indent=2)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    directory_fd = os.open(BASE, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)
    print(json.dumps({"exists": True, **receipt}))
