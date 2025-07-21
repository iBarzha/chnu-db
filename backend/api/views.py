from rest_framework import generics, permissions, viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model
from django.db.models import Count, Manager
import os
import psycopg2
import psycopg2.extras
import subprocess
import logging
from django.conf import settings
from django.core.cache import cache
from .serializers import (RegisterSerializer, CustomTokenObtainPairSerializer, UserSerializer, CourseSerializer,
    TeacherDatabaseSerializer, TaskSerializer)
from .models import (Task, TemporaryDatabase, TeacherDatabase, SQLHistory, Course)
import tempfile
import uuid

# Для підказок типів (необов'язково, але зручно)
Course.objects: Manager

User = get_user_model()
logger = logging.getLogger(__name__)

# Basic SQL query validation
DANGEROUS_KEYWORDS = [
    'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
]

def validate_query(query):
    """Basic SQL query validation for security - allows DDL/DML since students work with isolated temporary databases"""
    if not query or len(query.strip()) == 0:
        return False, "Query cannot be empty"
    
    if len(query) > 10000:  # Prevent extremely long queries
        return False, "Query too long (max 10000 characters)"
    
    # Check for dangerous keywords that could affect system security
    query_upper = query.upper()
    for keyword in DANGEROUS_KEYWORDS:
        if keyword in query_upper:
            return False, f"Keyword '{keyword}' is not allowed in queries"
    
    return True, ""


class UserListView(generics.ListAPIView):
    """
    API-представлення для отримання списку всіх користувачів.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer


class RegisterView(generics.CreateAPIView):
    """
    API-представлення для реєстрації користувача.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    """
    API-представлення для входу користувача з генерацією JWT токена.
    """
    serializer_class = CustomTokenObtainPairSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    API-представлення для отримання та оновлення профілю поточного користувача.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def get_object(self):
        """
        Повертає автентифікованого користувача як об'єкт для отримання або оновлення.
        """
        return self.request.user


class CourseViewSet(viewsets.ModelViewSet):
    """
    ViewSet для керування курсами.
    Надає CRUD-операції для курсів з контролем доступу за ролями.
    """
    serializer_class = CourseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Use select_related and prefetch_related for better performance
        queryset = Course.objects.select_related('teacher').prefetch_related('students').annotate(assignments_count=Count('tasks'))
        
        if user.role == User.Role.TEACHER:
            return queryset.filter(teacher=user)
        elif user.role == User.Role.STUDENT:
            return queryset.filter(students=user)
        elif user.role == User.Role.ADMIN:
            return queryset
        else:
            # For safety, return empty queryset for unknown roles
            return Course.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Тільки вчителі можуть створювати курси")
        serializer.save(teacher=user)


class TeacherDatabaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet для завантаження вчителями дампів SQL-баз даних.
    """
    queryset = TeacherDatabase.objects.all()
    serializer_class = TeacherDatabaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def get_queryset(self):
        """
        Вчителі бачать лише свої завантажені бази даних.
        """
        user = self.request.user
        if user.role == User.Role.TEACHER:
            return self.queryset.filter(teacher=user)
        return TeacherDatabase.objects.none()

    def perform_create(self, serializer):
        """
        Тільки вчителі можуть завантажувати дампи баз даних.
        """
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Тільки вчителі можуть завантажувати дампи баз даних.")
        serializer.save(teacher=user)


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet для керування задачами. Вчителі можуть створювати задачі,
    завантажувати/обирати базу та зберігати еталонну базу після маніпуляцій.
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Тільки вчителі можуть створювати задачі.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='save_etalon')
    def save_etalon(self, request, pk=None):
        """
        Застосувати SQL-виконання вчителя до копії оригінальної БД,
        зробити дамп результату та зберегти як еталонну БД.
        Очікує: { "sql": "...SQL-виконання вчителя..." }
        """
        from django.core.files import File

        task = self.get_object()
        sql = request.data.get('sql')
        if not sql:
            return Response({'error': 'Не вказано SQL.'}, status=400)
        if not task.original_db:
            return Response({'error': 'До цієї задачі не прикріплено оригінальний файл БД.'}, status=400)

        # 1) Створюємо тимчасову базу для еталону
        db_config = settings.DATABASES['default']
        temp_db_name = f"etalon_db_{uuid.uuid4().hex[:16]}"

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
            admin_cursor.execute(f"CREATE DATABASE {temp_db_name}")
            temp_conn = psycopg2.connect(
                dbname=temp_db_name,
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                host=db_config['HOST'],
                port=db_config['PORT']
            )
            temp_conn.autocommit = True
            temp_cursor = temp_conn.cursor()

            # Відновлюємо початковий дамп
            with open(task.original_db.path, 'r') as f:
                temp_cursor.execute(f.read())

            # Застосовуємо SQL вчителя
            temp_cursor.execute(sql)

            # Робимо дамп результату в файл і зберігаємо в task.etalon_db
            with tempfile.NamedTemporaryFile(suffix='.sql', delete=False) as tmpfile:
                if os.name == 'nt':
                    # Windows
                    dump_cmd = (
                        f'set PGPASSWORD={db_config["PASSWORD"]} && '
                        f'pg_dump -U {db_config["USER"]} '
                        f'-h {db_config["HOST"]} -p {db_config["PORT"]} '
                        f'{temp_db_name} > "{tmpfile.name}"'
                    )
                else:
                    # Linux/Mac
                    dump_cmd = (
                        f'PGPASSWORD={db_config["PASSWORD"]} '
                        f'pg_dump -U {db_config["USER"]} '
                        f'-h {db_config["HOST"]} -p {db_config["PORT"]} '
                        f'{temp_db_name} > "{tmpfile.name}"'
                    )

                os.system(dump_cmd)
                tmpfile.flush()
                with open(tmpfile.name, 'rb') as dumpf:
                    task.etalon_db.save(f"etalon_{task.id}.sql", File(dumpf), save=True)

            temp_cursor.close()
            temp_conn.close()

        finally:
            # Завжди намагаємося видалити тимчасову БД, навіть якщо було виключення
            try:
                admin_cursor.execute(f"DROP DATABASE IF EXISTS {temp_db_name}")
            except Exception:
                pass
            admin_cursor.close()
            admin_conn.close()

        return Response({'status': 'Еталонну БД збережено.'})

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        """
        Порівняти стан студентської БД з еталонним дампом.
        """
        import uuid, os
        from django.conf import settings
        from rest_framework.response import Response

        task = self.get_object()
        if not task.original_db or not task.etalon_db:
            return Response({'error': 'Задача налаштована не повністю.'}, status=400)

        db_conf = settings.DATABASES['default']
        conn_params = {
            'dbname': db_conf['NAME'],
            'user': db_conf['USER'],
            'password': db_conf['PASSWORD'],
            'host': db_conf['HOST'],
            'port': db_conf['PORT'],
        }

        session_key = request.session.session_key
        if not session_key:
            request.session.save()
            session_key = request.session.session_key

        db_prefix = f"task_{task.id}_{request.user.id}_{session_key[:8]}"
        temp_db = TemporaryDatabase.objects.filter(
            user=request.user,
            session_key=session_key,
            teacher_database=None,
            database_name__startswith=db_prefix
        ).first()

        if not temp_db:
            return Response({'error': 'Робоча база не знайдена!'}, status=400)
        student_db_name = temp_db.database_name

        etalon_db_name = f"etalon_{uuid.uuid4().hex[:16]}"
        admin_conn = psycopg2.connect(**conn_params)
        admin_conn.autocommit = True
        admin_cur = admin_conn.cursor()

        # --- Тільки ЕТАЛОННУ БД створюємо! ---
        admin_cur.execute(f'DROP DATABASE IF EXISTS "{etalon_db_name}"')
        admin_cur.execute(f'CREATE DATABASE "{etalon_db_name}"')
        if os.name == 'nt':
            psql_cmd = (
                f'set PGPASSWORD={conn_params["password"]} && '
                f'psql -U {conn_params["user"]} '
                f'-h {conn_params["host"]} -p {conn_params["port"]} '
                f'-d {etalon_db_name} -f "{task.etalon_db.path}"'
            )
        else:
            psql_cmd = (
                f'PGPASSWORD={conn_params["password"]} '
                f'psql -U {conn_params["user"]} '
                f'-h {conn_params["host"]} -p {conn_params["port"]} '
                f'-d {etalon_db_name} -f "{task.etalon_db.path}"'
            )
        os.system(psql_cmd)

        # --- Підключення і порівняння ---
        student_conn_params = conn_params.copy()
        student_conn_params['dbname'] = student_db_name
        student_conn = psycopg2.connect(**student_conn_params)
        student_cur = student_conn.cursor()

        etalon_conn_params = conn_params.copy()
        etalon_conn_params['dbname'] = etalon_db_name
        etalon_conn = psycopg2.connect(**etalon_conn_params)
        etalon_cur = etalon_conn.cursor()

        # --- Збираємо таблиці ---
        student_cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name;"
        )
        student_tables = set(r[0] for r in student_cur.fetchall())

        etalon_cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name;"
        )
        etalon_tables = set(r[0] for r in etalon_cur.fetchall())

        extra_tables = student_tables - etalon_tables
        missing_tables = etalon_tables - student_tables
        common_tables = student_tables & etalon_tables

        details = {}

        # Зайві таблиці
        for table in extra_tables:
            details[table] = {
                'status': 'extra_table',
                'message': 'Таблиця створена студентом, але її немає в еталоні.'
            }

        # Відсутні у студента таблиці
        for table in missing_tables:
            details[table] = {
                'status': 'missing_table',
                'message': 'Таблиця повинна бути, але студент її не створив.'
            }

        correct = not extra_tables and not missing_tables

        # Порівнюємо лише спільні таблиці
        for table in common_tables:
            if not table:
                continue

            # 1. Отримуємо всі колонки і їх типи (в правильному порядку)
            student_cur.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name = %s ORDER BY ordinal_position;", (table,)
            )
            col_info = student_cur.fetchall()
            columns = [r[0] for r in col_info]
            column_types = [r[1] for r in col_info]
            compare_idx = [i for i, typ in enumerate(column_types) if 'timestamp' not in typ]

            columns_clause = ", ".join([f'"{col}"' for col in columns])
            order_clause = ", ".join([f'"{col}"' for col in columns])

            student_cur.execute(f'SELECT {columns_clause} FROM "{table}" ORDER BY {order_clause};')
            s_rows = student_cur.fetchall()
            etalon_cur.execute(f'SELECT {columns_clause} FROM "{table}" ORDER BY {order_clause};')
            e_rows = etalon_cur.fetchall()

            if len(s_rows) != len(e_rows):
                correct = False
                details[table] = {
                    'status': 'row_count_mismatch',
                    'student_count': len(s_rows),
                    'etalon_count': len(e_rows)
                }
                continue

            def row_to_str(row):
                return tuple(str(row[i]) if row[i] is not None else 'NULL' for i in compare_idx)

            for idx, (s, e) in enumerate(zip(s_rows, e_rows)):
                if row_to_str(s) != row_to_str(e):
                    diff_columns = []
                    for i in compare_idx:
                        if str(s[i]) != str(e[i]):
                            diff_columns.append({
                                'column': columns[i],
                                'student_value': s[i],
                                'etalon_value': e[i],
                            })
                    correct = False
                    details.setdefault(table, {'status': 'row_data_mismatch', 'differences': []})
                    details[table]['differences'].append({
                        'row_index': idx,
                        'student': [s[i] for i in compare_idx],  # тільки значущі!
                        'etalon': [e[i] for i in compare_idx],  # тільки значущі!
                        'diff_columns': diff_columns
                    })

        # Закриваємо з'єднання
        student_cur.close()
        student_conn.close()
        etalon_cur.close()
        etalon_conn.close()

        # Видаляємо тимчасову еталонну БД
        admin_cur.execute(f'DROP DATABASE IF EXISTS "{etalon_db_name}"')
        admin_cur.close()
        admin_conn.close()

        return Response({'correct': correct, 'details': details})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def execute_sql_query(request):
    """
    Виконати SQL-запит у вибраній базі даних.
    Тіло запиту має містити:
      - query: SQL-запит для виконання
      - database_id: ID TeacherDatabase (необов'язково)

    Повертає:
      - results: результати запиту як список словників
      - columns: імена колонок
      - error: повідомлення про помилку, якщо запит не виконано
    """
    query = request.data.get('query', '').strip()
    database_id = request.data.get('database_id')

    if not query:
        return Response({'error': 'Не вказано запит'}, status=status.HTTP_400_BAD_REQUEST)
    if not database_id:
        return Response({'error': 'Оберіть базу даних перед виконанням запитів.'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate query for security
    is_valid, error_msg = validate_query(query)
    if not is_valid:
        logger.warning(f"Invalid query attempt by user {request.user.username}: {error_msg}")
        return Response({'error': f'Недопустимий запит: {error_msg}'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Завжди використовуємо тимчасову базу для user+session_key+teacher_db
        session_key = request.session.session_key
        if not session_key:
            request.session.save()
            session_key = request.session.session_key

        # Якщо вказано database_id, використовуємо dump з TeacherDatabase
        teacher_db = None
        sql_dump_path = None
        if database_id:
            teacher_db = TeacherDatabase.objects.get(id=database_id)
            sql_dump_path = teacher_db.sql_dump.path
        else:
            # Якщо раптом нема, можна використовувати порожній дамп
            sql_dump_path = os.path.join(settings.BASE_DIR, 'sample_database.sql')

        # Шукаємо вже існуючу тимчасову базу
        temp_db = None
        try:
            temp_db = TemporaryDatabase.objects.get(
                user=request.user,
                teacher_database=teacher_db if teacher_db else None,
                session_key=session_key
            )
            # Оновлюємо last_used для очищення непотрібних пізніше
            temp_db.save(update_fields=["last_used"])
        except TemporaryDatabase.DoesNotExist:
            temp_db = None

        if not temp_db:
            # Якщо нема — створюємо нову тимчасову БД
            db_config = settings.DATABASES['default']
            admin_conn = None
            temp_conn = None
            
            try:
                admin_conn = psycopg2.connect(
                    dbname=db_config['NAME'],
                    user=db_config['USER'],
                    password=db_config['PASSWORD'],
                    host=db_config['HOST'],
                    port=db_config['PORT']
                )
                admin_conn.autocommit = True
                admin_cursor = admin_conn.cursor()

                db_name = f"temp_db_{uuid.uuid4().hex[:16]}"
                
                # Validate database name (additional security)
                if not db_name.replace('_', '').replace('-', '').isalnum():
                    raise ValueError("Invalid database name generated")
                
                admin_cursor.execute(f"CREATE DATABASE {db_name}")
                
                temp_conn = psycopg2.connect(
                    dbname=db_name,
                    user=db_config['USER'],
                    password=db_config['PASSWORD'],
                    host=db_config['HOST'],
                    port=db_config['PORT']
                )
                temp_conn.autocommit = True
                temp_cursor = temp_conn.cursor()

                # Set timeout for dump restoration
                temp_cursor.execute("SET statement_timeout = 60000")  # 60 seconds
                
                with open(sql_dump_path, 'r', encoding='utf-8') as f:
                    temp_cursor.execute(f.read())

                temp_cursor.close()
                temp_conn.close()
                temp_conn = None

                temp_db = TemporaryDatabase.objects.create(
                    user=request.user,
                    teacher_database=teacher_db if teacher_db else None,
                    database_name=db_name,
                    session_key=session_key
                )
                
                logger.info(f"Created temporary database {db_name} for user {request.user.username}")
                
            except Exception as e:
                # Cleanup on failure
                if admin_conn:
                    try:
                        admin_cursor = admin_conn.cursor()
                        admin_cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
                        admin_cursor.close()
                    except:
                        pass
                
                logger.error(f"Failed to create temporary database for user {request.user.username}: {e}")
                raise e
            finally:
                # Ensure connections are closed
                if temp_conn:
                    temp_conn.close()
                if admin_conn:
                    admin_conn.close()

        db_name = temp_db.database_name

        # Тепер виконуємо сам запит у тимчасовій БД
        db_config = settings.DATABASES['default']
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            host=db_config['HOST'],
            port=db_config['PORT']
        )
        conn.autocommit = True
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        
        # Set query timeout (30 seconds)
        cursor.execute("SET statement_timeout = 30000")
        
        # Execute query with result limit for security
        cursor.execute(query)
        
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        
        # Limit results to prevent memory issues
        MAX_RESULTS = 1000
        if cursor.description:
            rows = cursor.fetchmany(MAX_RESULTS)
            # Check if there are more results
            has_more = cursor.fetchone() is not None
        else:
            rows = []
            has_more = False
            
        results = [dict(row) for row in rows]
        
        # Log query execution for monitoring
        logger.info(f"Query executed by {request.user.username}: {len(results)} rows returned")

        SQLHistory.objects.create(
            user=request.user,
            query=query,
            database=teacher_db if teacher_db else None
        )

        cursor.close()
        conn.close()

        response_data = {
            'results': results,
            'columns': columns,
            'row_count': len(results)
        }
        
        if has_more:
            response_data['warning'] = f'Results limited to {MAX_RESULTS} rows. More data available.'
            response_data['truncated'] = True

        return Response(response_data)

    except psycopg2.extensions.QueryCanceledError:
        logger.warning(f"Query timeout for user {request.user.username}")
        return Response({'error': 'Запит перевищив ліміт часу (30 секунд)'}, status=status.HTTP_408_REQUEST_TIMEOUT)
    except psycopg2.Error as e:
        logger.error(f"Database error for user {request.user.username}: {e}")
        return Response({'error': 'Помилка бази даних'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Unexpected error for user {request.user.username}: {e}")
        return Response({'error': 'Виникла неочікувана помилка'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_temp_db(request, pk):
    """
    Видалити тимчасову БД (за потреби).
    """
    try:
        temp_db = TemporaryDatabase.objects.get(pk=pk, user=request.user)
    except TemporaryDatabase.DoesNotExist:
        return Response({'status': 'No temp DB to delete.'})

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
    return Response({'status': 'Temp DB deleted.'})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_database_schema(request, database_id):
    """
    Отримати схему вказаної бази даних або тимчасової бази користувача,
    якщо database_id == 'temporary'.
    """
    try:
        if database_id == 'temporary':
            # Шукаємо тимчасову БД за session_key + optional teacher_db
            session_key = request.session.session_key
            if not session_key:
                request.session.save()
                session_key = request.session.session_key

            teacher_db_id = request.GET.get('teacher_db')
            teacher_db = None
            if teacher_db_id:
                try:
                    teacher_db = TeacherDatabase.objects.get(id=teacher_db_id)
                except TeacherDatabase.DoesNotExist:
                    return Response({'error': 'Teacher database не знайдено'}, status=status.HTTP_404_NOT_FOUND)

            temp_db = TemporaryDatabase.objects.filter(
                user=request.user,
                session_key=session_key,
                teacher_database=teacher_db if teacher_db else None
            ).order_by('-id').first()

            if not temp_db:
                return Response({'error': 'Тимчасову базу не знайдено'}, status=status.HTTP_404_NOT_FOUND)
            db_name = temp_db.database_name

        else:
            # Їдемо за конкретним TeacherDatabase
            teacher_db = TeacherDatabase.objects.get(id=database_id)

            # Перевірка прав: лише адміністратор або власник teacher_db
            if request.user.role != User.Role.ADMIN and teacher_db.teacher != request.user:
                return Response({'error': 'Ви не маєте прав для перегляду цієї бази'}, status=status.HTTP_403_FORBIDDEN)

            # Створюємо/знаходимо тимчасову БД
            session_key = request.session.session_key
            if not session_key:
                request.session.save()
                session_key = request.session.session_key

            try:
                temp_db = TemporaryDatabase.objects.get(
                    user=request.user,
                    teacher_database=teacher_db,
                    session_key=session_key
                )
                db_name = temp_db.database_name
            except TemporaryDatabase.DoesNotExist:
                # Створюємо нову тимчасову БД та відновлюємо дамп
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

                db_name = f"temp_db_{uuid.uuid4().hex[:16]}"
                try:
                    admin_cursor.execute(f"CREATE DATABASE {db_name}")
                    temp_conn = psycopg2.connect(
                        dbname=db_name,
                        user=db_config['USER'],
                        password=db_config['PASSWORD'],
                        host=db_config['HOST'],
                        port=db_config['PORT']
                    )
                    temp_conn.autocommit = True
                    temp_cursor = temp_conn.cursor()

                    with open(teacher_db.sql_dump.path, 'r') as f:
                        temp_cursor.execute(f.read())

                    temp_cursor.close()
                    temp_conn.close()

                    temp_db = TemporaryDatabase.objects.create(
                        user=request.user,
                        teacher_database=teacher_db,
                        database_name=db_name,
                        session_key=session_key
                    )
                except Exception as e:
                    try:
                        admin_cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
                    except:
                        pass
                    admin_cursor.close()
                    admin_conn.close()
                    raise e

                admin_cursor.close()
                admin_conn.close()

        # Тепер дістаємо схему тимчасової або постійної БД
        db_config = settings.DATABASES['default']
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            host=db_config['HOST'],
            port=db_config['PORT']
        )
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = [row['table_name'] for row in cursor.fetchall()]

        schema = {}
        for table in tables:
            cursor.execute("""
                SELECT
                    column_name,
                    data_type,
                    CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
                    CASE WHEN column_name IN (
                        SELECT kcu.column_name
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
                    'notnull': bool(row['notnull']),
                    'pk': bool(row['pk'])
                }
                for row in cursor.fetchall()
            ]
            schema[table] = columns

        cursor.close()
        conn.close()

        return Response({
            'tables': tables,
            'schema': schema
        })

    except TeacherDatabase.DoesNotExist:
        return Response({'error': 'Базу даних не знайдено'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': f'Неочікувана помилка: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def delete_temp_database(request):
    """
    Видалити тимчасову базу користувача для вибраної teacher_database та session_key.
    Тіло запиту: { database_id }
    """
    database_id = request.data.get('database_id')
    if not database_id:
        return Response({'error': 'Не вказано database_id'}, status=status.HTTP_400_BAD_REQUEST)
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

        # Видаляємо саму БД у PostgreSQL
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
        return Response({'status': 'Тимчасову базу видалено'})

    except TeacherDatabase.DoesNotExist:
        return Response({'error': 'Базу даних не знайдено'}, status=status.HTTP_404_NOT_FOUND)
    except TemporaryDatabase.DoesNotExist:
        return Response({'error': 'Тимчасову базу не знайдено'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def sql_history(request):
    """
    Повертає історію SQL-запитів користувача з пагінацією.
    """
    # Get pagination parameters
    page = int(request.GET.get('page', 1))
    page_size = min(int(request.GET.get('page_size', 25)), 100)  # Max 100 items per page
    offset = (page - 1) * page_size
    
    # Use select_related for better performance
    history_queryset = SQLHistory.objects.filter(user=request.user).select_related('database').order_by('-executed_at')
    total_count = history_queryset.count()
    history = history_queryset[offset:offset + page_size]
    
    data = [
        {
            'id': h.id,
            'query': h.query[:200] + '...' if len(h.query) > 200 else h.query,  # Truncate long queries
            'executed_at': h.executed_at,
            'database_id': h.database.id if h.database else None,
            'database_name': h.database.name if h.database else None
        }
        for h in history
    ]
    
    return Response({
        'history': data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_count': total_count,
            'total_pages': (total_count + page_size - 1) // page_size
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def task_schema(request, pk):
    """
    Повертає схему тимчасової бази задачі. Якщо нема — створює.
    """
    from .models import TemporaryDatabase

    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not task.original_db:
        return Response({'error': 'No database dump for this task.'}, status=status.HTTP_400_BAD_REQUEST)

    session_key = request.session.session_key
    if not session_key:
        request.session.save()
        session_key = request.session.session_key

    # Ім'я префіксу: task_{task.id}_{user.id}_{session_key[:8]}
    db_prefix = f"task_{task.id}_{request.user.id}_{session_key[:8]}"
    temp_db = TemporaryDatabase.objects.filter(
        user=request.user,
        session_key=session_key,
        teacher_database=None,
        database_name__startswith=db_prefix
    ).first()

    db_config = settings.DATABASES['default']
    if not temp_db:
        # Створюємо нову тимчасову БД
        temp_db_name = f"{db_prefix}_{uuid.uuid4().hex[:8]}"
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
            admin_cursor.execute(f"CREATE DATABASE {temp_db_name}")
            temp_conn = psycopg2.connect(
                dbname=temp_db_name,
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                host=db_config['HOST'],
                port=db_config['PORT']
            )
            temp_conn.autocommit = True
            temp_cursor = temp_conn.cursor()

            with open(task.original_db.path, 'r') as f:
                temp_cursor.execute(f.read())

            temp_cursor.close()
            temp_conn.close()

            temp_db = TemporaryDatabase.objects.create(
                user=request.user,
                teacher_database=None,
                database_name=temp_db_name,
                session_key=session_key
            )
        except Exception as e:
            try:
                admin_cursor.execute(f"DROP DATABASE IF EXISTS {temp_db_name}")
            except Exception:
                pass
            admin_cursor.close()
            admin_conn.close()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        admin_cursor.close()
        admin_conn.close()

    db_name = temp_db.database_name

    # Отримуємо схему (список таблиць + колонки)
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            host=db_config['HOST'],
            port=db_config['PORT']
        )
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = [row['table_name'] for row in cursor.fetchall()]

        schema = {}
        for table in tables:
            cursor.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position;
            """, (table,))
            columns = cursor.fetchall()
            schema[table] = [
                {
                    'name': col[0],
                    'type': col[1],
                    'notnull': col[2] == 'NO',
                    'pk': False
                }
                for col in columns
            ]

        cursor.close()
        conn.close()
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'tables': tables, 'schema': schema})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def task_submit(request, pk):
    """
    Виконує SQL на тимчасовій базі задачі, повертає результат (результат SELECT або пустий список).
    """
    from .models import TemporaryDatabase

    sql = request.data.get('sql')
    if not sql:
        return Response({'error': 'No SQL provided.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not task.original_db:
        return Response({'error': 'No database dump for this task.'}, status=status.HTTP_400_BAD_REQUEST)

    session_key = request.session.session_key
    if not session_key:
        request.session.save()
        session_key = request.session.session_key

    from django.conf import settings
    db_prefix = f"task_{task.id}_{request.user.id}_{session_key[:8]}"
    temp_db = TemporaryDatabase.objects.filter(
        user=request.user,
        session_key=session_key,
        teacher_database=None,
        database_name__startswith=db_prefix
    ).first()

    db_config = settings.DATABASES['default']
    if not temp_db:
        # Створюємо нову тимчасову БД для задачі
        temp_db_name = f"{db_prefix}_{uuid.uuid4().hex[:8]}"
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
            admin_cursor.execute(f"CREATE DATABASE {temp_db_name}")
            temp_conn = psycopg2.connect(
                dbname=temp_db_name,
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                host=db_config['HOST'],
                port=db_config['PORT']
            )
            temp_conn.autocommit = True
            temp_cursor = temp_conn.cursor()
            with open(task.original_db.path, 'r') as f:
                temp_cursor.execute(f.read())
            temp_cursor.close()
            temp_conn.close()

            temp_db = TemporaryDatabase.objects.create(
                user=request.user,
                teacher_database=None,
                database_name=temp_db_name,
                session_key=session_key
            )
        except Exception as e:
            try:
                admin_cursor.execute(f"DROP DATABASE IF EXISTS {temp_db_name}")
            except Exception:
                pass
            admin_cursor.close()
            admin_conn.close()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        admin_cursor.close()
        admin_conn.close()

    db_name = temp_db.database_name

    # Виконуємо сам запит у тимчасовій БД
    try:
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            host=db_config['HOST'],
            port=db_config['PORT']
        )
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute(sql)
        try:
            results = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            result_dicts = [dict(zip(columns, row)) for row in results]
        except Exception:
            result_dicts = []
        cursor.close()
        conn.close()
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'results': result_dicts})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def task_reset_db(request, pk):
    """
    Видаляє тимчасову базу для задачі (Task) для поточного користувача і сесії.
    """
    from .models import TemporaryDatabase

    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response({'error': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    session_key = request.session.session_key
    if not session_key:
        request.session.save()
        session_key = request.session.session_key

    temp_db = TemporaryDatabase.objects.filter(
        user=request.user,
        session_key=session_key,
        teacher_database=None,
        database_name__startswith=f"task_{task.id}_"
    ).first()

    if not temp_db:
        return Response({'status': 'No temp DB to delete.'})

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
    return Response({'status': 'Temp DB deleted.'})
