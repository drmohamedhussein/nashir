#!/usr/bin/env python3
"""Rotate AUTH_SECRET, CRON_SECRET, and MySQL password. Prints JSON status, never secret values."""
import json
import re
import secrets
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote, unquote, urlparse


def env_get(text: str, name: str) -> str:
    match = re.search(rf'^{re.escape(name)}="?([^"\n]+)"?', text, re.M)
    return match.group(1) if match else ""


def env_set(text: str, name: str, value: str) -> str:
    line = f'{name}="{value}"'
    if re.search(rf"^{re.escape(name)}=", text, re.M):
        return re.sub(rf"^{re.escape(name)}=.*$", line, text, flags=re.M)
    return text.rstrip() + "\n" + line + "\n"


def wp_get(text: str, name: str) -> str:
    match = re.search(rf"define\(\s*'{re.escape(name)}'\s*,\s*'([^']*)'", text)
    return match.group(1) if match else ""


def wp_set(text: str, name: str, value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("'", "\\'")
    return re.sub(
        rf"(define\(\s*'{re.escape(name)}'\s*,\s*')([^']*)(')",
        rf"\g<1>{escaped}\3",
        text,
        count=1,
    )


def mysql(sql: str, user: str, password: str, host: str, port: str, database: str = "") -> str:
    cmd = ["mysql", "-h", host, "-P", port, "-u", user, f"-p{password}", "-N", "-B"]
    if database:
        cmd.append(database)
    cmd.extend(["-e", sql])
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode:
        raise SystemExit("mysql failed: " + (result.stderr or result.stdout)[:400])
    return result.stdout


def main() -> None:
    web_env = Path(sys.argv[1])
    wp_config = Path(sys.argv[2])
    env_text = web_env.read_text(encoding="utf-8")
    wp_text = wp_config.read_text(encoding="utf-8")

    db_url = env_get(env_text, "DATABASE_URL")
    if not db_url.startswith("mysql://"):
        raise SystemExit("DATABASE_URL is not mysql")
    parsed = urlparse(db_url.replace("mysql://", "http://", 1))
    db_user = unquote(parsed.username or "")
    db_pass = unquote(parsed.password or "")
    db_name = parsed.path.lstrip("/")
    db_host = parsed.hostname or "127.0.0.1"
    db_port = str(parsed.port or 3306)

    wp_user = wp_get(wp_text, "DB_USER")
    wp_name = wp_get(wp_text, "DB_NAME")
    if wp_user and wp_user != db_user:
        raise SystemExit("wp-config DB_USER does not match SaaS DATABASE_URL user")
    if wp_name and wp_name != db_name:
        raise SystemExit("wp-config DB_NAME does not match SaaS DATABASE_URL db")

    wp_tables = mysql(
        f"SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='{db_name}' AND TABLE_NAME='wp_options'",
        db_user,
        db_pass,
        db_host,
        db_port,
    ).strip()
    if wp_tables != "1":
        raise SystemExit("refusing rotation: wp_options missing")

    new_auth = secrets.token_hex(32)
    new_cron = secrets.token_hex(32)
    new_db = secrets.token_urlsafe(24)

    def try_mysql(sql: str, password: str) -> None:
        mysql(sql, db_user, password, db_host, db_port)

    hosts = []
    try:
        hosts = [
            line.strip()
            for line in mysql(
                f"SELECT Host FROM mysql.user WHERE User='{db_user}'",
                db_user,
                db_pass,
                db_host,
                db_port,
            ).splitlines()
            if line.strip()
        ]
    except SystemExit:
        hosts = []
    if not hosts:
        hosts = ["localhost", "127.0.0.1", "%"]
        try_mysql(f"ALTER USER CURRENT_USER() IDENTIFIED BY '{new_db}'", db_pass)
    for host in hosts:
        try:
            try_mysql(f"ALTER USER '{db_user}'@'{host}' IDENTIFIED BY '{new_db}'", db_pass)
        except SystemExit:
            continue
    mysql("SELECT option_value FROM wp_options WHERE option_name='siteurl' LIMIT 1", db_user, new_db, db_host, db_port, db_name)
    mysql("SELECT COUNT(*) FROM rp_user", db_user, new_db, db_host, db_port, db_name)

    new_url = f"mysql://{quote(db_user, safe='')}:{quote(new_db, safe='')}@{db_host}:{db_port}/{db_name}"
    env_text = env_set(env_text, "DATABASE_URL", new_url)
    env_text = env_set(env_text, "AUTH_SECRET", new_auth)
    env_text = env_set(env_text, "CRON_SECRET", new_cron)
    web_env.write_text(env_text, encoding="utf-8")
    wp_config.write_text(wp_set(wp_text, "DB_PASSWORD", new_db), encoding="utf-8")

    cron_updated = 0
    listed = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    if listed.returncode == 0 and "cron/tick" in listed.stdout:
        updated = re.sub(r"Bearer\s+\S+", "Bearer " + new_cron, listed.stdout)
        subprocess.run(["crontab", "-"], input=updated, text=True, check=True)
        cron_updated = 1

    print(
        json.dumps(
            {
                "ok": True,
                "wp_options": True,
                "rp_user": True,
                "auth_rotated": True,
                "cron_rotated": True,
                "mysql_rotated": True,
                "cron_tab_updated": cron_updated,
                "mysql_hosts": hosts,
            }
        )
    )


if __name__ == "__main__":
    main()
