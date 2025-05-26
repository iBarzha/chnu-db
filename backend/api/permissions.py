from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        """
        Дозвіл лише для адміністраторів.
        """
        return request.user.role == 'ADMIN'

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        """
        Дозвіл для вчителів та адміністраторів.
        """
        return request.user.role in ['TEACHER', 'ADMIN']

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        """
        Дозвіл лише для студентів.
        """
        return request.user.role == 'STUDENT'

