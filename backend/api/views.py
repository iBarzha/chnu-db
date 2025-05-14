from rest_framework import generics, permissions, viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db.models import Count, Manager
from django.db import connection
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer, UserSerializer, CourseSerializer, AssignmentSerializer
from .models import Course, Assignment
import time

# Type hints for Django models
Course.objects: Manager
Assignment.objects: Manager

User = get_user_model()

class UserListView(generics.ListAPIView):
    """
    API view to retrieve list of all users.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer

class RegisterView(generics.CreateAPIView):
    """
    API view for user registration.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class LoginView(TokenObtainPairView):
    """
    API view for user login with JWT token generation.
    """
    serializer_class = CustomTokenObtainPairSerializer

class ProfileView(generics.RetrieveAPIView):
    """
    API view for retrieving the current user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """
        Return the authenticated user as the object to retrieve.
        """
        return self.request.user

class CourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing courses.
    Provides CRUD operations for courses with role-based access control.
    """
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return a queryset of courses filtered based on the user's role.
        Teachers see only their courses, students see enrolled courses,
        and admins see all courses.
        """
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
        """
        Ensure only teachers can create courses and set the teacher field.
        """
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Only teachers can create courses")
        serializer.save(teacher=user)

    @action(detail=True, methods=['get'])
    def get_assignments(self, request, pk=None):
        """
        Retrieve all assignments for a specific course.
        """
        course = self.get_object()
        assignments = Assignment.objects.filter(course=course)
        serializer = AssignmentSerializer(assignments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assignments(self, request, pk=None):
        """
        Create a new assignment for a specific course.
        Only the course teacher can create assignments.
        """
        course = self.get_object()

        # Ensure only teachers can create assignments
        user = request.user
        if user.role != User.Role.TEACHER or course.teacher != user:
            raise PermissionDenied("Only the course teacher can create assignments")

        # Process the demo_queries and task_queries from the request data
        data = request.data.copy()

        # Add the course to the data
        data['course'] = course.id

        # Set default values for schema_script and solution_hash if not provided
        if 'schema_script' not in data:
            data['schema_script'] = ''
        if 'solution_hash' not in data:
            data['solution_hash'] = ''

        # Store the theory field in the description if it exists
        if 'theory' in data:
            if 'description' in data:
                data['description'] = f"{data['description']}\n\n{data['theory']}"
            else:
                data['description'] = data['theory']

        # Create the assignment
        serializer = AssignmentSerializer(data=data)
        if serializer.is_valid():
            assignment = serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class AssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing assignments.
    Provides read-only access to assignments.
    """
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return all assignments.
        """
        return Assignment.objects.all()
