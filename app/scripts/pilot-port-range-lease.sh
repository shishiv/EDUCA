#!/usr/bin/env bash
# shellcheck shell=bash
# Cross-worktree atomic lease for the nine Supabase host ports used by pilot E2E.

PILOT_E2E_PORT_LEASE_EXTERNAL="${PILOT_E2E_PORT_LEASE_EXTERNAL:-false}"
PILOT_E2E_PORT_LEASE_ACQUIRED="${PILOT_E2E_PORT_LEASE_ACQUIRED:-false}"
PILOT_E2E_PORT_LEASE_RELEASED="${PILOT_E2E_PORT_LEASE_RELEASED:-false}"
export PILOT_E2E_PORT_LEASE_EXTERNAL PILOT_E2E_PORT_LEASE_ACQUIRED PILOT_E2E_PORT_LEASE_RELEASED

pilot_port_lease_root() {
  local root="${PILOT_E2E_PORT_LEASE_ROOT:-${XDG_RUNTIME_DIR:-/tmp}/educa-pilot-port-leases}"
  if [[ "$root" != /* ]]; then
    root="$(pwd -P)/$root"
  fi
  printf '%s' "$root"
}

pilot_port_range_probe() {
  local base="$1"
  local listeners
  local docker_ports
  local port

  listeners=$(ss -ltn 2>/dev/null) || {
    echo 'PILOT_PORT_LEASE_LISTENER_PROBE_FAILED: ss could not inspect host listeners' >&2
    return 2
  }
  docker_ports=$(docker ps -a --format '{{.Ports}}' 2>/dev/null) || {
    echo 'PILOT_PORT_LEASE_DOCKER_PROBE_FAILED: docker ps could not inspect published ports' >&2
    return 2
  }

  for ((port = base; port <= base + 8; port += 1)); do
    if grep -Eq ":${port}[[:space:]]" <<<"$listeners"; then
      return 0
    fi
    if grep -Eq "(^|[[:space:],])[^[:space:],]*:${port}->" <<<"$docker_ports"; then
      return 0
    fi
  done
  return 1
}

pilot_port_lease_reclaim_stale() {
  local lease_dir="$1"
  local owner_pid

  [[ -d "$lease_dir" ]] || return 0
  if [[ ! -f "$lease_dir/owner.pid" ]]; then
    return 0
  fi
  owner_pid=$(<"$lease_dir/owner.pid")
  if kill -0 "$owner_pid" 2>/dev/null; then
    return 0
  fi
  rm -f "$lease_dir/owner.pid" "$lease_dir/owner.worktree" "$lease_dir/base" "$lease_dir/range"
  rmdir "$lease_dir" 2>/dev/null || true
}

pilot_port_range_lease_acquire() {
  local root
  local start
  local end
  local slots
  local offset
  local slot
  local base
  local lease_dir
  local probe_status

  if [[ "$PILOT_E2E_PORT_LEASE_EXTERNAL" == true ]]; then
    echo 'PILOT_PORT_LEASE_EXTERNAL_REQUIRED: an external lease must provide base and lease directory' >&2
    return 1
  fi

  root=$(pilot_port_lease_root)
  start="${PILOT_E2E_PORT_LEASE_START:-55000}"
  end="${PILOT_E2E_PORT_LEASE_END:-64000}"
  if [[ ! "$start" =~ ^[0-9]+$ || ! "$end" =~ ^[0-9]+$ || "$start" -lt 1024 || "$end" -gt 65527 || "$end" -le "$start" ]]; then
    echo "PILOT_PORT_LEASE_RANGE_INVALID: start=$start end=$end" >&2
    return 1
  fi
  if (( start % 10 != 0 || (end - start) % 10 != 0 || end - start < 10 )); then
    echo "PILOT_PORT_LEASE_RANGE_INVALID: range must contain ten-port slots start=$start end=$end" >&2
    return 1
  fi

  mkdir -p "$root" || {
    echo "PILOT_PORT_LEASE_ROOT_UNAVAILABLE: $root" >&2
    return 1
  }
  slots=$(( (end - start) / 10 ))
  offset=$(( $$ % slots ))

  for ((slot = 0; slot < slots; slot += 1)); do
    base=$((start + ((offset + slot) % slots) * 10))
    lease_dir="$root/$base"
    pilot_port_lease_reclaim_stale "$lease_dir"
    if ! mkdir "$lease_dir" 2>/dev/null; then
      continue
    fi

    probe_status=0
    pilot_port_range_probe "$base" || probe_status=$?
    if [[ "$probe_status" -eq 2 ]]; then
      rmdir "$lease_dir" 2>/dev/null || true
      return 1
    fi
    if [[ "$probe_status" -eq 0 ]]; then
      rmdir "$lease_dir" 2>/dev/null || true
      continue
    fi

    printf '%s\n' "$$" > "$lease_dir/owner.pid"
    printf '%s\n' "$(pwd -P)" > "$lease_dir/owner.worktree"
    printf '%s\n' "$base" > "$lease_dir/base"
    printf '%s\n' "$((base + 8))" > "$lease_dir/range"
    PILOT_E2E_PORT_BASE="$base"
    PILOT_E2E_PORT_LEASE_DIR="$lease_dir"
    PILOT_E2E_PORT_LEASE_ACQUIRED=true
    PILOT_E2E_PORT_LEASE_RELEASED=false
    export PILOT_E2E_PORT_BASE PILOT_E2E_PORT_LEASE_DIR PILOT_E2E_PORT_LEASE_ACQUIRED PILOT_E2E_PORT_LEASE_RELEASED
    printf 'PILOT_PORT_RANGE_LEASE: base=%s end=%s lease_dir=%s owner_pid=%s\n' "$base" "$((base + 8))" "$lease_dir" "$$"
    return 0
  done

  echo "PILOT_PORT_LEASE_EXHAUSTED: no free Docker-aware port range in $start-$((end - 1))" >&2
  return 1
}

pilot_port_range_lease_use_external() {
  local base="${PILOT_E2E_PORT_BASE:-}"
  local lease_dir="${PILOT_E2E_PORT_LEASE_DIR:-}"
  local recorded_base
  local recorded_end

  if [[ "$PILOT_E2E_PORT_LEASE_EXTERNAL" != true ]]; then
    pilot_port_range_lease_acquire
    return $?
  fi
  if [[ ! "$base" =~ ^[0-9]+$ || ! -d "$lease_dir" || ! -f "$lease_dir/base" || ! -f "$lease_dir/range" ]]; then
    echo 'PILOT_PORT_LEASE_EXTERNAL_INVALID: child received no valid aggregate lease' >&2
    return 1
  fi
  recorded_base=$(<"$lease_dir/base")
  recorded_end=$(<"$lease_dir/range")
  if [[ "$recorded_base" != "$base" || "$recorded_end" != "$((base + 8))" ]]; then
    echo "PILOT_PORT_LEASE_EXTERNAL_MISMATCH: base=$base recorded_base=$recorded_base recorded_end=$recorded_end" >&2
    return 1
  fi
  printf 'PILOT_PORT_RANGE_LEASE_EXTERNAL: base=%s end=%s lease_dir=%s\n' "$base" "$((base + 8))" "$lease_dir"
}

pilot_port_range_lease_release() {
  local lease_dir="${PILOT_E2E_PORT_LEASE_DIR:-}"

  if [[ "$PILOT_E2E_PORT_LEASE_EXTERNAL" == true ]]; then
    return 0
  fi
  if [[ "$PILOT_E2E_PORT_LEASE_ACQUIRED" != true || -z "$lease_dir" ]]; then
    PILOT_E2E_PORT_LEASE_RELEASED=true
    export PILOT_E2E_PORT_LEASE_RELEASED
    return 0
  fi

  rm -f "$lease_dir/owner.pid" "$lease_dir/owner.worktree" "$lease_dir/base" "$lease_dir/range"
  if ! rmdir "$lease_dir" 2>/dev/null; then
    echo "PILOT_PORT_LEASE_RELEASE_FAILED: $lease_dir" >&2
    return 1
  fi
  PILOT_E2E_PORT_LEASE_RELEASED=true
  export PILOT_E2E_PORT_LEASE_RELEASED
  printf 'PILOT_PORT_RANGE_LEASE_RELEASED: lease_dir=%s\n' "$lease_dir"
}
