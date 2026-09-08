#!/usr/bin/env bash
set -euo pipefail

APP_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
LEASE_SCRIPT="$APP_DIR/scripts/pilot-port-range-lease.sh"
TEST_DIR=$(mktemp -d)
READY_FILE="$TEST_DIR/socket.json"
FAKE_BIN="$TEST_DIR/bin"
ORIGINAL_PATH="$PATH"
SOCKET_PID=''

cleanup() {
  [[ -z "$SOCKET_PID" ]] || kill "$SOCKET_PID" 2>/dev/null || true
  [[ -z "$SOCKET_PID" ]] || wait "$SOCKET_PID" 2>/dev/null || true
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

mkdir -p "$FAKE_BIN"
cat >"$FAKE_BIN/docker" <<'DOCKER'
#!/usr/bin/env bash
set -euo pipefail
[[ "$1" == ps && "$2" == -a && "$3" == --format ]]
DOCKER
chmod +x "$FAKE_BIN/docker"

PATH="$FAKE_BIN:$ORIGINAL_PATH"
source "$LEASE_SCRIPT"

node - "$READY_FILE" <<'NODE' &
const fs = require('node:fs')
const net = require('node:net')

const readyFile = process.argv[2]

function reserveEstablishedClient(attempt = 0) {
  if (attempt === 20) throw new Error('could not reserve an isolated TCP source port')

  const sourceProbe = net.createServer()
  sourceProbe.listen(0, '127.0.0.1', () => {
    const sourcePort = sourceProbe.address().port
    sourceProbe.close(() => {
      const server = net.createServer()
      server.listen(0, '127.0.0.1', () => {
        const serverPort = server.address().port
        const base = sourcePort - 2
        if (base < 1024 || (serverPort >= base && serverPort <= base + 9)) {
          server.close(() => reserveEstablishedClient(attempt + 1))
          return
        }
        const client = net.connect({
          host: '127.0.0.1',
          port: serverPort,
          localAddress: '127.0.0.1',
          localPort: sourcePort,
        }, () => {
          fs.writeFileSync(readyFile, JSON.stringify({ base, sourcePort }))
        })
        client.on('error', (error) => {
          server.close()
          throw error
        })
      })
    })
  })
}

reserveEstablishedClient()
NODE
SOCKET_PID=$!

for _ in $(seq 1 50); do
  [[ -s "$READY_FILE" ]] && break
  sleep 0.1
done
[[ -s "$READY_FILE" ]] || { echo 'real TCP socket did not become ready' >&2; exit 1; }

read -r PORT_BASE SOURCE_PORT < <(node - "$READY_FILE" <<'NODE'
const value = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'))
console.log(`${value.base} ${value.sourcePort}`)
NODE
)

ss -tanH | awk -v port="$SOURCE_PORT" '$1 == "ESTAB" && $4 ~ (":" port "$") { found = 1 } END { exit !found }'
if ! pilot_port_range_probe "$PORT_BASE"; then
  echo 'expected an established local TCP port to reserve the lease slot' >&2
  exit 1
fi

cat >"$FAKE_BIN/ss" <<'SS'
#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == '-tanH' ]]
printf 'ESTAB 0 0 127.0.0.1:40000 127.0.0.1:45122\n'
SS
chmod +x "$FAKE_BIN/ss"

if pilot_port_range_probe 45120; then
  echo 'a matching remote peer port must not reserve the lease slot' >&2
  exit 1
fi


reset_lease_state() {
  PILOT_E2E_PORT_LEASE_EXTERNAL=false
  PILOT_E2E_PORT_LEASE_ACQUIRED=false
  PILOT_E2E_PORT_LEASE_RELEASED=false
  unset PILOT_E2E_PORT_BASE PILOT_E2E_PORT_LEASE_DIR
}

# A default lease must not use a slot when only its final port can be assigned
# as an ephemeral client port. The whole ten-port slot is reserved together.
reset_lease_state
default_start=55000
default_end=64000
default_slots=$(( (default_end - default_start) / 10 ))
default_offset=$(( $$ % default_slots ))
first_default_base=$((default_start + default_offset * 10))
next_default_base=$((default_start + ((default_offset + 1) % default_slots) * 10))
pilot_port_lease_ephemeral_range() {
  printf '%s %s\n' "$((first_default_base + 9))" "$((first_default_base + 9))"
}
PILOT_E2E_PORT_LEASE_ROOT="$TEST_DIR/default-lease"
unset PILOT_E2E_PORT_LEASE_START PILOT_E2E_PORT_LEASE_END
pilot_port_range_lease_acquire >/dev/null
if [[ "$PILOT_E2E_PORT_BASE" != "$next_default_base" ]]; then
  echo "default lease must skip slot $first_default_base when port $((first_default_base + 9)) is ephemeral; got $PILOT_E2E_PORT_BASE" >&2
  exit 1
fi
pilot_port_range_lease_release >/dev/null

# Empty environment values use the documented defaults, so they keep the
# default ephemeral guard instead of silently becoming an override.
reset_lease_state
PILOT_E2E_PORT_LEASE_ROOT="$TEST_DIR/empty-default-lease"
PILOT_E2E_PORT_LEASE_START=''
unset PILOT_E2E_PORT_LEASE_END
pilot_port_range_lease_acquire >/dev/null
if [[ "$PILOT_E2E_PORT_BASE" != "$next_default_base" ]]; then
  echo "empty lease bound must keep the ephemeral guard; got $PILOT_E2E_PORT_BASE" >&2
  exit 1
fi
pilot_port_range_lease_release >/dev/null

# One non-empty caller bound is an intentional override. Its caller owns the
# collision decision, so the default ephemeral-range guard must not rewrite it.
reset_lease_state
PILOT_E2E_PORT_LEASE_ROOT="$TEST_DIR/explicit-lease"
PILOT_E2E_PORT_LEASE_START="$default_start"
unset PILOT_E2E_PORT_LEASE_END
pilot_port_range_lease_acquire >/dev/null
if [[ "$PILOT_E2E_PORT_BASE" != "$first_default_base" ]]; then
  echo "explicit lease range must remain eligible; got $PILOT_E2E_PORT_BASE" >&2
  exit 1
fi
pilot_port_range_lease_release >/dev/null

# End is exclusive. The final aligned ten-port slot is valid because it uses
# only 65520 through 65529.
reset_lease_state
PILOT_E2E_PORT_LEASE_ROOT="$TEST_DIR/final-slot-lease"
PILOT_E2E_PORT_LEASE_START=65520
PILOT_E2E_PORT_LEASE_END=65530
pilot_port_range_lease_acquire >/dev/null
if [[ "$PILOT_E2E_PORT_BASE" != 65520 ]]; then
  echo "final valid lease slot must be accepted; got $PILOT_E2E_PORT_BASE" >&2
  exit 1
fi
pilot_port_range_lease_release >/dev/null

# A range whose final slot would include ports above the TCP limit is rejected.
reset_lease_state
PILOT_E2E_PORT_LEASE_ROOT="$TEST_DIR/invalid-lease"
PILOT_E2E_PORT_LEASE_START=65520
PILOT_E2E_PORT_LEASE_END=65540
if pilot_port_range_lease_acquire >/dev/null 2>&1; then
  echo 'lease range extending beyond valid port limits must be rejected' >&2
  exit 1
fi

echo 'PILOT_PORT_RANGE_LEASE_TESTS_PASSED'
