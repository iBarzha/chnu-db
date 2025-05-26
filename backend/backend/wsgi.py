"""
WSGI конфігурація для проєкту backend.

Вона експортує WSGI callable як змінну модуля з назвою ``application``.

Детальніше про цей файл дивіться:
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()
