from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Кастомна модель користувача, що розширює AbstractUser Django.
    Додає ролі, фото профілю та біографію.
    """
    class Role(models.TextChoices):
        """
        Перелік можливих ролей користувача.
        """
        ADMIN = 'ADMIN', 'Адміністратор'
        TEACHER = 'TEACHER', 'Вчитель'
        STUDENT = 'STUDENT', 'Студент'

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT
    )
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    bio = models.TextField(blank=True, null=True, help_text="Біографія або опис користувача")

    def save(self, *args, **kwargs):
        """
        Перевизначає save для автоматичного встановлення is_staff=True для адміністраторів.
        """
        # Автоматично встановлює is_staff=True для ADMIN
        if self.role == self.Role.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    def __str__(self):
        """
        Текстове представлення користувача.
        """
        return f"{self.username} ({self.get_role_display()})"

    class Meta:
        db_table = 'api_user'

class Course(models.Model):
    """
    Модель курсу.
    Курс має вчителя, студентів та може містити завдання.
    """
    title = models.CharField(max_length=200)
    description = models.TextField()
    teacher = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_courses',
        limit_choices_to={'role': User.Role.TEACHER}
    )
    students = models.ManyToManyField(
        User,
        related_name='enrolled_courses',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    cover_image = models.ImageField(upload_to='course_covers/', null=True, blank=True)

    def __str__(self):
        """
        Текстове представлення курсу.
        """
        return self.title

    class Meta:
        ordering = ['-created_at']

class TeacherDatabase(models.Model):
    """
    SQL-дамп бази даних, завантажений вчителем.
    """
    name = models.CharField(max_length=100)
    teacher = models.ForeignKey(
        User, on_delete=models.CASCADE,
        limit_choices_to={'role': User.Role.TEACHER},
        related_name='uploaded_databases'
    )
    sql_dump = models.FileField(upload_to='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.teacher.username})"

class TemporaryDatabase(models.Model):
    """
    Тимчасова база PostgreSQL, створена для сесії користувача.
    Створюється при виборі бази в редакторі SQL і видаляється після завершення сесії.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='temporary_databases')
    teacher_database = models.ForeignKey(TeacherDatabase, on_delete=models.CASCADE, related_name='temporary_instances', null=True, blank=True)
    database_name = models.CharField(max_length=100, unique=True)
    session_key = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Temp DB: {self.database_name} (User: {self.user.username})"

class Task(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    # Оригінальний файл бази (завантажений вчителем)
    original_db = models.FileField(upload_to='teacher_dumps/')
    # Еталонний файл бази (після маніпуляцій вчителя)
    etalon_db = models.FileField(upload_to='teacher_dumps/', blank=True, null=True)
    course = models.ForeignKey('Course', on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class SQLHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sql_history')
    query = models.TextField()
    executed_at = models.DateTimeField(auto_now_add=True)
    database = models.ForeignKey(TeacherDatabase, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}: {self.query[:30]}... ({self.executed_at})"
