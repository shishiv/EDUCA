#!/usr/bin/env bash
# Shared mechanics only. Each pilot retains its own fixtures, phases and receipts.

pilot_local_project_init() {
  local runtime_scripts
  runtime_scripts="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  pnpm exec tsx "$runtime_scripts/pilot-local-project.ts" "$@"
}

redact_file() {
  local source_file="$1" destination_file="$2"
  [[ -f "$source_file" ]] || return 0
  sed -E \
    -e 's/sb_(publishable|secret)_[A-Za-z0-9_-]+/[REDACTED_SUPABASE_KEY]/g' \
    -e 's/eyJ[A-Za-z0-9._-]+/[REDACTED_TOKEN]/g' \
    -e 's#(postgresql://[^:@/]+):[^@]+@#\1:[REDACTED]@#g' \
    -e 's#(https?://[^:/[:space:]]+):[0-9]+#\1#g' \
    "$source_file" > "$destination_file"
}

show_log_on_failure() {
  local log_file="$1" redacted_log="${1}.redacted"
  redact_file "$log_file" "$redacted_log"
  [[ ! -s "$redacted_log" ]] || cat "$redacted_log" >&2
}

run_captured() {
  local phase="$1" log_file="$2"
  shift 2
  if ! "$@" >"$log_file" 2>&1; then
    echo "${PILOT_RUNTIME_FAILURE_PREFIX:?}: phase=$phase" >&2
    show_log_on_failure "$log_file"
    return 1
  fi
}

# The session is created by setsid in each runner. Exclude zombies: they hold
# no application resources and can only be reaped by their surviving parent.
pilot_app_live_pids() {
  local process_table
  process_table=$(ps -eo pid=,sid=,stat=) || return 1
  awk -v app_pid="$1" '
    $3 !~ /^[ZX]/ {
      if ($1 == app_pid && $2 != app_pid) foreign_leader = 1
      if ($2 == app_pid) print $1
    }
    END { if (foreign_leader) exit 2 }
  ' <<< "$process_table"
}

pilot_signal_app_session() {
  local process_ids process_id
  process_ids=$(pilot_app_live_pids "$1") || return 1
  while read -r process_id; do
    [[ -z "$process_id" ]] || kill "-$2" "$process_id" 2>/dev/null || true
  done <<< "$process_ids"
}

pilot_wait_app_session() {
  local app_pid="$1" attempts="$2" process_ids attempt
  for ((attempt = 0; attempt < attempts; attempt++)); do
    process_ids=$(pilot_app_live_pids "$app_pid") || return 2
    [[ -n "$process_ids" ]] || return 0
    sleep 0.1
  done
  return 1
}

pilot_stop_app_process_group() {
  local app_pid="$1" grace_seconds="${2:-10}" stopped
  [[ -n "$app_pid" ]] || return 0
  [[ "$app_pid" =~ ^[0-9]+$ && "$app_pid" -gt 1 && "$grace_seconds" =~ ^[0-9]+$ ]] || return 1
  pilot_signal_app_session "$app_pid" TERM || return 1
  if pilot_wait_app_session "$app_pid" "$((grace_seconds * 10))"; then
    stopped=0
  else
    stopped=$?
  fi
  if [[ "$stopped" -eq 2 ]]; then return 1; fi
  if [[ "$stopped" -ne 0 ]]; then
    pilot_signal_app_session "$app_pid" KILL || return 1
    pilot_wait_app_session "$app_pid" 20 || return 1
  fi
  # Reap only after the bounded process probe confirms there is nothing live.
  wait "$app_pid" 2>/dev/null || true
}

pilot_verify_app_route_removed() {
  local server_mode="$1" app_name="$2" routes attempt
  [[ "$server_mode" == direct || -z "$app_name" ]] && return 0
  for ((attempt = 0; attempt < 20; attempt++)); do
    # A failed probe is not evidence that a route was removed.
    routes=$(portless list 2>/dev/null) || return 1
    if ! grep -Fq "$app_name" <<< "$routes"; then return 0; fi
    sleep 0.1
  done
  return 1
}

# R3 lifecycle state is shared by legacy, capacity and descriptive runners.
# Evidence is copied between stopping services and removing the frozen project.
pilot_cleanup_services() {
  if pilot_stop_app_process_group "$APP_PID"; then
    APP_STOPPED=true
  else
    APP_STOPPED=false
    CLEANUP_FAILED=true
  fi
  if [[ -z "$APP_PID" ]] || pilot_verify_app_route_removed "$APP_SERVER_MODE" "${APP_NAME:-}"; then
    APP_ROUTE_REMOVED=true
  else
    APP_ROUTE_REMOVED=false
    CLEANUP_FAILED=true
  fi
  DATABASE_STOPPED=true
  if [[ "$SUPABASE_STARTED" == true && -d "$ISOLATED_PROJECT_DIR" ]]; then
    if ! pilot_supabase_stop_project "$ISOLATED_PROJECT_DIR" "$SUPABASE_PROJECT_ID" >"$ISOLATED_PROJECT_DIR/stop.log" 2>&1; then
      DATABASE_STOPPED=false
      CLEANUP_FAILED=true
      show_log_on_failure "$ISOLATED_PROJECT_DIR/stop.log"
    fi
  fi
  [[ -z "$AUTH_DIR" || ! -d "$AUTH_DIR" ]] || rm -rf "$AUTH_DIR"
  AUTH_STATE_REMOVED=false
  if [[ -n "$AUTH_STATE_PATH" && ! -e "$AUTH_STATE_PATH" ]]; then AUTH_STATE_REMOVED=true; fi
}

pilot_cleanup_project() {
  if [[ -n "$ISOLATED_PROJECT_DIR" && -e "$ISOLATED_PROJECT_DIR" ]]; then rm -rf "$ISOLATED_PROJECT_DIR"; fi
  TEMP_REMOVED=false
  if [[ -n "$ISOLATED_PROJECT_DIR" && ! -e "$ISOLATED_PROJECT_DIR" ]]; then
    TEMP_REMOVED=true
  else
    CLEANUP_FAILED=true
  fi
  if ! pilot_port_range_lease_release; then
    PORT_LEASE_RELEASE_FAILED=true
    CLEANUP_FAILED=true
  fi
}
