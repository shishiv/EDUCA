#!/usr/bin/env bash
# Shared app-server contract for the R3 pilot runners.

pilot_app_server_mode() {
  case "${PILOT_E2E_APP_SERVER:-portless}" in
    portless|direct) printf '%s' "${PILOT_E2E_APP_SERVER:-portless}" ;;
    *)
      echo 'PILOT_APP_SERVER_INVALID: expected portless or direct' >&2
      return 1
      ;;
  esac
}

pilot_app_server_port() {
  local base="$1"
  local mode="$2"
  [[ "$mode" == direct ]] || return 0
  [[ "$base" =~ ^[0-9]+$ ]] || {
    echo 'PILOT_APP_SERVER_BASE_INVALID: direct mode requires a numeric lease base' >&2
    return 1
  }
  # Supabase owns base..base+8. The tenth leased slot is reserved for Next.
  printf '%s' "$((base + 9))"
}

pilot_app_server_origin() {
  local app_name="$1"
  local mode="$2"
  local app_port="${3:-}"
  if [[ "$mode" == direct ]]; then
    [[ "$app_port" =~ ^[0-9]+$ ]] || return 1
    printf 'http://127.0.0.1:%s' "$app_port"
  else
    printf 'https://%s.localhost' "$app_name"
  fi
}

pilot_app_server_validate_origin() {
  local value="$1"
  local mode="$2"
  local expected_port="${3:-}"
  node - "$value" "$mode" "$expected_port" <<'NODE'
const [value, mode, expectedPort] = process.argv.slice(2)
const url = new URL(value)
if (mode === 'direct') {
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol !== 'http:' || url.port !== expectedPort) {
    throw new Error('PILOT_APP_SERVER_ORIGIN_INVALID: direct origin must be loopback with the leased app port')
  }
} else if (url.protocol !== 'https:' || !url.hostname.endsWith('.localhost') || url.port !== '') {
  throw new Error('PILOT_APP_SERVER_ORIGIN_INVALID: portless origin must be an unnumbered .localhost URL')
}
if (url.pathname !== '/' || url.search || url.hash) throw new Error('PILOT_APP_SERVER_ORIGIN_INVALID: origin must not include a path')
console.log('PILOT_APP_SERVER_ORIGIN_VALID')
NODE
}

pilot_app_server_receipt_url() {
  local value="$1"
  node - "$value" <<'NODE'
const url = new URL(process.argv[2])
url.port = ''
url.pathname = ''
url.search = ''
url.hash = ''
process.stdout.write(url.toString().replace(/\/$/, ''))
NODE
}
