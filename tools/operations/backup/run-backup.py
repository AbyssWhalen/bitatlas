"""Linux-only daily encrypted backup. Enable only after the documented approval."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import uuid

CONFIG = Path("/srv/bitatlas/backup/client.json")
WORK_ROOT = Path("/var/lib/bitatlas-backup-work")
STATUS_ROOT = Path("/var/lib/bitatlas-backups/automatic")
os.umask(0o077)

def regular_tree(folder):
    if folder.parent != WORK_ROOT or not re.fullmatch(r"run-[a-f0-9]{32}", folder.name):
        raise ValueError("Unexpected staging path.")
    for current, directories, files in os.walk(folder, followlinks=False):
        for name in [*directories, *files]:
            info = (Path(current) / name).lstat()
            if not (stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode)):
                raise ValueError("Staging contains a link or special file.")
    if folder.is_symlink() or folder.resolve().parent != WORK_ROOT.resolve():
        raise ValueError("Staging containment check failed.")

def execute():
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    if set(config) != {"recipient", "host", "knownHostsFile"}:
        raise ValueError("Unexpected backup configuration.")
    if not re.fullmatch(r"age1[a-z0-9]{58}", config["recipient"]):
        raise ValueError("Invalid public recipient.")
    credentials = Path(os.environ["CREDENTIALS_DIRECTORY"])
    policy = json.loads((credentials / "destination-policy").read_text(encoding="utf-8"))
    if set(policy) != {"host", "knownHostsFile", "knownHostsSha256"}:
        raise ValueError("Invalid approved destination policy.")
    if (not re.fullmatch(r"[a-z_][a-z0-9_-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*", policy["host"])
            or config["host"] != policy["host"] or config["knownHostsFile"] != policy["knownHostsFile"]):
        raise ValueError("Unexpected destination.")
    pinned_hosts = Path(policy["knownHostsFile"])
    if (not pinned_hosts.is_absolute() or pinned_hosts.is_symlink() or not pinned_hosts.is_file()
            or not re.fullmatch(r"[0-9a-f]{64}", policy["knownHostsSha256"])
            or hashlib.sha256(pinned_hosts.read_bytes()).hexdigest() != policy["knownHostsSha256"]):
        raise ValueError("Approved SSH host keys unavailable or changed.")
    for directory in (WORK_ROOT, STATUS_ROOT):
        if not directory.is_dir() or directory.is_symlink():
            raise ValueError("Backup directory unavailable.")
    if shutil.disk_usage(WORK_ROOT).free < 2 * 1024 ** 3:
        raise ValueError("Less than 2 GiB free; no snapshot was started.")
    identity = credentials / "ssh-key"
    if not identity.is_file():
        raise ValueError("Dedicated SSH credential unavailable.")
    ssh = ["ssh", "-F", "/dev/null", "-i", str(identity), "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes",
           "-o", "StrictHostKeyChecking=yes", "-o", "GlobalKnownHostsFile=/dev/null", "-o", "UpdateHostKeys=no",
           "-o", f"UserKnownHostsFile={pinned_hosts}",
           "-o", "ConnectTimeout=15", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3", config["host"]]
    with (WORK_ROOT / ".run.lock").open("a+b") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        work = WORK_ROOT / ("run-" + uuid.uuid4().hex)
        environment = {**os.environ, "BITATLAS_AGE_BINARY": "/srv/bitatlas/runtime/age-1.3.2/age/age"}
        generated = subprocess.run(
            ["/srv/bitatlas/runtime/node-v24.14.0-linux-x64/bin/node", "--import", "tsx", "src/backup-cli.ts",
             "create", "--data", "/var/lib/bitatlas", "--output", str(work), "--recipient", config["recipient"]],
            cwd="/srv/bitatlas/current/apps/server", env=environment, capture_output=True, check=True, timeout=300,
        )
        receipt = json.loads(generated.stdout)
        archive = work / "snapshot.tar.age"
        if receipt["encryptedFile"] != str(archive) or not re.fullmatch("[a-f0-9]{64}", receipt["sha256"]):
            raise ValueError("Unexpected snapshot receipt.")
        with archive.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != receipt["sha256"]:
                raise ValueError("Snapshot digest changed.")
        digest, size = receipt["sha256"], archive.stat().st_size
        if receipt["bytes"] != size:
            raise ValueError("Snapshot size changed.")
        check = subprocess.run([*ssh, f"check {digest}"], capture_output=True, check=True, timeout=120)
        remote = json.loads(check.stdout)
        if not remote["exists"]:
            with archive.open("rb") as stream:
                uploaded = subprocess.run([*ssh, f"put {digest} {size}"], stdin=stream, capture_output=True, check=True, timeout=900)
            remote = json.loads(uploaded.stdout)
        check = subprocess.run([*ssh, f"check {digest}"], capture_output=True, check=True, timeout=120)
        remote = json.loads(check.stdout)
        if not remote["exists"] or remote["sha256"] != digest or remote["bytes"] != size:
            raise ValueError("Independent copy verification failed.")
        record = {"completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  "sha256": digest, "bytes": size, "objects": receipt["objects"], "destination": remote["path"],
                  "verified": True, "privateIdentityOnSource": False, "staging": str(work), "stagingRemoved": False}
        status = STATUS_ROOT / f"{work.name}.json"
        status.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        # Only a newly generated, fully verified run can be removed. Never prune old evidence here.
        regular_tree(work)
        shutil.rmtree(work)
        record["stagingRemoved"] = True
        status.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        pending = STATUS_ROOT / ".last-success.pending"
        pending.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        pending.replace(STATUS_ROOT / "last-success.json")
        print(json.dumps(record))

if __name__ == "__main__":
    try:
        execute()
    except Exception as error:
        # Do not echo child arguments, key material, database payloads, or source credentials.
        print(json.dumps({"success": False, "errorType": type(error).__name__, "failedStagingRetained": True}), file=sys.stderr)
        raise SystemExit(1)
