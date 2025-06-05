from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    CourseViewSet,
    TeacherDatabaseViewSet,
    TaskViewSet,
    get_database_schema,
    sql_history,
    task_schema,
    task_submit,   # використовується тепер як «execute» (Preview SQL)
)

# Створюємо роутер для ViewSet
router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'teacher-databases', TeacherDatabaseViewSet, basename='teacher-database')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    # ----------------------------------------
    # 1) Маршрути авторизації та профілю
    # ----------------------------------------
    # Реєстрація нового користувача
    path('auth/register/', RegisterView.as_view(), name='register'),
    # Логін (отримання JWT)
    path('auth/login/',    LoginView.as_view(),    name='login'),
    # Перегляд та оновлення профілю (треба бути авторизованим)
    path('auth/profile/',  ProfileView.as_view(),  name='profile'),

    # ----------------------------------------
    # 2) SQL-ендпоінти (як були в старому файлі: execute-sql/, database-schema/, sql-history/)
    # ----------------------------------------
    # 2.a) «Preview SQL»: замість execute-sql/ → запускаємо SQL студента на початковому дампі через task_submit
    #      Тепер за адресою POST /tasks/{pk}/execute/ (pk – id задачі)
    path('tasks/<int:pk>/execute/', task_submit, name='task-execute'),

    # 2.b) Повернути схему довільної бази (старий database-schema/{database_id}/)
    path('database-schema/<str:database_id>/', get_database_schema, name='database-schema'),

    # 2.c) Історія SQL-запитів користувача (sql_history)
    path('sql-history/', sql_history, name='sql-history'),

    # ----------------------------------------
    # 3) Task-специфічні ендпоінти
    # ----------------------------------------
    # 3.a) Отримати схему конкретної задачі (створює тимчасову БД, якщо її ще немає)
    path('tasks/<int:pk>/schema/', task_schema, name='task-schema'),

    # 3.b) «Порівняння з еталоном» (submit) НАДАЛІ обробляється виключно в TaskViewSet через @action(detail=True, methods=['post'], url_path='submit')
    #      Тому в цьому файлі додавати окремий path('tasks/<int:pk>/submit/', ...) вже не потрібно —
    #      після підключення router.urls доступний POST /tasks/{pk}/submit/ автоматично.

    # ----------------------------------------
    # 4) Підключення всіх ViewSet-роутів (router)
    # ----------------------------------------
    #    − /courses/, /courses/{pk}/
    #    − /teacher-databases/, /teacher-databases/{pk}/
    #    − /tasks/, /tasks/{pk}/, а також POST /tasks/{pk}/submit/
    path('', include(router.urls)),
]
