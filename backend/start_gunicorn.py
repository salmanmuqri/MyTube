import os
import subprocess
import sys


def resolve_port() -> int:
    raw = os.environ.get('PORT', '8000').strip()
    try:
        port = int(raw)
    except ValueError:
        print(f"Invalid PORT value {raw!r}; falling back to 8000", file=sys.stderr)
        return 8000
    if not (1 <= port <= 65535):
        print(f"PORT {port} out of range; falling back to 8000", file=sys.stderr)
        return 8000
    return port


def main() -> None:
    db_url = os.environ.get('DATABASE_URL', '').strip()
    if db_url:
        print('Using DATABASE_URL for Django database connection.', flush=True)
    else:
        print('DATABASE_URL not set; Django may use fallback database settings.', flush=True)

    # Ensure schema exists before serving requests, but do not block app boot on migration failures.
    try:
        subprocess.run([sys.executable, 'manage.py', 'migrate', '--noinput'], check=False, timeout=180)
    except Exception as exc:
        print(f"Startup migration skipped due to error: {exc}", file=sys.stderr, flush=True)

    port = resolve_port()
    bind = f"0.0.0.0:{port}"
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
