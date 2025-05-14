from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Adds role-based permissions and profile picture.
    """
    class Role(models.TextChoices):
        """
        Enumeration of possible user roles.
        """
        ADMIN = 'ADMIN', 'Administrator'
        TEACHER = 'TEACHER', 'Teacher'
        STUDENT = 'STUDENT', 'Student'

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.STUDENT
    )
    email = models.EmailField(unique=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)

    def save(self, *args, **kwargs):
        """
        Override save method to automatically set is_staff=True for admin users.
        """
        # Automatically set is_staff=True for users with ADMIN role
        if self.role == self.Role.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    def __str__(self):
        """
        String representation of the user.
        """
        return f"{self.username} ({self.get_role_display()})"

    class Meta:
        db_table = 'api_user'

class Course(models.Model):
    """
    Model representing a course.
    A course has a teacher, enrolled students, and can contain assignments.
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
        String representation of the course.
        """
        return self.title

    class Meta:
        ordering = ['-created_at']

class Assignment(models.Model):
    """
    Model representing an assignment within a course.
    Contains SQL tasks for students to complete.
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    title = models.CharField(max_length=200)
    description = models.TextField()
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    schema_script = models.TextField(help_text="SQL to initialize the database")
    solution_hash = models.CharField(max_length=64, help_text="Hash of the reference solution")

    def __str__(self):
        """
        String representation of the assignment.
        """
        return f"{self.title} ({self.course.title})"

    class Meta:
        ordering = ['-created_at']

class Submission(models.Model):
    """
    Model representing a student's submission for an assignment.
    Stores the SQL query, result, and correctness status.
    """
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'role': User.Role.STUDENT},
        related_name='submissions'
    )
    query = models.TextField()
    result_json = models.JSONField(null=True)  # Raw query result
    is_correct = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(auto_now_add=True)
    execution_time = models.FloatField(null=True)  # Execution time in seconds

    def __str__(self):
        """
        String representation of the submission.
        """
        return f"Submission by {self.student.username} for {self.assignment.title}"

    class Meta:
        ordering = ['-submitted_at']

class TeacherDatabase(models.Model):
    """
    Represents a SQL database dump uploaded by a teacher.
    """
    name = models.CharField(max_length=100)
    teacher = models.ForeignKey(
        User, on_delete=models.CASCADE,
        limit_choices_to={'role': User.Role.TEACHER},
        related_name='uploaded_databases'
    )
    sql_dump = models.FileField(upload_to='teacher_dumps/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.teacher.username})"
