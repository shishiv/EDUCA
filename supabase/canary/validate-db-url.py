"""Fail closed on nonlocal libpq destinations without resolving any hostname."""

import os
import re
import sys
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit, urlunsplit


# A deliberately small URI grammar avoids disagreements between urllib and libpq.
# Encoded credentials are supported, but encoded hosts and multi-host URIs are not.
COMPONENT = r"(?:[A-Za-z0-9_.~-]|%[0-9A-Fa-f]{2})+"
AUTHORITY = re.compile(
    rf"(?:(?P<user>{COMPONENT})(?::(?P<password>(?:[A-Za-z0-9_.~-]|%[0-9A-Fa-f]{{2}})*))?@)?"
    r"(?P<host>127\.0\.0\.1|localhost|\[::1\])(?::(?P<port>[0-9]{1,5}))?"
)
ROUTING_ENV = ("PGHOST", "PGHOSTADDR", "PGPORT", "PGDATABASE", "PGSERVICE", "PGSERVICEFILE")


def validate_text(url: str) -> None:
    if not url.isascii() or any(character.isspace() for character in url):
        raise ValueError("whitespace or non-ASCII URL")
    if re.search(r"%(?![0-9A-Fa-f]{2})", url):
        raise ValueError("invalid percent escape")
    decoded = unquote(url, errors="strict")
    if any(ord(character) < 32 or ord(character) == 127 for character in decoded):
        raise ValueError("control character")
    if "#" in url or url.endswith("?"):
        raise ValueError("fragment or empty query")


def validate_query(query: str) -> list[tuple[str, str]]:
    parameters = parse_qsl(query, keep_blank_values=True, strict_parsing=True)
    allowed = {
        "sslmode": r"disable|allow|prefer|require|verify-ca|verify-full",
        "connect_timeout": r"[1-9][0-9]{0,3}",
        "application_name": r"[A-Za-z0-9_.-]+",
    }
    seen = set()
    for name, value in parameters:
        if name in seen or name not in allowed:
            raise ValueError("duplicate or unsupported connection parameter")
        if not re.fullmatch(allowed[name], value):
            raise ValueError("invalid connection parameter value")
        seen.add(name)
    return parameters


def local_database_url(url: str) -> str:
    validate_text(url)
    if not url.startswith(("postgresql://", "postgres://")):
        raise ValueError("postgresql:// or postgres:// is required")
    parts = urlsplit(url)
    authority = AUTHORITY.fullmatch(parts.netloc)
    if authority is None:
        raise ValueError("explicit loopback host is required")
    port = authority["port"] or "5432"
    if not 1 <= int(port) <= 65535:
        raise ValueError("port is out of range")
    if not re.fullmatch(rf"/{COMPONENT}", parts.path):
        raise ValueError("explicit database name is required")
    parameters = validate_query(parts.query)
    address = "::1" if authority["host"] == "[::1]" else "127.0.0.1"
    # Pin even localhost numerically. Neither DNS nor PGHOSTADDR chooses the peer.
    parameters.append(("hostaddr", address))
    netloc = parts.netloc if authority["port"] else f"{parts.netloc}:{port}"
    return urlunsplit((parts.scheme, netloc, parts.path, urlencode(parameters), ""))


def main() -> None:
    if any(os.environ.get(name) for name in ROUTING_ENV):
        raise SystemExit("CANARY_CONNECTION_ENV_DENIED: unset libpq routing variables")
    try:
        url = local_database_url(sys.stdin.read())
    except ValueError:
        # Parser exceptions can contain input. Never echo URLs or credentials.
        raise SystemExit("CANARY_DB_URL_INVALID: explicit loopback PostgreSQL URI with supported options required") from None
    print(url)


if __name__ == "__main__":
    main()
