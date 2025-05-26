"""
URL конфігурація для проєкту backend.

Список `urlpatterns` маршрутизує URL-адреси до view. Детальніше дивіться:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Приклади:
Функціональні view
    1. Додайте імпорт:  from my_app import views
    2. Додайте URL до urlpatterns:  path('', views.home, name='home')
Клас-бейзед view
    1. Додайте імпорт:  from other_app.views import Home
    2. Додайте URL до urlpatterns:  path('', Home.as_view(), name='home')
Включення іншого URLconf
    1. Імпортуйте функцію include: from django.urls import include, path
    2. Додайте URL до urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
