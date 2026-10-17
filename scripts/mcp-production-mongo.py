#!/usr/bin/env python3
"""Backed-up, separately invokable migration of the existing LMS MongoDB.

No application deploy, permission grants, seeding, credential rotation or data-volume
replacement. See docs/runbooks/mcp-production-mongo.md before running migrate.
Docker output and inspect environment values are deliberately never echoed.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request


class MigrationError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise MigrationError(message)


def run(args, *, timeout=180, check=True):
    result = subprocess.run([str(a) for a in args], text=True, capture_output=True, timeout=timeout)
    if check and result.returncode:
        # Docker/Compose errors can echo expanded environment values. Never print them.
        raise MigrationError("An operator command failed; no credentials or command output were printed.")
    return result


def docker(*args, **kwargs):
    return run(["docker", *args], **kwargs)


def inspect(name):
    result = docker("inspect", name, check=False)
    return json.loads(result.stdout)[0] if result.returncode == 0 else None


def private_write(path, content):
    path = Path(path)
    require(not path.is_symlink(), "Refusing a symlink for an operator file.")
    fd, temporary = tempfile.mkstemp(prefix=".mcp-write-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def save_state(state):
    private_write(Path(state["directory"]) / "state.json", json.dumps(state, indent=2))


AUTH = r"""
const fs = require('fs');
const secret = key => process.env[key] || (process.env[key + '_FILE'] ? fs.readFileSync(process.env[key + '_FILE'], 'utf8').trim() : '');
const admin = db.getSiblingDB('admin');
if (!secret('MONGO_INITDB_ROOT_USERNAME') || !secret('MONGO_INITDB_ROOT_PASSWORD')) throw new Error('missing credentials');
if (!admin.auth(secret('MONGO_INITDB_ROOT_USERNAME'), secret('MONGO_INITDB_ROOT_PASSWORD')).ok) throw new Error('authentication failed');
"""


def mongo(name, body, *, timeout=40):
    script = "try {\n" + AUTH + "\n" + body + "\n} catch (_) { print('MIGRATION_CHECK_FAILED'); quit(2); }"
    uri = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=3000&connectTimeoutMS=3000"
    result = docker("exec", name, "mongosh", uri, "--quiet", "--norc", "--eval", script, timeout=timeout)
    lines = [line[len("MIGRATION_JSON="):] for line in result.stdout.splitlines() if line.startswith("MIGRATION_JSON=")]
    require(len(lines) == 1, "MongoDB did not return a valid migration-check result.")
    return json.loads(lines[0])


def status(name):
    return mongo(name, """
const h = admin.runCommand({hello:1});
const opts = admin.runCommand({getCmdLineOpts:1});
const info = admin.runCommand({buildInfo:1});
if (!h.ok || !opts.ok || !info.ok) throw new Error('admin checks failed');
print('MIGRATION_JSON=' + JSON.stringify({version:info.version, replicaSet:h.setName || null,
  primary:h.isWritablePrimary === true, hosts:h.hosts || [],
  authorization:opts.parsed.security && opts.parsed.security.authorization,
  keyFile:!!(opts.parsed.security && opts.parsed.security.keyFile),
  dbPath:(opts.parsed.storage && opts.parsed.storage.dbPath) || '/data/db'}));
""")


def wait_mongo(name, *, replica=None, hostname=None):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            result = status(name)
            if result["primary"] and result["replicaSet"] == replica:
                if hostname:
                    require(result["hosts"] == [hostname + ":27017"], "Unexpected replica-set membership.")
                return result
        except (MigrationError, subprocess.TimeoutExpired):
            pass
        time.sleep(1)
    raise MigrationError("MongoDB did not reach the expected authenticated writable state within 90 seconds.")


def data_check(name, database):
    return mongo(name, """
const target = db.getSiblingDB(%s);
const names = target.getCollectionNames().sort();
const counts = {};
for (const name of ['users','tenants','roles','batches']) {
  counts[name] = target.getCollection(name).countDocuments({}, {maxTimeMS:15000});
}
const indexes = names.map(name => [name, target.getCollection(name).getIndexes()]);
const digest = require('crypto').createHash('sha256').update(JSON.stringify(indexes)).digest('hex');
print('MIGRATION_JSON=' + JSON.stringify({counts, indexes:digest, collections:names.length}));
""" % json.dumps(database), timeout=120)


def initiate(name, replica, hostname):
    deadline = time.monotonic() + 90
    while True:
        try:
            status(name)
            break
        except (MigrationError, subprocess.TimeoutExpired):
            require(time.monotonic() < deadline, "MongoDB did not become available for replica-set initialization.")
            time.sleep(1)
    mongo(name, """
const h = admin.runCommand({hello:1});
if (!h.setName) {
  const result = admin.runCommand({replSetInitiate:{_id:%s, members:[{_id:0,host:%s}]}});
  if (!result.ok) throw new Error('initiation failed');
} else if (h.setName !== %s) throw new Error('unexpected replica set');
print('MIGRATION_JSON=true');
""" % (json.dumps(replica), json.dumps(hostname + ":27017"), json.dumps(replica)))
    result = wait_mongo(name, replica=replica, hostname=hostname)
    require(result["authorization"] == "enabled" and result["keyFile"], "Replica-set authentication is not enabled.")


def transaction_check(name, database):
    # Reads existing data inside a real transaction. No probe documents in production.
    mongo(name, """
const session = db.getMongo().startSession();
try {
  session.startTransaction({readConcern:{level:'snapshot'}, writeConcern:{w:'majority'}});
  session.getDatabase(%s).getCollection('users').findOne({}, {_id:1});
  session.commitTransaction();
} finally { session.endSession(); }
const rw = admin.runCommand({getDefaultRWConcern:1});
if (!rw.ok || rw.defaultWriteConcern.w !== 'majority') throw new Error('majority writes required');
print('MIGRATION_JSON=true');
""" % json.dumps(database))


def compose(state, *args, override=None):
    command = ["docker", "compose", "--project-directory", state["app_dir"], "-p", state["project"], "-f", state["base_file"]]
    if override:
        command += ["-f", str(override)]
    return run(command + list(args), timeout=240)


def override_text(state, *, replica):
    command = list(state["original_command"])
    if "--auth" not in command:
        command.append("--auth")
    if not any(arg.startswith("--bind_ip") for arg in command):
        command.append("--bind_ip_all")
    mounts = [{"type":"volume", "source":"mcp_existing_data", "target":"/data/db"}]
    volumes = {"mcp_existing_data":{"external":True, "name":state["data_volume"]}}
    if state.get("config_volume"):
        mounts.append({"type":"volume", "source":"mcp_existing_config", "target":"/data/configdb"})
        volumes["mcp_existing_config"] = {"external":True, "name":state["config_volume"]}
    if replica:
        command += ["--replSet", state["replica"], "--keyFile", "/run/mcp-mongo-keyfile"]
        mounts.append({"type":"bind", "source":state["key_file"], "target":"/run/mcp-mongo-keyfile", "read_only":True})
    # !override replaces the port list, rather than accidentally retaining a public binding.
    return ("# Generated by scripts/mcp-production-mongo.py; operator state, keep local.\n"
            + "services:\n  mongodb:\n    image: " + json.dumps(state["image"]) + "\n"
            + "    command: " + json.dumps(command) + "\n"
            + "    ports: !override " + json.dumps(["127.0.0.1:" + str(state["host_port"]) + ":27017"]) + "\n"
            + "    volumes: " + json.dumps(mounts) + "\n"
            + "volumes: " + json.dumps(volumes) + "\n")


def preflight(args):
    app = Path(args.app_dir).resolve()
    base = app / "docker-compose.yml"
    require(base.is_file(), "Production docker-compose.yml was not found.")
    require(not any((app / name).exists() for name in ["compose.yaml", "compose.yml", "compose.override.yaml", "compose.override.yml", "docker-compose.override.yaml", "docker-compose.override.yml"]),
            "An additional Compose file exists; review it before merging a migration override.")
    container = inspect(args.mongo_container)
    require(container and container["State"]["Running"], "The expected production MongoDB container is not running.")
    require(container["Image"] == args.expected_image, "Running MongoDB image changed; review the new image before migrating.")
    labels = container["Config"].get("Labels") or {}
    require(labels.get("com.docker.compose.service") == "mongodb", "Unexpected MongoDB Compose service.")
    require(labels.get("com.docker.compose.project.config_files") == str(base), "Unexpected live Compose files.")
    require(labels.get("com.docker.compose.project.working_dir") == str(app), "Unexpected Compose working directory.")
    mounts = {item["Destination"]:item for item in container["Mounts"]}
    data = mounts.get("/data/db", {})
    require(data.get("Type") == "volume" and data.get("Name") == args.expected_volume, "The data volume differs from the inspected production volume.")
    require(set(mounts) <= {"/data/db", "/data/configdb"}, "Additional MongoDB mounts need review before migration.")
    config_mount = mounts.get("/data/configdb")
    require(not config_mount or config_mount["Type"] == "volume", "Unexpected configdb storage.")
    original = container["Config"].get("Cmd") or []
    require(original and original[0] == "mongod", "Unexpected MongoDB command; review before migration.")
    require(not any(arg.startswith(("--replSet", "--keyFile", "--config", "--noauth")) for arg in original), "Custom MongoDB configuration needs review.")
    version = status(args.mongo_container)
    require(version["version"] == args.expected_version, "MongoDB version changed; review before migration.")
    require(not version["replicaSet"] and not version["keyFile"], "MongoDB is already configured for replication; do not rerun a standalone migration.")
    require(version["authorization"] == "enabled" and version["dbPath"] == "/data/db", "MongoDB must have authentication enabled and use the inspected data path.")
    require(mongo(args.mongo_container, "print('MIGRATION_JSON=' + db.getSiblingDB('local').system.replset.countDocuments({}));") == 0,
            "Previous replica-set metadata exists; review it before another conversion.")
    state = {"app_dir":str(app), "base_file":str(base), "project":labels["com.docker.compose.project"],
             "mongo":args.mongo_container, "image":container["Image"], "version":version["version"],
             "data_volume":data["Name"], "config_volume":config_mount["Name"] if config_mount else None,
             "original_command":original, "replica":"lms-rs0", "hostname":"mongodb", "database":"lms-saas",
             "host_port":args.host_port, "health_url":args.health_url, "dependents":[], "dependent_ids":{},
             "dependent_candidates":args.dependents, "phase":"planned"}
    rendered = json.loads(compose(state, "config", "--format", "json").stdout)
    service = rendered["services"].get("mongodb", {})
    require(service.get("container_name") == args.mongo_container, "Compose would target a different MongoDB container.")
    configured_data = next((v for v in service.get("volumes", []) if v["target"] == "/data/db"), {})
    configured_volume = rendered.get("volumes", {}).get(configured_data.get("source"), {}).get("name")
    require(configured_volume == data["Name"], "Compose would use a different data volume.")
    environment = dict(value.split("=", 1) for value in container["Config"]["Env"] if "=" in value)
    for key in ["MONGO_INITDB_ROOT_USERNAME", "MONGO_INITDB_ROOT_PASSWORD"]:
        require(environment.get(key) and "\n" not in environment[key] and "\r" not in environment[key], "Root credentials must be configured as single-line container environment values.")
        require(service.get("environment", {}).get(key) == environment[key], "Compose credentials differ from the running authenticated MongoDB container.")
    for name in args.dependents:
        dependent = inspect(name)
        if dependent and dependent["State"]["Running"]:
            state["dependents"].append(name)
            state["dependent_ids"][name] = dependent["Id"]
    require(state["dependents"], "No expected dependent services were found running.")
    # Check an image-owned UID, never assume the host's mongodb account exists.
    state["mongo_uid"] = int(docker("exec", args.mongo_container, "id", "-u", "mongodb").stdout.strip())
    state["mongo_gid"] = int(docker("exec", args.mongo_container, "id", "-g", "mongodb").stdout.strip())
    size = int(docker("exec", args.mongo_container, "du", "-sb", "/data/db").stdout.split()[0])
    root = Path(args.state_root).resolve()
    require(root != app and app not in root.parents, "Backups and credentials must be stored outside the application checkout.")
    free = shutil.disk_usage(root if root.exists() else root.parent).free
    require(free > 3 * size + 1024**3, "Insufficient backup and rehearsal disk space.")
    wait_health(state)
    print(json.dumps({"mongoVersion":state["version"], "image":state["image"], "dataVolume":state["data_volume"],
                      "dataMiB":round(size/1024**2), "freeGiB":round(free/1024**3), "pauseServices":state["dependents"],
                      "replicaSet":state["replica"], "databasePort":"127.0.0.1:" + str(args.host_port)}, indent=2), flush=True)
    return state, environment, container


def wait_health(state):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(state["health_url"], timeout=4) as response:
                if response.status == 200:
                    return
        except Exception:
            pass
        time.sleep(1)
    raise MigrationError("LMS readiness did not recover within 90 seconds.")


def start_dependents(state):
    docker("start", *state["dependents"])
    wait_health(state)


def assert_runtime(state):
    live = inspect(state["mongo"])
    require(live and live["Image"] == state["image"], "MongoDB image changed during the migration.")
    data = next((m for m in live["Mounts"] if m["Destination"] == "/data/db"), {})
    require(data.get("Name") == state["data_volume"], "MongoDB data volume changed during the migration.")
    ports = live["HostConfig"].get("PortBindings") or {}
    require(ports == {"27017/tcp":[{"HostIp":"127.0.0.1", "HostPort":str(state["host_port"])}]}, "MongoDB ports are not restricted to the expected localhost binding.")


def rollback(state):
    # A later blue/green deployment needs its own rollback review. Never stop an
    # outdated slot list and alter a database underneath a newly deployed app.
    for name in state["dependent_candidates"]:
        live = inspect(name)
        if name in state["dependent_ids"]:
            require(live and live["Id"] == state["dependent_ids"][name], "Application containers changed since migration; review rollback with the current deployment.")
        else:
            require(not live or not live["State"]["Running"], "An additional application slot is running; review rollback with the current deployment.")
    print("Rolling back MongoDB configuration on the SAME live data volume; no backup restore.", flush=True)
    state["phase"] = "rolling-back"
    save_state(state)
    docker("stop", "--time", "60", *state["dependents"])
    live = inspect(state["mongo"])
    if live:
        require(next((m.get("Name") for m in live["Mounts"] if m["Destination"] == "/data/db"), None) == state["data_volume"],
                "Refusing rollback against a changed data volume.")
        docker("stop", "--time", "120", state["mongo"])
    require(docker("volume", "inspect", state["data_volume"], check=False).returncode == 0, "Original data volume is missing; manual recovery is required.")
    private_write(Path(state["app_dir"]) / "docker-compose.override.yml", override_text(state, replica=False))
    compose(state, "up", "-d", "--no-deps", "--no-build", "--pull", "never", "mongodb", override=Path(state["app_dir"]) / "docker-compose.override.yml")
    wait_mongo(state["mongo"])
    assert_runtime(state)
    start_dependents(state)
    state["phase"] = "rolled-back"
    save_state(state)
    print("PASS: standalone MongoDB and LMS readiness restored; existing data and localhost binding retained.", flush=True)


def migrate(args):
    require(os.geteuid() == 0, "Run the migration as root so backup and keyfile permissions can be protected.")
    state, environment, container = preflight(args)
    root = Path(args.state_root).resolve()
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    require(root.stat().st_uid == 0 and root.stat().st_mode & 0o077 == 0, "Migration state directory must be root-owned with mode 700.")
    directory = root / time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    directory.mkdir(mode=0o700)
    state.update(directory=str(directory), key_file=str(directory / "mongo-keyfile"))
    save_state(state)
    private_write(directory / "mongo.inspect.json", json.dumps(container))
    for source, name in [(Path(state["base_file"]), "docker-compose.before.yml"), (Path(state["app_dir"]) / ".env", "compose.env.before"),
                         (Path(state["app_dir"]) / "server/.env", "server.env.before"), (Path(state["app_dir"]) / "deploy-image.sh", "deploy-image.before.sh")]:
        if source.is_file():
            private_write(directory / name, source.read_text())
    private_write(state["key_file"], base64.b64encode(os.urandom(756)).decode() + "\n")
    os.chown(state["key_file"], state["mongo_uid"], state["mongo_gid"])
    os.chmod(state["key_file"], 0o400)
    private_write(directory / "verify.env", "\n".join(k + "=" + environment[k] for k in ["MONGO_INITDB_ROOT_USERNAME", "MONGO_INITDB_ROOT_PASSWORD"]) + "\n")
    candidate = directory / "replica.override.yml"
    private_write(candidate, override_text(state, replica=True))
    compose(state, "config", "--quiet", override=candidate)
    state["baseline"] = data_check(state["mongo"], state["database"])
    require(state["baseline"]["counts"]["users"] > 0, "No LMS users found; refusing to migrate an unexpected database.")
    verify_name = state["project"] + "-mcp-verify-" + str(os.getpid())
    verify_volume = verify_name + "-data"
    paused = applied = False
    verify_owned = volume_owned = False
    try:
        print("Starting maintenance: pausing LMS and legacy MCP clients, then stopping MongoDB cleanly.", flush=True)
        paused = True
        docker("stop", "--time", "60", *state["dependents"])
        state["baseline"] = data_check(state["mongo"], state["database"])
        docker("stop", "--time", "120", state["mongo"])
        require(inspect(state["mongo"])["State"]["ExitCode"] == 0, "MongoDB did not stop cleanly; no conversion attempted.")
        state["phase"] = "stopped"
        save_state(state)
        print("Creating a cold backup of the existing volume.", flush=True)
        docker("run", "--rm", "--network", "none", "--user", "0:0", "--entrypoint", "tar",
               "--mount", "type=volume,src=" + state["data_volume"] + ",dst=/source,readonly",
               "--mount", "type=bind,src=" + str(directory) + ",dst=/backup", state["image"],
               "--numeric-owner", "-czpf", "/backup/mongo-data.tar.gz", "-C", "/source", ".", timeout=1800)
        archive = directory / "mongo-data.tar.gz"
        os.chmod(archive, 0o600)
        require(archive.stat().st_size > 0, "The backup archive is empty.")
        with archive.open("rb") as handle:
            digest = hashlib.sha256()
            for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                digest.update(chunk)
            state["backup_sha256"] = digest.hexdigest()
        private_write(directory / "mongo-data.tar.gz.sha256", state["backup_sha256"] + "  mongo-data.tar.gz\n")
        state["phase"] = "backed-up"
        save_state(state)
        print("Restoring the backup into an isolated disposable volume and rehearsing the conversion.", flush=True)
        require(not inspect(verify_name), "Verification container name is already in use.")
        require(docker("volume", "inspect", verify_volume, check=False).returncode != 0, "Verification volume name is already in use.")
        docker("volume", "create", verify_volume)
        volume_owned = True
        docker("run", "--rm", "--network", "none", "--user", "0:0", "--entrypoint", "tar",
               "--mount", "type=volume,src=" + verify_volume + ",dst=/restore",
               "--mount", "type=bind,src=" + str(directory) + ",dst=/backup,readonly", state["image"],
               "--numeric-owner", "-xzpf", "/backup/mongo-data.tar.gz", "-C", "/restore", timeout=1800)
        def start_verify(replica=False):
            nonlocal verify_owned
            command = ["run", "-d", "--name", verify_name, "--network", "none", "--env-file", directory / "verify.env",
                       "--mount", "type=volume,src=" + verify_volume + ",dst=/data/db",
                       "--mount", "type=bind,src=" + state["key_file"] + ",dst=/run/mcp-mongo-keyfile,readonly",
                       state["image"], "mongod", "--auth", "--bind_ip", "127.0.0.1", "--setParameter", "ttlMonitorEnabled=false"]
            if replica:
                command += ["--replSet", state["replica"], "--keyFile", "/run/mcp-mongo-keyfile"]
            docker(*command)
            verify_owned = True
        start_verify()
        wait_mongo(verify_name)
        require(data_check(verify_name, state["database"]) == state["baseline"], "Restored LMS counts/indexes differ from the stopped source database.")
        docker("stop", "--time", "120", verify_name)
        docker("rm", verify_name)
        start_verify(replica=True)
        initiate(verify_name, state["replica"], "localhost")
        transaction_check(verify_name, state["database"])
        require(data_check(verify_name, state["database"]) == state["baseline"], "Rehearsal changed existing LMS counts/indexes.")
        docker("stop", "--time", "120", verify_name)
        docker("rm", verify_name)
        docker("volume", "rm", verify_volume)
        state["phase"] = "rehearsed"
        save_state(state)
        print("PASS: backup restore, retained credentials/data/indexes, and replica-set transaction rehearsal.", flush=True)
        private_write(Path(state["app_dir"]) / "docker-compose.override.yml", candidate.read_text())
        applied = True
        state["phase"] = "applying"
        save_state(state)
        compose(state, "up", "-d", "--no-deps", "--no-build", "--pull", "never", "mongodb", override=Path(state["app_dir"]) / "docker-compose.override.yml")
        initiate(state["mongo"], state["replica"], state["hostname"])
        transaction_check(state["mongo"], state["database"])
        require(data_check(state["mongo"], state["database"]) == state["baseline"], "Production LMS counts/indexes changed unexpectedly during maintenance.")
        assert_runtime(state)
        start_dependents(state)
        state["phase"] = "completed"
        save_state(state)
        print("PASS: existing production volume, pinned MongoDB image, authenticated replica set, majority transactions, localhost port and LMS readiness.", flush=True)
        print("Backup and rollback state: " + str(directory), flush=True)
        print("MCP remains disabled. This command did not deploy application code or grant permissions.", flush=True)
    except (Exception, KeyboardInterrupt):
        print("Migration stopped. Recovering the existing service configuration.", flush=True)
        if applied:
            rollback(state)
        elif paused:
            docker("start", state["mongo"])
            wait_mongo(state["mongo"])
            start_dependents(state)
            state["phase"] = "aborted-before-conversion"
            save_state(state)
        raise
    finally:
        # ONLY disposable verification resources. Never remove a production volume.
        if verify_owned and inspect(verify_name):
            docker("rm", "-f", verify_name, check=False)
        if volume_owned:
            docker("volume", "rm", verify_volume, check=False)
        (directory / "verify.env").unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["plan", "migrate", "rollback"])
    parser.add_argument("--app-dir", default="/root/lms")
    parser.add_argument("--state-root", default="/root/lms-mcp-production")
    parser.add_argument("--state-dir", help="Exact directory printed by a previous migration; required for rollback")
    parser.add_argument("--mongo-container", default="lms-mongodb")
    parser.add_argument("--expected-volume", default="lms_mongodb_data")
    parser.add_argument("--expected-image", default="sha256:d65a15bd109e970d7dab5496d0a4254705793b8a5c49e344aa6126d46b0e4630")
    parser.add_argument("--expected-version", default="8.2.7")
    parser.add_argument("--host-port", type=int, default=27017)
    parser.add_argument("--health-url", default="http://127.0.0.1:5001/api/health")
    parser.add_argument("--dependent", action="append", dest="dependents")
    args = parser.parse_args()
    args.dependents = args.dependents or ["lms-server-blue", "lms-server-green", "codebegun-mcp"]
    if args.action == "plan":
        preflight(args)
        print("Read-only plan passed. migrate will interrupt the LMS for backup, rehearsal and conversion.")
    elif args.action == "migrate":
        migrate(args)
    else:
        require(os.geteuid() == 0 and args.state_dir, "Rollback requires root and --state-dir from the migration output.")
        state_file = Path(args.state_dir).resolve() / "state.json"
        require(state_file.is_file() and state_file.stat().st_uid == 0 and state_file.stat().st_mode & 0o077 == 0, "Rollback state must be root-owned and private.")
        state = json.loads(state_file.read_text())
        require(state["phase"] in ["completed", "applying", "rolling-back"], "This migration state does not require configuration rollback.")
        rollback(state)


if __name__ == "__main__":
    os.umask(0o077)
    try:
        main()
    except (MigrationError, subprocess.TimeoutExpired) as error:
        print("STOP: " + (str(error) if isinstance(error, MigrationError) else "An operator command timed out; inspect migration state before retrying."), file=sys.stderr)
        sys.exit(1)
    except (Exception, KeyboardInterrupt):
        print("STOP: migration did not complete; inspect the protected state directory. No credentials were printed.", file=sys.stderr)
        sys.exit(1)
