from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from .models import Course, Assignment, TeacherDatabase


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model.
    Provides basic user information.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name']
        read_only_fields = ['id', 'role']

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Handles user creation with password validation.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    role = serializers.ChoiceField(choices=User.Role.choices)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'role']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        """
        Create and return a new user with encrypted password and role.
        """
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', User.Role.STUDENT)
        )
        return user

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes user role in the token
    and returns user data in the response.
    """
    @classmethod
    def get_token(cls, user):
        """
        Add user role to the token payload.
        """
        token = super().get_token(user)
        token['role'] = user.role
        return token

    def validate(self, attrs):
        """
        Add user data to the response along with the token.
        """
        data = super().validate(attrs)

        # Add user data to response using UserSerializer
        user = self.user
        user_serializer = UserSerializer(user)
        data['user'] = user_serializer.data

        return data

class CourseSerializer(serializers.ModelSerializer):
    """
    Serializer for the Course model.
    Includes teacher details and assignment count.
    """
    teacher = UserSerializer(read_only=True)
    assignments_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'teacher', 'created_at', 'cover_image', 'assignments_count']
        read_only_fields = ['id', 'teacher', 'created_at', 'assignments_count']

    def create(self, validated_data):
        """
        Create a new course with the current user as the teacher.
        """
        # Set the current user as the teacher
        validated_data['teacher'] = self.context['request'].user
        return super().create(validated_data)

class AssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for the Assignment model.
    Handles assignment creation and retrieval.
    """
    schema_script = serializers.CharField(required=False, default='')
    solution_hash = serializers.CharField(required=False, default='')

    class Meta:
        model = Assignment
        fields = ['id', 'course', 'title', 'description', 'due_date', 'created_at', 'schema_script', 'solution_hash']
        read_only_fields = ['id', 'created_at']

class TeacherDatabaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherDatabase
        fields = ['id', 'name', 'sql_dump', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']