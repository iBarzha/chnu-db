from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from .models import Course, TeacherDatabase, Task

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Сериалізатор для моделі User.
    Надає інформацію про користувача, включаючи профіль.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 'profile_picture', 'bio']
        read_only_fields = ['id', 'role']

class RegisterSerializer(serializers.ModelSerializer):
    """
    Сериалізатор для реєстрації користувача.
    Обробляє створення користувача з валідацією пароля.
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
        Створює та повертає нового користувача з зашифрованим паролем та роллю.
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
    Кастомний JWT-сериалізатор, що додає роль користувача в токен
    та повертає дані користувача у відповіді.
    """
    @classmethod
    def get_token(cls, user):
        """
        Додає роль користувача до payload токена.
        """
        token = super().get_token(user)
        token['role'] = user.role
        return token

    def validate(self, attrs):
        """
        Додає дані користувача до відповіді разом із токеном.
        """
        data = super().validate(attrs)
        user = self.user
        user_serializer = UserSerializer(user)
        data['user'] = user_serializer.data
        return data

class CourseSerializer(serializers.ModelSerializer):
    """
    Сериалізатор для моделі Course.
    Включає дані про вчителя та кількість завдань.
    """
    teacher = UserSerializer(read_only=True)
    assignments_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'teacher', 'created_at', 'cover_image', 'assignments_count']
        read_only_fields = ['id', 'teacher', 'created_at', 'assignments_count']

    def create(self, validated_data):
        """
        Створює новий курс з поточним користувачем як вчителем.
        """
        validated_data['teacher'] = self.context['request'].user
        return super().create(validated_data)

class TeacherDatabaseSerializer(serializers.ModelSerializer):
    """
    Сериалізатор для моделі TeacherDatabase.
    """
    class Meta:
        model = TeacherDatabase
        fields = ['id', 'name', 'sql_dump', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class TaskSerializer(serializers.ModelSerializer):
    """
    Сериалізатор для моделі Task.
    """
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'original_db', 'etalon_db', 'course', 'due_date', 'created_at', 'updated_at']
        read_only_fields = ['id', 'etalon_db', 'created_at', 'updated_at']


