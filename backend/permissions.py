from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'ADMIN'

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['TEACHER', 'ADMIN']

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'STUDENT'