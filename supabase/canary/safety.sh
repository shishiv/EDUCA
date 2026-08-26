set -euo pipefail

: "${DB_URL:?DB_URL is required}"
: "${CANARY_TARGET:?CANARY_TARGET is required}"
: "${CANARY_DATA_MODE:?CANARY_DATA_MODE is required}"

[[ "$CANARY_TARGET" == 'local-synthetic' ]] || {
  echo 'CANARY_TARGET_INVALID: local-synthetic is required' >&2
  exit 1
}

[[ "$CANARY_DATA_MODE" == 'synthetic' ]] || {
  echo 'CANARY_DATA_MODE_INVALID: synthetic is required' >&2
  exit 1
}

[[ "${PILOT_EXTERNAL_DEPLOY_APPROVED:-false}" != true ]] || {
  echo 'CANARY_EXTERNAL_DEPLOY_DENIED' >&2
  exit 1
}

server_address=$(psql "$DB_URL" -X -Atq -v ON_ERROR_STOP=1 -c "SELECT coalesce(inet_server_addr()::text, 'local-socket')")
case "$server_address" in
  127.0.0.1|127.0.0.1/32|::1|::1/128|local-socket) ;;
  *)
    echo "CANARY_NONLOCAL_DATABASE_DENIED: $server_address" >&2
    exit 1
    ;;
esac
