"""Bounded real PostgreSQL + signed HTTP regression. No hosted credentials accepted."""
import json
import os
import pathlib
import socket
import subprocess
import time

root = pathlib.Path(__file__).resolve().parents[2]
binary = pathlib.Path(os.environ.get('LOCAL_POSTGRES_BIN', root / '../../tmp/execution03-enforcement/tmp/pg-execution03/pgsql/bin')).resolve()
data = root / 'tmp/native-repair-pg/data'
out = root / 'artifacts/security-repair'
out.mkdir(parents=True, exist_ok=True)
env = {k: v for k, v in os.environ.items() if k.upper() in {'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA'}}
env['NODE_DISABLE_COMPILE_CACHE'] = '1'
flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
started = time.monotonic()
server = None
receipt = {'hosted': False, 'port': 55643, 'dataDirectory': str(data), 'exitCode': None}
try:
    assert binary.joinpath('initdb.exe').is_file(), 'Known portable PostgreSQL distribution required'
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 55643))
    if not data.exists():
        subprocess.run([str(binary / 'initdb.exe'), '-D', str(data), '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8'], env=env, capture_output=True, check=True, timeout=60, creationflags=flags)
    else:
        status = subprocess.run([str(binary / 'pg_ctl.exe'), '-D', str(data), 'status'], env=env, capture_output=True, timeout=10, creationflags=flags)
        assert status.returncode != 0, 'Do not reuse a running cluster'
    with (out / 'postgres.log').open('w') as server_log:
        server = subprocess.Popen([str(binary / 'postgres.exe'), '-D', str(data), '-h', '127.0.0.1', '-p', '55643'], env=env, stdout=server_log, stderr=server_log, creationflags=flags)
        for _ in range(100):
            with socket.socket() as probe:
                if probe.connect_ex(('127.0.0.1', 55643)) == 0:
                    break
            time.sleep(.1)
        with (out / 'native-current-postgres.tap').open('w') as log:
            result = subprocess.run(['node', '--import=tsx', '--test', '--test-concurrency=1', 'tests/native-current-dispatch-postgres.test.mjs'], cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=180, creationflags=flags)
            receipt['exitCode'] = result.returncode
finally:
    if server:
        stopped = subprocess.run([str(binary / 'pg_ctl.exe'), '-D', str(data), '-m', 'fast', '-w', 'stop'], env=env, capture_output=True, timeout=30, creationflags=flags)
        receipt['serverStopped'] = stopped.returncode == 0
        server.wait(timeout=10)
    receipt['seconds'] = round(time.monotonic() - started, 1)
    (out / 'native-current-postgres-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt))
raise SystemExit(receipt['exitCode'] if receipt['exitCode'] is not None else 1)
