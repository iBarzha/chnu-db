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
from .models import Course, Assignment, TeacherDatabase, TemporaryDatabase, SQLHistory

# Підказки типів для моделей Django
Course.objects: Manager
Assignment.objects: Manager

User = get_user_model()

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
        """
        Повертає queryset курсів, відфільтрований за роллю користувача.
        Вчителі бачать лише свої курси, студенти — лише ті, на які записані,
        адміністратори — всі курси.
        """
        user = self.request.user
        queryset = Course.objects.annotate(assignments_count=Count('assignments'))

        # Якщо користувач — вчитель, показати лише його курси
        if user.role == User.Role.TEACHER:
            return queryset.filter(teacher=user)
        # Якщо користувач — студент, показати курси, на які він записаний
        elif user.role == User.Role.STUDENT:
            return queryset.filter(students=user)
        # Якщо користувач — адміністратор, показати всі курси
        else:
            return queryset

    def perform_create(self, serializer):
        """
        Дозволяє створювати курси лише вчителям та встановлює поле teacher.
        """
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Тільки вчителі можуть створювати курси")
        serializer.save(teacher=user)

    @action(detail=True, methods=['get'])
    def get_assignments(self, request, pk=None):
        """
        Отримати всі завдання для конкретного курсу.
        """
        course = self.get_object()
        assignments = Assignment.objects.filter(course=course)
        serializer = AssignmentSerializer(assignments, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        """
        Перевизначає метод отримання курсу, щоб включити завдання у відповідь.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        # Додаємо завдання у відповідь
        assignments = Assignment.objects.filter(course=instance)
        assignment_serializer = AssignmentSerializer(assignments, many=True)
        data['assignments'] = assignment_serializer.data

        return Response(data)

    @action(detail=True, methods=['post'])
    def assignments(self, request, pk=None):
        """
        Створити нове завдання для конкретного курсу.
        Тільки вчитель курсу може створювати завдання.
        """
        course = self.get_object()

        # Дозволяємо створювати завдання лише вчителю курсу
        user = request.user
        if user.role != User.Role.TEACHER or course.teacher != user:
            raise PermissionDenied("Тільки вчитель курсу може створювати завдання")

        # Обробка demo_queries та task_queries з даних запиту
        data = request.data.copy()

        # Додаємо курс до даних
        data['course'] = course.id

        # Встановлюємо значення за замовчуванням для schema_script та solution_hash, якщо не вказано
        if 'schema_script' not in data:
            data['schema_script'] = ''
        if 'solution_hash' not in data:
            data['solution_hash'] = ''

        # Зберігаємо поле theory у description, якщо воно існує
        if 'theory' in data:
            if 'description' in data:
                data['description'] = f"{data['description']}\n\n{data['theory']}"
            else:
                data['description'] = data['theory']

        # Створюємо завдання
        serializer = AssignmentSerializer(data=data)
        if serializer.is_valid():
            assignment = serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

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

class AssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для перегляду завдань.
    Надає лише доступ для читання.
    """
    serializer_class = AssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Повертає всі завдання.
        """
        return Assignment.objects.all()

class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet для керування задачами. Вчителі можуть створювати задачі, завантажувати/обирати базу та зберігати еталонну базу після маніпуляцій.
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != User.Role.TEACHER:
            raise PermissionDenied("Тільки вчителі можуть створювати задачі.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='save_etalon')
    def save_etalon(self, request, pk=None):
        """
        Застосувати SQL-виконання вчителя до копії оригінальної БД, зробити дамп результату та зберегти як еталонну БД.
        Очікує: { "sql": "...SQL-виконання вчителя..." }
        """
        from django.core.files import File
        task = self.get_object()
        sql = request.data.get('sql')
        if not sql:
            return Response({'error': 'Не вказано SQL.'}, status=400)
        if not task.original_db:
            return Response({'error': 'До цієї задачі не прикріплено оригінальний файл БД.'}, status=400)
        # Створити тимчасову БД та застосувати оригінальний дамп
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
            # Завантажити оригінальний дамп БД
            with open(task.original_db.path, 'r') as f:
                temp_cursor.execute(f.read())
            # Застосувати SQL вчителя
            temp_cursor.execute(sql)
            # Зробити дамп результату у тимчасовий файл
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
        return Response({'status': 'Еталонну БД збережено.'})

    @action(detail=True, methods=['post'], url_path='submit', permission_classes=[permissions.IsAuthenticated])
    def submit(self, request, pk=None):
        """
        Студент надсилає SQL. Застосовується до копії original_db, порівнюється з etalon_db.
        Повертає: {correct: bool, error: str}
        """
        sql = request.data.get('sql')
        if not sql:
            return Response({'error': 'Не вказано SQL.'}, status=400)
        task = self.get_object()
        if not task.original_db or not task.etalon_db:
            return Response({'error': 'Задача налаштована не повністю.'}, status=400)
        db_config = settings.DATABASEС['default']
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
            # Завантажити оригінальний дамп БД
            with open(task.original_db.path, 'r') as f:
                temp_cursor.execute(f.read())
            # Застосувати SQL студента
            try:
                temp_cursor.execute(sql)
            except Exception as e:
                temp_cursor.close()
                temp_conn.close()
                raise e
            # Зробити дамп результату у тимчасовий файл
            with tempfile.NamedTemporaryFile(suffix='.sql', delete=False) as tmpfile:
                dump_cmd = f"pg_dump -U {db_config['USER']} -h {db_config['HOST']} -p {db_config['PORT']} {temp_db_name} > {tmpfile.name}"
                os.system(dump_cmd)
                tmpfile.flush()
                # Порівняти з еталоном
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
    Виконати SQL-запит у вибраній базі даних.

    Тіло запиту має містити:
    - query: SQL-запит для виконання
    - database_id: ID TeacherDatabase (необов'язково)

    Повертає:
    - results: результати запиту як список словників
    - columns: імена колонок
    - error: повідомлення про помилку, якщо запит не виконано
    """
    query = request.data.get('query')
    database_id = request.data.get('database_id')

    if not query:
        return Response({'error': 'Не вказано запит'}, status=status.HTTP_400_BAD_REQUEST)
    if not database_id:
        return Response({'error': 'Оберіть базу даних перед виконанням запитів.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Завжди використовуємо тимчасову базу для користувача та сесії
        session_key = request.session.session_key
        if not session_key:
            request.session.save()
            session_key = request.session.session_key

        # Якщо вказано database_id, використовуємо відповідний дамп, інакше — порожній дамп
        teacher_db = None
        sql_dump_path = None
        if database_id:
            teacher_db = TeacherDatabase.objects.get(id=database_id)
            sql_dump_path = teacher_db.sql_dump.path
        else:
            # Шлях до дефолтного порожнього дампу (створіть такий файл заздалегідь)
            sql_dump_path = os.path.join(settings.BASE_DIR, 'sample_database.sql')

        # Перевіряємо, чи є тимчасова база для користувача, сесії та teacher_db (якщо є)
        print(f"[execute_sql_query] user={request.user.id}, session_key={session_key}, database_id={database_id}")
        temp_db = None
        try:
            temp_db = TemporaryDatabase.objects.get(
                user=request.user,
                teacher_database=teacher_db if teacher_db else None,
                session_key=session_key
            )
            db_name = temp_db.database_name
            print(f"[execute_sql_query] ЗНАЙДЕНО temp_db: id={temp_db.id}, db_name={db_name}, teacher_db={teacher_db.id if teacher_db else None}")
            temp_db.save(update_fields=["last_used"])
        except TemporaryDatabase.DoesNotExist:
            print(f"[execute_sql_query] НЕ ЗНАЙДЕНО temp_db, створюємо нову для user={request.user.id}, teacher_db={teacher_db.id if teacher_db else None}, session_key={session_key}")
            db_config = settings.DATABASEС['default']
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
                with open(sql_dump_path, 'r') as f:
                    sql_dump = f.read()
                    temp_cursor.execute(sql_dump)
                temp_cursor.close()
                temp_conn.close()
                temp_db = TemporaryDatabase.objects.create(
                    user=request.user,
                    teacher_database=teacher_db if teacher_db else None,
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

        db_config = settings.DATABASEС['default']
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_config['USER'],
            password=db_config['PASSWORD'],
            host=db_config['HOST'],
            port=db_config['PORT']
        )
        conn.autocommit = True  # Гарантуємо застосування DDL одразу
        cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cursor.execute(query)
        print(f"[execute_sql_query][SQL] {query}")
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall() if cursor.description else []
        results = [dict(row) for row in rows]
        SQLHistory.objects.create(
            user=request.user,
            query=query,
            database=teacher_db if teacher_db else None
        )
        cursor.close()
        conn.close()
        return Response({
            'results': results,
            'columns': columns
        })
    except psycopg2.Error as e:
        print(f"[execute_sql_query][ERROR] {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        print(f"[execute_sql_query][EXCEPTION] {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_database_schema(request, database_id):
    """
    Отримати схему вказаної бази даних або тимчасової бази користувача, якщо database_id == 'temporary'.
    """
    try:
        if (database_id == 'temporary'):
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
            print(f"[get_database_schema] user={request.user.id}, session_key={session_key}, teacher_db={teacher_db.id if teacher_db else None}")
            temp_db = TemporaryDatabase.objects.filter(user=request.user, session_key=session_key, teacher_database=teacher_db).order_by('-id').first()
            if temp_db:
                print(f"[get_database_schema] ЗНАЙДЕНО temp_db: id={temp_db.id}, db_name={temp_db.database_name}")
            else:
                print(f"[get_database_schema] НЕ ЗНАЙДЕНО temp_db для user={request.user.id}, teacher_db={teacher_db.id if teacher_db else None}, session_key={session_key}")
            if not temp_db:
                return Response({'error': 'Тимчасову базу не знайдено'}, status=status.HTTP_404_NOT_FOUND)
            db_name = temp_db.database_name
        else:
            teacher_db = TeacherDatabase.objects.get(id=database_id)

            # Перевірка прав — лише вчитель, який завантажив базу, або адміністратор може переглядати схему
            if request.user.role != User.Role.ADMIN and teacher_db.teacher != request.user:
                return Response(
                    {'error': 'Ви не маєте прав для перегляду цієї бази'},
                    status=status.HTTP_403_FORБIDDEN
                )

            # Отримати session_key
            session_key = request.session.session_key
            if not session_key:
                # Створити нову сесію, якщо її не існує
                request.session.save()
                session_key = request.session.session_key

            # Перевірити, чи існує тимчасова база для цього користувача та teacher_db
            db_name = None
            try:
                temp_db = TemporaryDatabase.objects.get(
                    user=request.user,
                    teacher_database=teacher_db,
                    session_key=session_key
                )
                # Використати існуючу тимчасову базу
                db_name = temp_db.database_name
            except TemporaryDatabase.DoesNotExist:
                # Створити нову тимчасову базу
                db_config = settings.DATABASEС['default']
                admin_conn = psycopg2.connect(
                    dbname=db_config['NAME'],
                    user=db_config['USER'],
                    password=db_config['PASSWORD'],
                    host=db_config['HOST'],
                    port=db_config['PORT']
                )
                admin_conn.autocommit = True  # Потрібно для CREATE DATABASE
                admin_cursor = admin_conn.cursor()

                # Згенерувати унікальне ім'я бази
                db_name = f"temp_db_{uuid.uuid4().hex[:16]}"

                try:
                    # Створити базу
                    admin_cursor.execute(f"CREATE DATABASE {db_name}")

                    # Створити нове з'єднання з тимчасовою базою
                    temp_conn = psycopg2.connect(
                        dbname=db_name,
                        user=db_config['USER'],
                        password=db_config['PASSWORD'],
                        host=db_config['HOST'],
                        port=db_config['PORT']
                    )
                    temp_conn.autocommit = True
                    temp_cursor = temp_conn.cursor()

                    # Виконати SQL-дамп для наповнення бази
                    with open(teacher_db.sql_dump.path, 'r') as f:
                        sql_dump = f.read()
                        temp_cursor.execute(sql_dump)

                    # Закрити тимчасове з'єднання
                    temp_cursor.close()
                    temp_conn.close()

                    # Створити запис про тимчасову базу
                    temp_db = TemporaryDatabase.objects.create(
                        user=request.user,
                        teacher_database=teacher_db,
                        database_name=db_name,
                        session_key=session_key
                    )
                except Exception as e:
                    # Якщо щось пішло не так, видалити базу, якщо вона була створена
                    try:
                        admin_cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
                    except:
                        pass
                    admin_cursor.close()
                    admin_conn.close()
                    raise e

                # Закрити з'єднання адміністратора
                admin_cursor.close()
                admin_conn.close()

        try:
            # Підключитися до тимчасової бази
            db_config = settings.DATABASEС['default']
            conn = psycopg2.connect(
                dbname=db_name,
                user=db_config['USER'],
                password=db_config['PASSWORD'],
                host=db_config['HOST'],
                port=db_config['PORT']
            )

            # Створити курсор з результатами у вигляді словника
            cursor = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

            # Отримати список таблиць з information_schema PostgreSQL
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            tables = [row['table_name'] for row in cursor.fetchall()]

            # Отримати колонки для кожної таблиці
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

            # Закрити з'єднання
            cursor.close()
            conn.close()

            return Response({
                'tables': tables,
                'schema': schema
            })

        except psycopg2.Error as e:
            return Response(
                {'error': f'Помилка PostgreSQL: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except TeacherDatabase.DoesNotExist:
        return Response(
            {'error': 'Базу даних не знайдено'},
            status=status.HTTP_404_NOT_FOUND
        )
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
        return Response({'error': 'Не вказано database_id'}, status=400)
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
        # Видалити саму базу PostgreSQL
        db_config = settings.DATABASEС['default']
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
        return Response({'error': 'Базу даних не знайдено'}, status=404)
    except TemporaryDatabase.DoesNotExist:
        return Response({'error': 'Тимчасову базу не знайдено'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def sql_history(request):
    """
    Повертає історію SQL-запитів користувача (останні 50).
    """
    history = SQLHistory.objects.filter(user=request.user).order_by('-executed_at')[:50]
    data = [
        {
            'query': h.query,
            'executed_at': h.executed_at,
            'database_id': h.database.id if h.database else None,
            'database_name': h.database.name if h.database else None
        }
        for h in history
    ]
    return Response({'history': data})

