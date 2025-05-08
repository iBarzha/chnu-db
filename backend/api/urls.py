from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, LoginView, ProfileView, CourseViewSet, execute_sql, get_schema, AssignmentViewSet

# Create a router for viewsets
router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'assignments', AssignmentViewSet, basename='assignment')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/profile/', ProfileView.as_view(), name='profile'),

    # SQL execution endpoints
    path('sql/execute/', execute_sql, name='execute_sql'),
    path('sql/schema/', get_schema, name='get_schema'),

    # Include the router URLs
    path('', include(router.urls)),
]
