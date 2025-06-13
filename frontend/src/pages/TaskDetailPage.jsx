import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../api/auth';
import Editor from '@monaco-editor/react';

export default function TaskDetailPage() {
  // Отримуємо ID задачі з URL-параметрів
  const { id } = useParams();
  // Хук для навігації між сторінками
  const navigate = useNavigate();
  // Хук для перекладу (i18n)
  const { t } = useTranslation();

  // Стан для зберігання деталей задачі
  const [task, setTask] = useState(null);
  // Стан для індикації завантаження деталей задачі
  const [loadingTask, setLoadingTask] = useState(true);
  // Стан для повідомлення про помилку при завантаженні задачі
  const [error, setError] = useState(null);

  // Стан для SQL-коду студента (контролюється редактором)
  const [studentSql, setStudentSql] = useState('');

  // Стан для індикації виконання запиту (preview)
  const [executing, setExecuting] = useState(false);
  // Стан для зберігання результатів PREVIEW: масив об’єктів з даними
  const [previewResults, setPreviewResults] = useState([]);
  // Стан для зберігання назв колонок PREVIEW-результатів
  const [previewColumns, setPreviewColumns] = useState([]);
  // Стан для повідомлення про помилку під час PREVIEW
  const [previewError, setPreviewError] = useState(null);

  // Стан для схеми бази даних (назви таблиць і колонки)
  const [schema, setSchema] = useState(null);
  // Стан для індикації завантаження схеми
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Стан для індикації відправки рішення (submit)
  const [submitting, setSubmitting] = useState(false);
  // Стан для результату SUBMIT: { correct: bool, details: {...} }
  const [submitResult, setSubmitResult] = useState(null);
  // Стан для повідомлення про помилку під час SUBMIT
  const [submitError, setSubmitError] = useState(null);

  // Стан для активної вкладки: 0 = Results (preview), 1 = Schema
  const [activeTab, setActiveTab] = useState(0);

  // Завантажуємо деталі задачі при монтуванні компоненту (і коли id змінюється)
  useEffect(() => {
    if (!id) return;
    setLoadingTask(true);
    api
      .get(`/api/tasks/${id}/`)
      .then(res => {
        // Зберігаємо отримані дані задачі
        setTask(res.data);
        setLoadingTask(false);
      })
      .catch(err => {
        console.error(err);
        // Якщо помилка, показуємо повідомлення
        setError(t('task.loadingError') || 'Не вдалося завантажити задачу.');
        setLoadingTask(false);
      });
  }, [id, t]);

  // Підвантажуємо схему бази даних після того, як отримали дані задачі
  useEffect(() => {
    if (!task) return;
    loadSchema();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  // Функція для завантаження схеми бази даних (таблиці + колонки)
  const loadSchema = async () => {
    setLoadingSchema(true);
    setSchema(null);
    try {
      // Викликаємо ендпоінт для отримання схеми конкретної задачі
      const res = await api.get(`/api/tasks/${id}/schema/`);
      // Зберігаємо отриману схему у стані
      setSchema(res.data);
    } catch (err) {
      console.error(err);
      setSchema(null);
    } finally {
      setLoadingSchema(false);
    }
  };

  // Обробник кнопки "Back": повертає на сторінку курсу або до загальної сторінки курсів
  const handleBack = () => {
    if (task?.course) {
      navigate(`/courses/${task.course}`);
    } else {
      navigate('/courses');
    }
  };

  // Функція для попереднього перегляду (preview) SQL-коду студента
  const handlePreviewSql = async () => {
    setExecuting(true);
    setPreviewResults([]);
    setPreviewColumns([]);
    setPreviewError(null);

    try {
      // Викликаємо endpoint /api/tasks/{id}/execute/
      // Цей endpoint відновить початковий дамп із task.original_db і виконає SQL студента.
      const payload = {
        sql: studentSql
      };
      const res = await api.post(`/api/tasks/${id}/execute/`, payload);

      // Бекенд повертає структуру { results: [...], columns: [...] }
      const results = res.data.results || [];
      // Якщо немає явно columns, беремо ключі першого об’єкта в results
      const columns = res.data.columns || Object.keys(results[0] || {});

      setPreviewResults(results);
      setPreviewColumns(columns);
    } catch (err) {
      console.error(err);
      // Зберігаємо помилку у стані, щоб показати користувачу
      setPreviewError(
        err.response?.data?.error || err.message || 'Помилка виконання SQL.'
      );
    } finally {
      setExecuting(false);
    }
  };

  // Функція для відправки рішення та порівняння з еталоном
  const handleSubmitSolution = async () => {
    setSubmitting(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      // Викликаємо endpoint /api/tasks/{id}/submit/
      // Тепер він просто порівнює поточний стан тимчасової БД (без повторного виконання SQL)
      const res = await api.post(`/api/tasks/${id}/submit/`, {}); // без sql
      setSubmitResult(res.data);
      // Після submit оновлюємо схему, щоб показати зміни (якщо рішення коректне)
      await loadSchema();
    } catch (err) {
      console.error(err);
      setSubmitError(
        err.response?.data?.error || err.message || 'Помилка надсилання рішення.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Компонент для відображення результатів PREVIEW (таблиця або повідомлення)
  const renderPreviewResults = () => {
    if (executing) {
      // Показуємо спінер, поки йде запит до сервера
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (previewError) {
      // Якщо сталася помилка, показуємо Alert
      return (
        <Alert severity="error" sx={{ my: 2 }}>
          {previewError}
        </Alert>
      );
    }
    if (!previewResults.length) {
      // Якщо запит виконався, але не повернув рядків
      return (
        <Alert severity="info" sx={{ my: 2 }}>
          {t('sql.noRows') || 'Запит виконано успішно (рядків не повернуто).'}
        </Alert>
      );
    }
    // Інакше — відображаємо результати в таблиці
    return (
      <Box sx={{ mt: 2 }}>
        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {previewColumns.map(col => (
                  <TableCell key={col}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewResults.map((row, idx) => (
                <TableRow key={idx}>
                  {previewColumns.map(col => (
                    <TableCell key={`${idx}-${col}`}>
                      {row[col] !== null ? String(row[col]) : 'NULL'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // Компонент для відображення схеми бази даних (таблиці + колонки)
  const renderSchema = () => {
    if (loadingSchema) {
      // Поки іде завантаження схеми, показуємо спінер
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }
    if (!schema || !schema.tables?.length) {
      // Якщо схема не доступна або немає таблиць
      return (
        <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
          {t('sql.noSchemaAvailable') || 'Схема недоступна.'}
        </Typography>
      );
    }
    // Відображаємо списком усі таблиці та їхні колонки
    return (
      <Box sx={{ mt: 2 }}>
        {schema.tables.map(table => (
          <Paper key={table} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {table}
            </Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('sql.column') || 'Колонка'}</TableCell>
                    <TableCell>{t('sql.type') || 'Тип'}</TableCell>
                    <TableCell align="center">PK</TableCell>
                    <TableCell align="center">Not Null</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schema.schema[table].map(column => (
                    <TableRow key={column.name}>
                      <TableCell>{column.name}</TableCell>
                      <TableCell>{column.type}</TableCell>
                      <TableCell align="center">{column.pk ? '✓' : ''}</TableCell>
                      <TableCell align="center">{column.notnull ? '✓' : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))}
      </Box>
    );
  };

  // Якщо дані задачі ще завантажуються, показуємо спінер на всю сторінку
  if (loadingTask) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Якщо при завантаженні сталася помилка або задача не знайдена
  if (error || !task) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            {error || t('task.taskNotFound') || 'Задача не знайдена.'}
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/courses')}>
            {t('task.backToCourses') || 'Повернутися до курсів'}
          </Button>
        </Paper>
      </Container>
    );
  }

  // Основний рендер компоненту
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        {/* Верхній блок: назва задачі і кнопка "Back" */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">{task.title}</Typography>
          <Button variant="outlined" onClick={handleBack}>
            {t('task.backToCourse') || 'Назад'}
          </Button>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Блок з інформацією про дедлайн */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t('task.dueDate') || 'Термін виконання'}
          </Typography>
          <Typography variant="body1">
            {task.due_date
              ? new Date(task.due_date).toLocaleString()
              : t('task.noDueDate') || '-'}
          </Typography>
        </Box>

        {/* Блок з описом задачі */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t('task.description') || 'Опис'}
          </Typography>
          <Typography variant="body1">{task.description}</Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Редактор SQL-коду студента */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">{t('task.yourSqlSolution') || 'Ваше SQL рішення'}</Typography>
          <Editor
            height="200px"
            defaultLanguage="sql"
            value={studentSql}
            onChange={setStudentSql}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </Box>

        {/* Кнопка Submit Solution (для порівняння з еталоном) */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmitSolution}
            disabled={submitting}
          >
            {submitting
              ? t('task.submitting') || 'Надсилання...'
              : t('task.submitSolution') || 'Здати рішення'}
          </Button>
        </Box>

        {/* Кнопка Preview SQL (для виконання змін у тимчасовій БД) */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            onClick={handlePreviewSql}
            disabled={executing}
          >
            {executing
              ? t('sql.executing') || 'Виконання...'
              : t('sql.preview') || 'Переглянути результат'}
          </Button>
        </Box>

        {/* Вкладки: Results (результати запиту) та Schema (схема БД) */}
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label={t('sql.results') || 'Результати'} />
          <Tab label={t('sql.schema') || 'Схема'} />
        </Tabs>

        {/* Якщо активна вкладка Results */}
        {activeTab === 0 && (
          <Box>
            {previewResults.length > 0 || executing || previewError
              ? renderPreviewResults()
              : <Alert severity="info" sx={{ my: 2 }}>
                  {t('sql.noPreview') || 'Перегляд результатів не виконано.'}
                </Alert>}
          </Box>
        )}

        {/* Якщо активна вкладка Schema */}
        {activeTab === 1 && renderSchema()}

        {/* Блок з результатами SUBMIT */}
        {submitResult && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            {/* Якщо правильне рішення */}
            {submitResult.correct === true && (
              <Alert severity="success">
                {t('task.correct') || 'Вірно! Ваше рішення збігається з еталоном.'}
              </Alert>
            )}
            {/* Якщо неправильне рішення */}
            {submitResult.correct === false && (
              <Alert severity="warning">
                {t('task.incorrect') || 'Невірно. Спробуйте ще раз.'}
              </Alert>
            )}
            {/* Якщо є подробиці про різниці */}
            {submitResult.details && Object.keys(submitResult.details).length > 0 && (
  <Box sx={{ mt: 2, textAlign: 'left' }}>
    <Typography variant="subtitle1">
      {t('task.differences') || 'Різниці:'}
    </Typography>
    {Object.entries(submitResult.details).map(([table, info]) => (
      <Box key={table} sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 2 }}>
        <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
          {t('task.table') || 'Таблиця'}: {table}
        </Typography>
        {info.status === 'row_count_mismatch' ? (
          <Typography variant="body2" color="error">
            {t('task.rowCountMismatch', {
              student: info.student_count,
              etalon: info.etalon_count
            }) ||
              `Кількість рядків не збігається: студент=${info.student_count}, еталон=${info.etalon_count}`}
          </Typography>
        ) : info.status === 'extra_table' ? (
          <Typography variant="body2" color="warning.main">
            {info.message || 'Таблиця створена студентом, але її немає в еталоні.'}
          </Typography>
        ) : info.status === 'missing_table' ? (
          <Typography variant="body2" color="error.main">
            {info.message || 'Таблиця повинна бути, але студент її не створив.'}
          </Typography>
        ) : info.differences ? (
          info.differences.map((diff, idx) => (
            <Box key={idx} sx={{ mb: 1, pl: 2 }}>
              <Typography variant="body2">
                Рядок {diff.row_index}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', ml: 2 }}>
                Студент: {JSON.stringify(diff.student)}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', ml: 2 }}>
                Еталон: {JSON.stringify(diff.etalon)}
              </Typography>
              {diff.diff_columns && diff.diff_columns.length > 0 && (
                <Box sx={{ mt: 1, mb: 1, ml: 3 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Відмінності у колонках:
                  </Typography>
                  {diff.diff_columns.map((col, colIdx) => (
                    <Typography
                      key={colIdx}
                      variant="body2"
                      color="error"
                      sx={{ fontFamily: 'monospace', ml: 2 }}
                    >
                      {col.column}: студент = {String(col.student_value)}, еталон = {String(col.etalon_value)}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          ))
        ) : null}
      </Box>
    ))}
  </Box>
)}


            {/* Якщо сталася помилка під час submit */}
            {submitError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {submitError}
              </Alert>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
}
