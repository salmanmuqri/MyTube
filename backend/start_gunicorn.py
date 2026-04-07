import os
import re
import subprocess
import sys


def resolve_port() -> int:
    candidates = [
        os.environ.get('PORT', ''),
        os.environ.get('RAILWAY_PORT', ''),
        os.environ.get('WEB_PORT', ''),
    ]

    for raw in candidates:
        value = (raw or '').strip()
        if not value:
            continue

        # Handle accidental env values like "$PORT" by dereferencing once.
        if value.startswith('$') and len(value) > 1:
            value = os.environ.get(value[1:], value).strip()

        match = re.search(r'\d+', value)
        if not match:
            continue

        port = int(match.group(0))
        if 1 <= port <= 65535:
            return port

    print('No valid PORT-like value found; falling back to 8080', file=sys.stderr, flush=True)
    return 8080


def main() -> None:
    db_url = os.environ.get('DATABASE_URL', '').strip()
    if db_url:
        print('Using DATABASE_URL for Django database connection.', flush=True)
    else:
        print('DATABASE_URL not set; Django may use fallback database settings.', flush=True)

    # Ensure schema exists before serving requests, but do not block app boot on migration failures.
    try:
        subprocess.run([sys.executable, 'manage.py', 'migrate', '--noinput'], check=False, timeout=120)
    except Exception as exc:
        print(f"Startup migration skipped due to error: {exc}", file=sys.stderr, flush=True)

    port = resolve_port()
    bind = f"0.0.0.0:{port}"
    print(f"Starting gunicorn on {bind}", flush=True)
    os.execvp(
        'gunicorn',
        [
            'gunicorn',
            'core.wsgi:application',
            '--bind',
            bind,
            '--workers',
            '1',
            '--threads',
            '4',
            '--timeout',
            '1800',
            '--access-logfile',
            '-',
            '--error-logfile',
            '-',
        ],
    )


if __name__ == '__main__':
    main()
