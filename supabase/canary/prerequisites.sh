# Shared by the entry points and raw-PG proof, before connections or allocation.
canary_require_prerequisites() {
  local dependency
  for dependency in python3 "$@"; do
    command -v "$dependency" >/dev/null || {
      echo "CANARY_PREREQUISITE_MISSING: $dependency" >&2
      return 1
    }
  done
  python3 -c 'import sys; sys.exit(sys.version_info < (3, 11))' || {
    echo 'CANARY_PYTHON_VERSION_UNSUPPORTED: Python 3.11+ is required' >&2
    return 1
  }
}
