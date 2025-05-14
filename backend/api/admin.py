from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Course, Assignment, Submission

class CustomUserAdmin(UserAdmin):
    """
    Admin configuration for the custom User model.
    Extends Django's UserAdmin with role-specific fields and actions.
    """
    list_display = ('username', 'email', 'role', 'first_name', 'last_name', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    actions = ['make_admin', 'make_teacher', 'make_student']

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'role', 'profile_picture')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

    @admin.action(description="Set selected users as Administrators")
    def make_admin(self, request, queryset):
        """
        Action to set selected users as administrators.
        Also sets is_staff to True.
        """
        updated = queryset.update(role=User.Role.ADMIN, is_staff=True)
        self.message_user(request, f'{updated} users were successfully updated to Admin role.')

    @admin.action(description="Set selected users as Teachers")
    def make_teacher(self, request, queryset):
        """
        Action to set selected users as teachers.
        """
        updated = queryset.update(role=User.Role.TEACHER)
        self.message_user(request, f'{updated} users were successfully updated to Teacher role.')

    @admin.action(description="Set selected users as Students")
    def make_student(self, request, queryset):
        """
        Action to set selected users as students.
        """
        updated = queryset.update(role=User.Role.STUDENT)
        self.message_user(request, f'{updated} users were successfully updated to Student role.')

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Course model.
    """
    list_display = ('title', 'teacher', 'created_at')
    list_filter = ('teacher',)

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Assignment model.
    """
    list_display = ('title', 'course', 'created_at')
    raw_id_fields = ('course',)

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Submission model.
    """
    list_display = ('assignment', 'student', 'is_correct', 'submitted_at')
    list_filter = ('is_correct', 'assignment__course')

admin.site.register(User, CustomUserAdmin)
