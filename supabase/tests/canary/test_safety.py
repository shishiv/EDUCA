"""Exercise the shell entry points with a recording psql stub, never a database."""

import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[3]
CANARY = ROOT / "supabase" / "canary"


class CanarySafetyTest(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory(prefix="educa-canary-safety-")
        self.addCleanup(self.workspace.cleanup)
        self.directory = Path(self.workspace.name)
        self.bin = self.directory / "bin"
        self.bin.mkdir()
        self.calls = self.directory / "psql.jsonl"
        self.env = {key: value for key, value in os.environ.items() if not key.startswith("PG")}
        self.env.update(
            PATH=f"{self.bin}:{os.environ['PATH']}",
            CANARY_TARGET="local-synthetic",
            CANARY_DATA_MODE="synthetic",
            PILOT_EXTERNAL_DEPLOY_APPROVED="false",
            CANARY_STUB_CALLS=str(self.calls),
            CANARY_STUB_ADDRESS="127.0.0.1",
        )
        for command in ("initdb", "pg_ctl", "pg_dump", "pg_restore", "createdb"):
            self.stub(command, "#!/bin/sh\nexit 0\n")
        self.stub("psql", f"""#!{sys.executable}
import json, os, sys
with open(os.environ['CANARY_STUB_CALLS'], 'a') as output:
    output.write(json.dumps(sys.argv[1:]) + '\\n')
if '-c' in sys.argv:
    print(os.environ['CANARY_STUB_ADDRESS'])
""")

    def stub(self, name, content):
        command = self.bin / name
        command.write_text(content)
        command.chmod(0o755)

    def run_entry(self, entry, url="postgresql://postgres@127.0.0.1:5432/postgres", **env):
        self.calls.unlink(missing_ok=True)
        return subprocess.run(
            ["/bin/bash", str(entry)],
            env={**self.env, "DB_URL": url, **env},
            text=True,
            capture_output=True,
            timeout=10,
            check=False,
        )

    def recorded_calls(self):
        if not self.calls.exists():
            return []
        return [json.loads(line) for line in self.calls.read_text().splitlines()]

    def test_remote_url_never_reaches_probe(self):
        for entry in ("setup", "rollback"):
            with self.subTest(entry=entry):
                result = self.run_entry(
                    CANARY / f"{entry}.sh",
                    "postgresql://postgres@remote.invalid/postgres",
                    CANARY_STUB_ADDRESS="203.0.113.5",
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.recorded_calls(), [], result.stderr)

    def test_rejects_urls_before_psql(self):
        denied = [
            "postgresql://postgres@remote.invalid:5432/postgres",
            "postgresql://postgres@203.0.113.5/postgres",
            "postgresql://postgres@[2001:db8::1]/postgres",
            "host=remote.invalid dbname=postgres",
            "https://127.0.0.1/postgres",
            "postgresql:///postgres",
            "postgresql://localhost.evil.invalid/postgres",
            "postgresql://localhost./postgres",
            "postgresql://127.1/postgres",
            "postgresql://2130706433/postgres",
            "postgresql://127.0.0.1,remote.invalid/postgres",
            "postgresql://[::1],remote.invalid/postgres",
            "postgresql://%31%32%37.0.0.1/postgres",
            "postgresql://%2Ftmp/postgres",
            "postgresql://[::1/postgres",
            "postgresql://[::1]suffix/postgres",
            "postgresql://[::1%25eth0]/postgres",
            "postgresql://127.0.0.1:0/postgres",
            "postgresql://127.0.0.1:65536/postgres",
            "postgresql://127.0.0.1:/postgres",
            "postgresql://127.0.0.1:abc/postgres",
            "postgresql://127.0.0.1/postgres#fragment",
            "postgresql://127.0.0.1/postgres?",
            "postgresql://127.0.0.1/",
            "postgresql://127.0.0.1",
            "postgresql://127.0.0.1/postgres/extra",
            "postgresql://127.0.0.1/postgres%00",
            "postgresql://127.0.0.1/postgres%ZZ",
            "postgresql://postgres:secret@127.0.0.1/postgres?host=remote.invalid",
            "postgresql://127.0.0.1/postgres?hostaddr=203.0.113.5",
            "postgresql://127.0.0.1/postgres?host=127.0.0.1&host=remote.invalid",
            "postgresql://127.0.0.1/postgres?host=127.0.0.1",
            "postgresql://127.0.0.1/postgres?%68ost=remote.invalid",
            "postgresql://127.0.0.1/postgres?service=canary",
            "postgresql://127.0.0.1/postgres?port=5433",
            "postgresql://127.0.0.1/postgres?dbname=host%3Dremote.invalid",
            "postgresql://127.0.0.1/postgres?connect_timeout=2&connect_timeout=3",
            "postgresql://127.0.0.1/postgres?connect_timeout=nope",
            "postgresql://127.0.0.1/postgres?sslmode=not-a-mode",
            "postgresql://127.0.0.1/postgres?application_name=bad%00name",
            "postgresql://127.0.0.1/postgres?application_name=canary&",
            " postgres://127.0.0.1/postgres",
            "postgresql://127.0.0.1/postgres\n",
            "postgresql://127.0.0.1/postgres\t",
            "postgresql://postgres:secret@remote.invalid/postgres",
            "",
        ]
        for entry in ("setup", "rollback"):
            for url in denied:
                with self.subTest(entry=entry, url=url):
                    result = self.run_entry(CANARY / f"{entry}.sh", url)
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                    self.assertEqual(self.recorded_calls(), [], "psql reached before URL denial")
                    self.assertNotIn("secret", result.stdout + result.stderr)

    def test_local_urls_reach_probe_and_operation(self):
        admitted = [
            ("postgresql://postgres@127.0.0.1:5432/postgres", "127.0.0.1"),
            ("postgres://postgres@localhost/postgres", "127.0.0.1"),
            ("postgresql://postgres@[::1]:5432/postgres", "::1"),
            ("postgresql://postgres:p%40ss%3Aword@127.0.0.1/postgres", "127.0.0.1"),
            ("postgresql://127.0.0.1/postgres?sslmode=disable&connect_timeout=2&application_name=canary", "127.0.0.1"),
        ]
        for entry in ("setup", "rollback"):
            for url, address in admitted:
                with self.subTest(entry=entry, url=url):
                    result = self.run_entry(CANARY / f"{entry}.sh", url, CANARY_STUB_ADDRESS=address)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertIn(f"CANARY_{entry.upper()}_OK", result.stdout)
                    calls = self.recorded_calls()
                    self.assertEqual(len(calls), 2)
                    self.assertIn("inet_server_addr()", calls[0][-1])
                    self.assertEqual(calls[1][-2:], ["-f", str(CANARY / f"{entry}.sql")])
                    self.assertEqual(calls[0][0], calls[1][0])
                    self.assertIn(f"hostaddr={address.replace(':', '%3A')}", calls[0][0])

    def test_effective_nonlocal_address_stops_before_mutation(self):
        for entry in ("setup", "rollback"):
            result = self.run_entry(CANARY / f"{entry}.sh", CANARY_STUB_ADDRESS="203.0.113.5")
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("CANARY_NONLOCAL_DATABASE_DENIED", result.stderr)
            self.assertEqual(len(self.recorded_calls()), 1)

    def test_routing_environment_is_denied_before_psql(self):
        for entry in ("setup", "rollback"):
            for name in ("PGHOST", "PGHOSTADDR", "PGPORT", "PGDATABASE", "PGSERVICE", "PGSERVICEFILE"):
                with self.subTest(entry=entry, variable=name):
                    result = self.run_entry(CANARY / f"{entry}.sh", **{name: "remote.invalid"})
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("CANARY_CONNECTION_ENV_DENIED", result.stderr)
                    self.assertEqual(self.recorded_calls(), [])

    def test_existing_synthetic_gates_still_stop_before_psql(self):
        for entry in ("setup", "rollback"):
            for env in (
                {"CANARY_TARGET": "production"},
                {"CANARY_DATA_MODE": "real"},
                {"PILOT_EXTERNAL_DEPLOY_APPROVED": "true"},
            ):
                with self.subTest(entry=entry, env=env):
                    result = self.run_entry(CANARY / f"{entry}.sh", **env)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertEqual(self.recorded_calls(), [])

    def test_python_version_checked_before_connection_or_allocation(self):
        self.stub("python3", "#!/bin/sh\nexit 1\n")
        self.stub("mktemp", "#!/bin/sh\necho allocated > \"$CANARY_STUB_CALLS\"\nexit 1\n")
        for entry in (CANARY / "setup.sh", CANARY / "rollback.sh", ROOT / "supabase/tests/canary/run.sh"):
            with self.subTest(entry=entry.name):
                result = self.run_entry(entry)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("CANARY_PYTHON_VERSION_UNSUPPORTED", result.stderr)
                self.assertFalse(self.calls.exists(), "resources allocated before Python version check")

    def test_cluster_initialization_failure_cleans_temporary_directory(self):
        self.stub("initdb", "#!/bin/sh\nexit 41\n")
        temp = self.directory / "temporary"
        temp.mkdir()
        result = self.run_entry(ROOT / "supabase/tests/canary/run.sh", TMPDIR=str(temp))
        self.assertEqual(result.returncode, 41, result.stderr)
        self.assertIn("CANARY_CLEANUP_OK", result.stdout)
        self.assertEqual(list(temp.iterdir()), [])
        self.assertEqual(self.recorded_calls(), [])

    def test_partial_server_startup_is_stopped_before_cleanup(self):
        self.stub("pg_ctl", """#!/bin/sh
if [ "$3" = '-l' ]; then
    mkdir -p "$2"
    echo synthetic-pid > "$2/postmaster.pid"
    exit 42
fi
printf 'stopped' > "$CANARY_STUB_CALLS"
rm "$2/postmaster.pid"
""")
        temp = self.directory / "temporary"
        temp.mkdir()
        result = self.run_entry(ROOT / "supabase/tests/canary/run.sh", TMPDIR=str(temp))
        self.assertEqual(result.returncode, 42, result.stderr)
        self.assertEqual(self.calls.read_text(), "stopped")
        self.assertIn("CANARY_CLEANUP_OK", result.stdout)
        self.assertEqual(list(temp.iterdir()), [])

    def test_shutdown_failure_retains_cluster_and_fails(self):
        self.stub("pg_ctl", """#!/bin/sh
if [ "$3" = '-l' ]; then
    mkdir -p "$2"
    echo synthetic-pid > "$2/postmaster.pid"
fi
exit 42
""")
        temp = self.directory / "temporary"
        temp.mkdir()
        result = self.run_entry(ROOT / "supabase/tests/canary/run.sh", TMPDIR=str(temp))
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("CANARY_CLEANUP_FAILED", result.stderr)
        self.assertNotIn("CANARY_CLEANUP_OK", result.stdout)
        clusters = list(temp.glob("educa-schema-canary.*/data/postmaster.pid"))
        self.assertEqual(len(clusters), 1)
        self.assertEqual(clusters[0].read_text(), "synthetic-pid\n")

    def test_setup_checksum_prerequisite_precedes_probe(self):
        for command in ("dirname", "python3", "cut", "date"):
            (self.bin / command).symlink_to(shutil.which(command))
        result = self.run_entry(CANARY / "setup.sh", PATH=str(self.bin))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("CANARY_PREREQUISITE_MISSING: sha256sum", result.stderr)
        self.assertEqual(self.recorded_calls(), [])

    def test_invalid_runner_port_stops_before_allocation(self):
        self.stub("mktemp", "#!/bin/sh\necho allocated > \"$CANARY_STUB_CALLS\"\nexit 1\n")
        result = self.run_entry(ROOT / "supabase/tests/canary/run.sh", POSTGRES_CANARY_PORT="not-a-port")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("CANARY_DB_URL_INVALID", result.stderr)
        self.assertFalse(self.calls.exists())

    def test_missing_prerequisites_stop_before_connection_or_allocation(self):
        # An isolated PATH proves command absence without invoking installed PostgreSQL tools.
        for command in ("dirname", "bash", "date", "cut"):
            (self.bin / command).symlink_to(shutil.which(command))
        self.stub("mktemp", "#!/bin/sh\necho allocated > \"$CANARY_STUB_CALLS\"\nexit 1\n")
        for entry in (CANARY / "setup.sh", CANARY / "rollback.sh", ROOT / "supabase/tests/canary/run.sh"):
            with self.subTest(entry=entry.name):
                result = self.run_entry(entry, PATH=str(self.bin))
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("CANARY_PREREQUISITE_MISSING", result.stderr)
                self.assertFalse(self.calls.exists())


if __name__ == "__main__":
    unittest.main()
