from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Course, Assignment, Submission
from django.contrib.admin.exceptions import NotRegistered

# Try to unregister the User model if it's already registered
try:
    admin.site.unregister(User)
except NotRegistered:
    pass

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'role', 'profile_picture')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'created_at')
    list_filter = ('teacher',)

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'is_published')
    raw_id_fields = ('course',)

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('assignment', 'student', 'is_correct', 'submitted_at')
    list_filter = ('is_correct', 'assignment__course')

admin.site.register(User, CustomUserAdmin)
