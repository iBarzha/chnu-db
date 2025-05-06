from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Course, Assignment, Submission
from django.http import HttpResponseRedirect
from django.contrib import messages

class CustomUserAdmin(UserAdmin):
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

    def make_admin(self, request, queryset):
        updated = queryset.update(role=User.Role.ADMIN, is_staff=True)
        self.message_user(request, f'{updated} users were successfully updated to Admin role.')
    make_admin.short_description = "Set selected users as Administrators"

    def make_teacher(self, request, queryset):
        updated = queryset.update(role=User.Role.TEACHER)
        self.message_user(request, f'{updated} users were successfully updated to Teacher role.')
    make_teacher.short_description = "Set selected users as Teachers"

    def make_student(self, request, queryset):
        updated = queryset.update(role=User.Role.STUDENT)
        self.message_user(request, f'{updated} users were successfully updated to Student role.')
    make_student.short_description = "Set selected users as Students"

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'created_at')
    list_filter = ('teacher',)

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'created_at')
    raw_id_fields = ('course',)

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('assignment', 'student', 'is_correct', 'submitted_at')
    list_filter = ('is_correct', 'assignment__course')

admin.site.register(User, CustomUserAdmin)
