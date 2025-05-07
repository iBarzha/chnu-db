from rest_framework import generics, permissions, viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db.models import Count
from django.db import connection
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer, UserSerializer, CourseSerializer, AssignmentSerializer
from .models import Course, Assignment
import json
import time

User = get_user_model()

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class ProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Course.objects.annotate(assignments_count=Count('assignments'))

        # If user is a teacher, only show their courses
        if user.role == User.Role.TEACHER:
            return queryset.filter(teacher=user)
        # If user is a student, show enrolled courses
        elif user.role == User.Role.STUDENT:
            return queryset.filter(students=user)
        # If user is an admin, show all courses
        else:
            return queryset

    def perform_create(self, serializer):
        # Ensure only teachers can create courses
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise permissions.PermissionDenied("Only teachers can create courses")
        serializer.save(teacher=user)

    @action(detail=True, methods=['get'])
    def get_assignments(self, request, pk=None):
        course = self.get_object()
        assignments = Assignment.objects.filter(course=course)
        serializer = AssignmentSerializer(assignments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assignments(self, request, pk=None):
        course = self.get_object()

        # Ensure only teachers can create assignments
        user = request.user
        if user.role != User.Role.TEACHER or course.teacher != user:
            raise permissions.PermissionDenied("Only the course teacher can create assignments")

        # Process the demo_queries and task_queries from the request data
        data = request.data.copy()

        # Add the course to the data
        data['course'] = course.id

        # Set default values for schema_script and solution_hash if not provided
        if 'schema_script' not in data:
            data['schema_script'] = ''
        if 'solution_hash' not in data:
            data['solution_hash'] = ''

        # Store the theory field in the description if it exists
        if 'theory' in data:
            if 'description' in data:
                data['description'] = f"{data['description']}\n\n{data['theory']}"
            else:
                data['description'] = data['theory']

        # Create the assignment
        serializer = AssignmentSerializer(data=data)
        if serializer.is_valid():
            assignment = serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def execute_sql(request):
    """
    Execute SQL query and return results using a temporary schema.
    """
    sql_query = request.data.get('query', '')

    if not sql_query:
        return Response({'error': 'No SQL query provided'}, status=status.HTTP_400_BAD_REQUEST)

    # Generate a unique schema name for this user session
    # Use user ID and a timestamp to ensure uniqueness
    user_id = request.user.id
    schema_name = f"temp_schema_{user_id}_{int(time.time())}"

    try:
        with connection.cursor() as cursor:
            # Create a temporary schema for this session
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")

            # Set the search path to use the temporary schema
            cursor.execute(f"SET search_path TO {schema_name}, public")

            # Execute the user's SQL query
            cursor.execute(sql_query)

            # Check if the query is a SELECT query
            if sql_query.strip().upper().startswith('SELECT'):
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()

                # Convert rows to list of dicts
                results = []
                for row in rows:
                    results.append(dict(zip(columns, row)))

                return Response({
                    'columns': columns,
                    'rows': results,
                    'rowCount': len(results),
                    'query': sql_query
                })
            else:
                # For non-SELECT queries, return affected rows
                return Response({
                    'affectedRows': cursor.rowcount,
                    'query': sql_query
                })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        # Clean up: Drop the temporary schema when done
        # This ensures we don't leave behind temporary schemas
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE")
        except Exception as cleanup_error:
            # Log cleanup errors but don't fail the request
            print(f"Error cleaning up temporary schema: {cleanup_error}")

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_schema(request):
    """
    Get database schema information for the temporary schema.
    """
    # Generate a unique schema name for this user session
    user_id = request.user.id
    schema_name = f"temp_schema_{user_id}_{int(time.time())}"

    try:
        with connection.cursor() as cursor:
            # Create a temporary schema for this session
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")

            # Set the search path to use the temporary schema
            cursor.execute(f"SET search_path TO {schema_name}, public")

            # Get list of tables in the temporary schema
            if connection.vendor == 'postgresql':
                # First, get tables from the temporary schema
                cursor.execute(f"""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = '{schema_name}'
                """)
                temp_tables = [row[0] for row in cursor.fetchall()]

                # Get columns for each table in the temporary schema
                schema = {}
                for table in temp_tables:
                    cursor.execute(f"""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = '{table}' AND table_schema = '{schema_name}'
                    """)
                    columns = [{'name': row[0], 'type': row[1]} for row in cursor.fetchall()]
                    schema[table] = columns

                # If no tables in temporary schema, create a sample table to demonstrate
                if not temp_tables:
                    # Create a sample table in the temporary schema
                    cursor.execute(f"""
                        CREATE TABLE {schema_name}.example (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(100),
                            created_at TIMESTAMP DEFAULT NOW()
                        )
                    """)

                    # Add the sample table to the schema
                    schema['example'] = [
                        {'name': 'id', 'type': 'integer'},
                        {'name': 'name', 'type': 'character varying'},
                        {'name': 'created_at', 'type': 'timestamp without time zone'}
                    ]

                return Response(schema)
            else:
                return Response({'error': 'Unsupported database vendor'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    finally:
        # Clean up: Drop the temporary schema when done
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE")
        except Exception as cleanup_error:
            # Log cleanup errors but don't fail the request
            print(f"Error cleaning up temporary schema: {cleanup_error}")
