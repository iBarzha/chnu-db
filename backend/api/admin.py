from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Course

class CustomUserAdmin(UserAdmin):
    """
    Адмін-конфігурація для кастомної моделі User.
    Розширює UserAdmin Django, додає поля та дії для ролей.
    """
    list_display = ('username', 'email', 'role', 'first_name', 'last_name', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    actions = ['make_admin', 'make_teacher', 'make_student']

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Особиста інформація', {'fields': ('first_name', 'last_name', 'email', 'role', 'profile_picture')}),
        ('Права', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )

    @admin.action(description="Зробити обраних користувачів адміністраторами")
    def make_admin(self, request, queryset):
        """
        Дія для встановлення ролі адміністратора.
        Також встановлює is_staff=True.
        """
        updated = queryset.update(role=User.Role.ADMIN, is_staff=True)
        self.message_user(request, f'{updated} користувачів оновлено до ролі Адміністратор.')

    @admin.action(description="Зробити обраних користувачів вчителями")
    def make_teacher(self, request, queryset):
        """
        Дія для встановлення ролі вчителя.
        """
        updated = queryset.update(role=User.Role.TEACHER)
        self.message_user(request, f'{updated} користувачів оновлено до ролі Вчитель.')

    @admin.action(description="Зробити обраних користувачів студентами")
    def make_student(self, request, queryset):
        """
        Дія для встановлення ролі студента.
        """
        updated = queryset.update(role=User.Role.STUDENT)
        self.message_user(request, f'{updated} користувачів оновлено до ролі Студент.')

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """
    Адмін-конфігурація для моделі Course.
    """
    list_display = ('title', 'teacher', 'created_at')
    list_filter = ('teacher',)

admin.site.register(User, CustomUserAdmin)
