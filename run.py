#!/usr/bin/env python3
"""
Auth0 token fetcher with caching.
Reads config from .env file in the current directory or any parent directory.

Usage:
    python auth_token.py              # prints token to stdout
    TOKEN=$(python auth_token.py)     # capture in shell
"""
import json
import os
import sys
import time
from pathlib import Path
from urllib import request, error


def load_env_file() -> None:
    """Walk up from cwd looking for a .env file, load first one found."""
    current = Path.cwd()
    for directory in [current, *current.parents]:
        env_file = directory / ".dev.vars"
        if env_file.exists():
            sys.stderr.write(f"Loaded env from: {env_file}\n")
            with env_file.open() as f:
                for line in f:
                    line = line.strip()
                    # skip blanks and comments
                    if not line or line.startswith("#"):
                        continue
                    if "=" not in line:
                        continue
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip()
                    # strip optional surrounding quotes
                    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                        value = value[1:-1]
                    # don't overwrite values already set in the environment
                    os.environ.setdefault(key, value)
            return


def get_config() -> dict:
    """Read and validate required config from environment."""
    missing = []
    config = {}

    required = {
        "AUTH0_DOMAIN": "your-tenant.auth0.com",
        "AUTH0_CLIENT_ID": "your client ID",
        "AUTH0_AUDIENCE": "https://your-api/",
        "E2E_LOGIN_EMAIL": "test@example.com",
        "E2E_LOGIN_PASSWORD": "your test password",
    }

    for key, example in required.items():
        value = os.environ.get(key)
        if not value:
            missing.append(f"  {key}=  # e.g. {example}")
        else:
            config[key] = value

    if missing:
        sys.stderr.write(
            "Missing required env vars. Add these to your .env file:\n\n"
            + "\n".join(missing)
            + "\n"
        )
        sys.exit(1)

    # optional
    config["AUTH0_CLIENT_SECRET"] = os.environ.get("AUTH0_CLIENT_SECRET")
    config["AUTH0_REALM"] = os.environ.get("AUTH0_REALM", "Username-Password-Authentication")

    return config


CACHE_PATH = Path.home() / ".cache" / "auth0-token.json"
SAFETY_MARGIN_SECONDS = 60


def load_cached_token() -> str | None:
    if not CACHE_PATH.exists():
        return None
    try:
        data = json.loads(CACHE_PATH.read_text())
        if data.get("expires_at", 0) > time.time():
            return data["access_token"]
    except (json.JSONDecodeError, KeyError):
        pass
    return None


def save_token(access_token: str, expires_in: int) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "access_token": access_token,
        "expires_at": int(time.time()) + expires_in - SAFETY_MARGIN_SECONDS,
    }
    CACHE_PATH.write_text(json.dumps(payload))
    CACHE_PATH.chmod(0o600)


def fetch_token(config: dict) -> tuple[str, int]:
    body: dict[str, str] = {
        "username": config["E2E_LOGIN_EMAIL"],
        "password": config["E2E_LOGIN_PASSWORD"],
        "audience": config["AUTH0_AUDIENCE"],
        "client_id": config["AUTH0_CLIENT_ID"],
        "scope": "openid profile email offline_access",
    }

    if config["AUTH0_CLIENT_SECRET"]:
        body["grant_type"] = "password"
        body["client_secret"] = config["AUTH0_CLIENT_SECRET"]
    else:
        body["grant_type"] = "http://auth0.com/oauth/grant-type/password-realm"
        body["realm"] = config["AUTH0_REALM"]

    req = request.Request(
        f"https://{config['AUTH0_DOMAIN']}/oauth/token",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
    except error.HTTPError as e:
        sys.stderr.write(f"Auth0 error {e.code}: {e.read().decode()}\n")
        sys.exit(1)
    except error.URLError as e:
        sys.stderr.write(f"Network error: {e.reason}\n")
        sys.exit(1)

    return data["access_token"], data["expires_in"]


def main() -> None:
    load_env_file()
    config = get_config()

    token = load_cached_token()
    if token is None:
        sys.stderr.write("Cache miss — fetching new token from Auth0...\n")
        token, expires_in = fetch_token(config)
        save_token(token, expires_in)
    else:
        sys.stderr.write("Using cached token.\n")

    print(token)


if __name__ == "__main__":
    main()