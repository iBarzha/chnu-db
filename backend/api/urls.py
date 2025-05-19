from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, ProfileView, CourseViewSet, 
    AssignmentViewSet, TeacherDatabaseViewSet, 
    execute_sql_query, get_database_schema
)

# Create a router for viewsets
router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'assignments', AssignmentViewSet, basename='assignment')
router.register(r'teacher-databases', TeacherDatabaseViewSet, basename='teacher-database')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),

    # SQL execution endpoints
    path('execute-sql/', execute_sql_query, name='execute-sql'),
    path('database-schema/<int:database_id>/', get_database_schema, name='database-schema'),

    # Include the router URLs
    path('', include(router.urls)),
]
