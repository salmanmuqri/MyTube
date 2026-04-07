"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
import subprocess
import sys
import threading

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')


def _run_startup_migrations_once():
	# Fallback safety: some PaaS setups override start commands in dashboard.
	# Run migrate in background so app boot never blocks.
	if os.environ.get('WSGI_AUTO_MIGRATED') == '1':
		return
	if os.environ.get('AUTO_MIGRATE_ON_STARTUP', '1').lower() not in ('1', 'true', 'yes'):
		return

	def _migrate_background():
		try:
			subprocess.run(
				[sys.executable, 'manage.py', 'migrate', '--noinput'],
				check=False,
				timeout=180,
			)
		except Exception:
			# Keep startup resilient even if DB is temporarily unavailable.
			pass

	threading.Thread(target=_migrate_background, daemon=True).start()
	os.environ['WSGI_AUTO_MIGRATED'] = '1'


_run_startup_migrations_once()

application = get_wsgi_application()
