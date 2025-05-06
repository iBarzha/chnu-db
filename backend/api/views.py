from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db.models import Count
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer, UserSerializer, CourseSerializer
from .models import Course

User = get_user_model()

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class ProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Course.objects.annotate(assignments_count=Count('assignments'))

        # If user is a teacher, only show their courses
        if user.role == User.Role.TEACHER:
            return queryset.filter(teacher=user)
        # If user is a student, show enrolled courses
        elif user.role == User.Role.STUDENT:
            return queryset.filter(students=user)
        # If user is an admin, show all courses
        else:
            return queryset

    def perform_create(self, serializer):
        # Ensure only teachers can create courses
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise permissions.PermissionDenied("Only teachers can create courses")
        serializer.save(teacher=user)
