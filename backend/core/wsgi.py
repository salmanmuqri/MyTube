"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application
from django.core.management import execute_from_command_line

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')


def _run_startup_migrations_once():
	# Fallback safety: some PaaS setups override start commands in dashboard.
	# Run migrate here to avoid runtime 500s from missing tables.
	if os.environ.get('WSGI_AUTO_MIGRATED') == '1':
		return
	if os.environ.get('AUTO_MIGRATE_ON_STARTUP', '1').lower() not in ('1', 'true', 'yes'):
		return
	execute_from_command_line(['manage.py', 'migrate', '--noinput'])
	os.environ['WSGI_AUTO_MIGRATED'] = '1'


_run_startup_migrations_once()

application = get_wsgi_application()
