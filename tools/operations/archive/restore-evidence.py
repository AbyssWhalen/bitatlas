"""Restore explicitly selected archived paths to a new directory, verifying each full shard."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import subprocess
import tarfile
import threading
import time


def relative_path(value):
    path = PurePosixPath(value)
    if not value or path.is_absolute() or ".." in path.parts or "\\" in value or ":" in value:
        raise ValueError("Expected a safe project-relative path.")
    return path


def restore(arguments):
    index_path = Path(arguments.index).resolve()
    index = json.loads(index_path.read_text(encoding="utf-8-sig"))
    root = Path(index["projectRoot"]).resolve()
    archives, objects, files, archive_objects = {}, {}, {}, {}
    for item in index["archives"]:
        catalog_path = root / relative_path(item["catalog"])
        raw = catalog_path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != item["catalogSha256"]:
            raise ValueError("Catalog digest mismatch.")
        catalog = json.loads(raw)
        archives[item["id"]] = item
        for digest, shard in catalog["shardsByObjectSha256"].items():
            if not re.fullmatch(r"[a-f0-9]{64}", digest) or not re.fullmatch(r"part-\d{4}\.tar\.gz\.age", shard):
                raise ValueError("Invalid archive object.")
            objects[digest] = (item["id"], shard)
        for entry in catalog["files"]:
            relative_path(entry["path"])
            files[entry["path"]] = entry
            shard = catalog["shardsByObjectSha256"].get(entry["sha256"])
            if shard:
                archive_objects.setdefault((item["id"], shard), {})[entry["sha256"]] = entry["bytes"]
    selected = {name: files[name] for name in arguments.path}
    groups = {}
    for name, item in selected.items():
        groups.setdefault(objects[item["sha256"]], {})[name] = item
    display_destination = Path(arguments.destination).resolve()
    # Original Playwright artifact names can exceed Win32's legacy 260-character
    # limit when nested below a recovery directory.
    destination = Path("\\\\?\\" + str(display_destination)) if os.name == "nt" else display_destination
    if destination.exists():
        raise ValueError("Recovery destination must not already exist.")
    destination.mkdir(parents=True, mode=0o700)
    results = []
    for (archive_id, shard), requested in groups.items():
        archive = archives[archive_id]
        expected = archive["shards"][shard]
        remote = archive["remoteRoot"] + "/" + shard
        if not re.fullmatch(r"/srv/bitatlas-backup/(history-20261121|evidence-20261122)/part-\d{4}\.tar\.gz\.age", remote):
            raise ValueError("Unexpected remote archive path.")
        command = [
            "ssh", "-F", "NUL" if os.name == "nt" else "/dev/null",
            "-i", arguments.ssh_key, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=15",
            "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3",
            arguments.host, "sudo -n cat " + shlex.quote(remote),
        ]
        reader = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        decrypt = subprocess.Popen([arguments.age_binary, "--decrypt", "--identity", arguments.identity_file],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        errors, length, cipher_hash = [], [0], hashlib.sha256()

        def stop():
            for process in (reader, decrypt):
                if process.poll() is None:
                    process.kill()

        timer = threading.Timer(900, stop)
        timer.start()

        def pump():
            try:
                while chunk := reader.stdout.read(256 * 1024):
                    length[0] += len(chunk)
                    if length[0] > expected["bytes"]:
                        raise ValueError("Ciphertext exceeds recorded length.")
                    cipher_hash.update(chunk)
                    decrypt.stdin.write(chunk)
                decrypt.stdin.close()
            except Exception as error:
                errors.append(type(error).__name__)
                stop()

        worker = threading.Thread(target=pump, daemon=True)
        worker.start()
        all_expected = archive_objects[(archive_id, shard)]
        found = set()
        try:
            with tarfile.open(fileobj=decrypt.stdout, mode="r|gz") as stream:
                for member in stream:
                    if not member.isfile() or not re.fullmatch(r"objects/[a-f0-9]{64}", member.name):
                        raise ValueError("Unexpected archive entry.")
                    digest = member.name.removeprefix("objects/")
                    if digest in found or all_expected[digest] != member.size:
                        raise ValueError("Duplicate or wrong-size object.")
                    found.add(digest)
                    targets = [destination / relative_path(name) for name, item in requested.items()
                               if item["sha256"] == digest]
                    outputs = []
                    try:
                        for target in targets:
                            target.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
                            outputs.append(target.open("xb"))
                        hasher, size = hashlib.sha256(), 0
                        source = stream.extractfile(member)
                        while chunk := source.read(256 * 1024):
                            size += len(chunk)
                            hasher.update(chunk)
                            for output in outputs:
                                output.write(chunk)
                        if size != member.size or hasher.hexdigest() != digest:
                            raise ValueError("Decrypted object digest mismatch.")
                    finally:
                        for output in outputs:
                            output.close()
            while decrypt.stdout.read(256 * 1024):
                pass
            worker.join(10)
            if worker.is_alive() or errors or reader.wait(timeout=30) != 0 or decrypt.wait(timeout=30) != 0:
                raise ValueError("Authenticated stream incomplete.")
            if length[0] != expected["bytes"] or cipher_hash.hexdigest() != expected["sha256"] or found != set(all_expected):
                raise ValueError("Shard integrity mismatch.")
            for name, item in requested.items():
                target = destination / relative_path(name)
                with target.open("rb") as restored:
                    if hashlib.file_digest(restored, "sha256").hexdigest() != item["sha256"]:
                        raise ValueError("Restored file digest mismatch.")
                results.append({"path": name, "bytes": item["bytes"], "sha256": item["sha256"]})
        finally:
            timer.cancel()
            stop()
            reader.wait()
            decrypt.wait()
    receipt = {"passed": True, "restoredFiles": results, "destination": str(display_destination),
               "wholeShardsVerified": len(groups), "identityUploaded": False, "originalsOverwritten": False}
    (destination / "restore-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for option in ("index", "destination", "ssh-key", "host", "age-binary", "identity-file"):
        parser.add_argument("--" + option, required=True)
    parser.add_argument("--path", action="append", required=True)
    restore(parser.parse_args())
