import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Імпорт перекладів
import translationEN from './locales/en/translation.json';
import translationUA from './locales/ua/translation.json';

// Ресурси для i18next
const resources = {
  en: {
    translation: translationEN
  },
  ua: {
    translation: translationUA
  }
};

i18n
  // Визначаємо мову користувача
  .use(LanguageDetector)
  // Передаємо інстанс i18n в react-i18next
  .use(initReactI18next)
  // Ініціалізуємо i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React вже екранує значення
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });
