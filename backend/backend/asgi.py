"""
ASGI конфігурація для проєкту backend.

Вона експортує ASGI callable як змінну модуля з назвою ``application``.

Детальніше про цей файл дивіться:
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_asgi_application()
