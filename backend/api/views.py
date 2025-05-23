from rest_framework import generics, permissions, viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import MultiPartParser
from django.contrib.auth import get_user_model
from django.db.models import Count, Manager
from django.db import connection
import json
import os
import psycopg2
import psycopg2.extras
from django.conf import settings
from .serializers import RegisterSerializer, CustomTokenObtainPairSerializer, UserSerializer, CourseSerializer, AssignmentSerializer, TeacherDatabaseSerializer
from .models import Course, Assignment, TeacherDatabase, TemporaryDatabase
from .models import Task
from .serializers import TaskSerializer
import tempfile
import uuid

# Type hints for Django models
Course.objects: Manager
Assignment.objects: Manager

User = get_user_model()

class UserListView(generics.ListAPIView):
    """
    API view to retrieve list of all users.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer

class RegisterView(generics.CreateAPIView):
    """
    API view for user registration.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class LoginView(TokenObtainPairView):
    """
    API view for user login with JWT token generation.
    """
    serializer_class = CustomTokenObtainPairSerializer

class ProfileView(generics.RetrieveUpdateAPIView):
    """
    API view for retrieving and updating the current user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def get_object(self):
        """
        Return the authenticated user as the object to retrieve or update.
        """
        return self.request.user

class CourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing courses.
    Provides CRUD operations for courses with role-based access control.
    """
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return a queryset of courses filtered based on the user's role.
        Teachers see only their courses, students see enrolled courses,
        and admins see all courses.
        """
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
        """
        Ensure only teachers can create courses and set the teacher field.
        """
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Only teachers can create courses")
        serializer.save(teacher=user)

    @action(detail=True, methods=['get'])
    def get_assignments(self, request, pk=None):
        """
        Retrieve all assignments for a specific course.
        """
        course = self.get_object()
        assignments = Assignment.objects.filter(course=course)
        serializer = AssignmentSerializer(assignments, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve method to include assignments in the course details.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Include assignments in the response
        assignments = Assignment.objects.filter(course=instance)
        assignment_serializer = AssignmentSerializer(assignments, many=True)
        data['assignments'] = assignment_serializer.data

        return Response(data)

    @action(detail=True, methods=['post'])
    def assignments(self, request, pk=None):
        """
        Create a new assignment for a specific course.
        Only the course teacher can create assignments.
        """
        course = self.get_object()

        # Ensure only teachers can create assignments
        user = request.user
        if user.role != User.Role.TEACHER or course.teacher != user:
            raise PermissionDenied("Only the course teacher can create assignments")

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

class TeacherDatabaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet to allow teachers to upload SQL database dumps.
    """
    queryset = TeacherDatabase.objects.all()
    serializer_class = TeacherDatabaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        """
        Teachers see only their own uploaded databases.
        """
        user = self.request.user
        if user.role == User.Role.TEACHER:
            return self.queryset.filter(teacher=user)
        return TeacherDatabase.objects.none()

    def perform_create(self, serializer):
        """
        Only teachers can upload SQL dumps.
        """
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Only teachers can upload database dumps.")
        serializer.save(teacher=user)

class AssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing assignments.
    Provides read-only access to assignments.
    """
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return all assignments.
        """
        return Assignment.objects.all()

class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tasks. Teachers can create tasks, upload/select a database, and save the etalon (reference) database after manipulations.
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Only teachers can create tasks.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='save_etalon')
    def save_etalon(self, request, pk=None):
        """
        Apply teacher's SQL manipulations to a temp copy of the original DB, dump the result, and save as etalon_db.
        Expects: { "sql": "...teacher's SQL manipulations..." }
        """
        from django.core.files import File
        task = self.get_object()
        sql = request.data.get('sql')
        if not sql:
            return Response({'error': 'No SQL provided.'}, status=400)
        if not task.original_db:
            return Response({'error': 'No original DB file attached to this task.'}, status=400)
        # Create a temp DB and apply the original dump
        db_config = settings.DATABASES['default']
        temp_db_name = f"etalon_db_{uuid.uuid4().hex[:16]}"
        admin_conn = psycopg2.connect(
            dbname=db_config['NAME'], user=db_config['USER'], password=db_config['PASSWORD'],
            host=db_config['HOST'], port=db_config['PORT']
        )
        admin_conn.autocommit = True
        admin_cursor = admin_conn.cursor()
        try:
            admin_cursor.execute(f"CREATE DATABASE {temp_db_name}")
            temp_conn = psycopg2.connect(
                dbname=temp_db_name, user=db_config['USER'], password=db_config['PASSWORD'],
                host=db_config['HOST'], port=db_config['PORT']
            )
            temp_conn.autocommit = True
            temp_cursor = temp_conn.cursor()
            # Load original DB dump
            with open(task.original_db.path, 'r') as f:
                temp_cursor.execute(f.read())
            # Apply teacher's SQL
            temp_cursor.execute(sql)
            # Dump resulting DB to a temp file
            with tempfile.NamedTemporaryFile(suffix='.sql', delete=False) as tmpfile:
                dump_cmd = f"pg_dump -U {db_config['USER']} -h {db_config['HOST']} -p {db_config['PORT']} {temp_db_name} > {tmpfile.name}"
                os.system(dump_cmd)
                tmpfile.flush()
                with open(tmpfile.name, 'rb') as dumpf:
                    task.etalon_db.save(f"etalon_{task.id}.sql", File(dumpf), save=True)
            temp_cursor.close()
            temp_conn.close()
        finally:
            try:
                admin_cursor.execute(f"DROP DATABASE IF EXISTS {temp_db_name}")
            except Exception:
                pass
            admin_cursor.close()
            admin_conn.close()
        return Response({'status': 'Etalon DB saved.'})

    @action(detail=True, methods=['post'], url_path='submit', permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        """
        Student submits SQL. Apply to fresh copy of original_db, compare with etalon_db.
        Returns: {correct: bool, error: str}
        """
        sql = request.data.get('sql')
        if not sql:
            return Response({'error': 'No SQL provided.'}, status=400)
        task = self.get_object()
        if not task.original_db or not task.etalon_db:
            return Response({'error': 'Task is not fully set up.'}, status=400)
        db_config = settings.DATABASES['default']
        temp_db_name = f"student_db_{uuid.uuid4().hex[:16]}"
        admin_conn = psycopg2.connect(
            dbname=db_config['NAME'], user=db_config['USER'], password=db_config['PASSWORD'],
            host=db_config['HOST'], port=db_config['PORT']
        )
        admin_conn.autocommit = True
        admin_cursor = admin_conn.cursor()
        try:
            admin_cursor.execute(f"CREATE DATABASE {temp_db_name}")
            temp_conn = psycopg2.connect(
                dbname=temp_db_name, user=db_config['USER'], password=db_config['PASSWORD'],
                host=db_config['HOST'], port=db_config['PORT']
            )
            temp_conn.autocommit = True
            temp_cursor = temp_conn.cursor()
            # Load original DB dump
            with open(task.original_db.path, 'r') as f:
                temp_cursor.execute(f.read())
            # Apply student's SQL
            try:
                temp_cursor.execute(sql)
            except Exception as e:
                temp_cursor.close()
                temp_conn.close()
                raise e
            # Dump resulting DB to a temp file
            with tempfile.NamedTemporaryFile(suffix='.sql', delete=False) as tmpfile:
                dump_cmd = f"pg_dump -U {db_config['USER']} -h {db_config['HOST']} -p {db_config['PORT']} {temp_db_name} > {tmpfile.name}"
                os.system(dump_cmd)
                tmpfile.flush()
                # Compare with etalon
                with open(tmpfile.name, 'rb') as student_dump, open(task.etalon_db.path, 'rb') as etalon_dump:
                    student_data = student_dump.read()
                    etalon_data = etalon_dump.read()
                    correct = student_data == etalon_data
            temp_cursor.close()
            temp_conn.close()
        except Exception as e:
            try:
                admin_cursor.execute(f"DROP DATABASE IF EXISTS {temp_db_name}")
            except Exception:
                pass
            admin_cursor.close()
            admin_conn.close()
            return Response({'correct': False, 'error': str(e)})
        try:
            admin_cursor.execute(f"DROP DATABASE IF EXISTS {temp_db_name}")
        except Exception:
            pass
        admin_cursor.close()
        admin_conn.close()
        return Response({'correct': correct})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def execute_sql_query(request):
    """
    Execute a SQL query on a specified database.

    Request body should contain:
    - query: SQL query to execute
    - database_id: ID of the TeacherDatabase to use (optional)

    Returns:
    - results: Query results as a list of dictionaries
    - columns: Column names
    - error: Error message if query fails
    """
    query = request.data.get('query')
    database_id = request.data.get('database_id')

    if not query:
        return Response({'error': 'No query provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # If database_id is provided, use the specified database
        if database_id:
            try:
                teacher_db = TeacherDatabase.objects.get(id=database_id)

                # Check permissions - only the teacher who uploaded the database or admin can use it
                if request.user.role != User.Role.ADMIN and teacher_db.teacher != request.user:
                    return Response(
                        {'error': 'You do not have permission to use this database'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )

                # Get the session key
                session_key = request.session.session_key
                if not session_key:
                    # Create a new session if one doesn't exist
                    request.session.save()
                    session_key = request.session.session_key

                # Check if a temporary database already exists for this user and teacher database
                temp_db = None
                try:
                    temp_db = TemporaryDatabase.objects.get(
                        user=request.user,
                        teacher_database=teacher_db,
                        session_key=session_key
                    )
                    # Use the existing temporary database
                    db_name = temp_db.database_name
                    # Update last_used timestamp
                    temp_db.save(update_fields=["last_used"])
                except TemporaryDatabase.DoesNotExist:
                    # Create a new temporary database
                    db_config = settings.DATABASES['default']
                    admin_conn = psycopg2.connect(
                        dbname=db_config['NAME'],
                        user=db_config['USER'],
                        password=db_config['PASSWORD'],
                        host=db_config['HOST'],
                        port=db_config['PORT']
                    )
                    admin_conn.autocommit = True  # Required for CREATE DATABASE
                    admin_cursor = admin_conn.cursor()

                    # Generate a unique database name
                    db_name = f"temp_db_{uuid.uuid4().hex[:16]}"

                    try:
                        # Create the database
                        admin_cursor.execute(f"CREATE DATABASE {db_name}")

                        # Create a new connection to the temporary database
                        temp_conn = psycopg2.connect(
                            dbname=db_name,
                            user=db_config['USER'],
                            password=db_config['PASSWORD'],
                            host=db_config['HOST'],
                            port=db_config['PORT']
                        )
                        temp_conn.autocommit = True
                        temp_cursor = temp_conn.cursor()

                        # Execute the SQL dump to populate the database
                        with open(teacher_db.sql_dump.path, 'r') as f:
                            sql_dump = f.read()
                            temp_cursor.execute(sql_dump)

                        # Close the temporary connection
                        temp_cursor.close()
                        temp_conn.close()

                        # Create a record of the temporary database
                        temp_db = TemporaryDatabase.objects.create(
                            user=request.user,
                            teacher_database=teacher_db,
                            database_name=db_name,
                            session_key=session_key
                        )
                    except Exception as e:
                        # If anything goes wrong, drop the database if it was created
                        try:
                            admin_cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
                        except:
                            pass
                        admin_cursor.close()
                        admin_conn.close()
                        raise e

                    # Close the admin connection
                    admin_cursor.close()
                    admin_conn.close()

                # Connect to the temporary database
                db_config = settings.DATABASES['default']
                conn = psycopg2.connect(
                    dbname=db_name,
                    user=db_config['USER'],
                    password=db_config['PASSWORD'],
                    host=db_config['HOST'],
                    port=db_config['PORT']
                )

            except TeacherDatabase.DoesNotExist:
                return Response(
                    {'error': 'Database not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Use the main PostgreSQL database
            db_config = settings.DATABASES['default']
            conn = psycopg2.connect(
                dbname=db_config['NAME'],
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                host=db_config['HOST'],
                port=db_config['PORT']
            )

        # Create a cursor with dictionary-like results
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Execute the query
        cursor.execute(query)

        # Get column names
        columns = [desc[0] for desc in cursor.description] if cursor.description else []

        # Fetch results
        rows = cursor.fetchall()
        results = [dict(row) for row in rows]

        # Close connection
        cursor.close()
        conn.close()

        return Response({
            'results': results,
            'columns': columns
        })

    except psycopg2.Error as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_database_schema(request, database_id):
    """
    Get the schema of a specified database.

    Returns:
    - tables: List of tables in the database
    - columns: Dictionary mapping table names to their columns
    """
    try:
        teacher_db = TeacherDatabase.objects.get(id=database_id)

        # Check permissions - only the teacher who uploaded the database or admin can view its schema
        if request.user.role != User.Role.ADMIN and teacher_db.teacher != request.user:
            return Response(
                {'error': 'You do not have permission to view this database'}, 
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the session key
        session_key = request.session.session_key
        if not session_key:
            # Create a new session if one doesn't exist
            request.session.save()
            session_key = request.session.session_key

        # Check if a temporary database already exists for this user and teacher database
        db_name = None
        try:
            temp_db = TemporaryDatabase.objects.get(
                user=request.user,
                teacher_database=teacher_db,
                session_key=session_key
            )
            # Use the existing temporary database
            db_name = temp_db.database_name
        except TemporaryDatabase.DoesNotExist:
            # Create a new temporary database
            db_config = settings.DATABASES['default']
            admin_conn = psycopg2.connect(
                dbname=db_config['NAME'],
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                host=db_config['HOST'],
                port=db_config['PORT']
            )
            admin_conn.autocommit = True  # Required for CREATE DATABASE
            admin_cursor = admin_conn.cursor()

            # Generate a unique database name
            db_name = f"temp_db_{uuid.uuid4().hex[:16]}"

            try:
                # Create the database
                admin_cursor.execute(f"CREATE DATABASE {db_name}")

                # Create a new connection to the temporary database
                temp_conn = psycopg2.connect(
                    dbname=db_name,
                    user=db_config['USER'],
                    password=db_config['PASSWORD'],
                    host=db_config['HOST'],
                    port=db_config['PORT']
                )
                temp_conn.autocommit = True
                temp_cursor = temp_conn.cursor()

                # Execute the SQL dump to populate the database
                with open(teacher_db.sql_dump.path, 'r') as f:
                    sql_dump = f.read()
                    temp_cursor.execute(sql_dump)

                # Close the temporary connection
                temp_cursor.close()
                temp_conn.close()

                # Create a record of the temporary database
                temp_db = TemporaryDatabase.objects.create(
                    user=request.user,
                    teacher_database=teacher_db,
                    database_name=db_name,
                    session_key=session_key
                )
            except Exception as e:
                # If anything goes wrong, drop the database if it was created
                try:
                    admin_cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
                except:
                    pass
                admin_cursor.close()
                admin_conn.close()
                raise e

            # Close the admin connection
            admin_cursor.close()
            admin_conn.close()

        try:
            # Connect to the temporary database
            db_config = settings.DATABASES['default']
            conn = psycopg2.connect(
                dbname=db_name,
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                host=db_config['HOST'],
                port=db_config['PORT']
            )

            # Create a cursor with dictionary-like results
            cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

            # Get list of tables from PostgreSQL's information_schema
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            tables = [row['table_name'] for row in cursor.fetchall()]

            # Get columns for each table
            schema = {}
            for table in tables:
                cursor.execute("""
                    SELECT 
                        column_name, 
                        data_type, 
                        CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
                        CASE WHEN column_name IN (
                            SELECT column_name
                            FROM information_schema.table_constraints tc
                            JOIN information_schema.key_column_usage kcu 
                                ON tc.constraint_name = kcu.constraint_name
                            WHERE tc.constraint_type = 'PRIMARY KEY' 
                                AND tc.table_name = %s
                        ) THEN 1 ELSE 0 END as pk
                    FROM information_schema.columns
                    WHERE table_name = %s
                    ORDER BY ordinal_position;
                """, (table, table))

                columns = [
                    {
                        'name': row['column_name'],
                        'type': row['data_type'],
                        'notnull': row['notnull'],
                        'pk': row['pk']
                    } 
                    for row in cursor.fetchall()
                ]
                schema[table] = columns

            # Close connection
            cursor.close()
            conn.close()

            return Response({
                'tables': tables,
                'schema': schema
            })

        except psycopg2.Error as e:
            return Response(
                {'error': f'PostgreSQL error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except TeacherDatabase.DoesNotExist:
        return Response(
            {'error': 'Database not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response({'error': f'Unexpected error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def delete_temp_database(request):
    """
    Удалить временную базу пользователя для выбранной teacher_database и session_key.
    Тело запроса: { database_id }
    """
    database_id = request.data.get('database_id')
    if not database_id:
        return Response({'error': 'No database_id provided'}, status=400)
    try:
        teacher_db = TeacherDatabase.objects.get(id=database_id)
        session_key = request.session.session_key
        if not session_key:
            request.session.save()
            session_key = request.session.session_key
        temp_db = TemporaryDatabase.objects.get(
            user=request.user,
            teacher_database=teacher_db,
            session_key=session_key
        )
        # Drop the actual PostgreSQL database
        db_config = settings.DATABASES['default']
        admin_conn = psycopg2.connect(
            dbname=db_config['NAME'],
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            host=db_config['HOST'],
            port=db_config['PORT']
        )
        admin_conn.autocommit = True
        admin_cursor = admin_conn.cursor()
        try:
            admin_cursor.execute(f"DROP DATABASE IF EXISTS {temp_db.database_name}")
        except Exception:
            pass
        admin_cursor.close()
        admin_conn.close()
        temp_db.delete()
        return Response({'status': 'Temporary database deleted'})
    except TeacherDatabase.DoesNotExist:
        return Response({'error': 'Database not found'}, status=404)
    except TemporaryDatabase.DoesNotExist:
        return Response({'error': 'Temporary database not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

