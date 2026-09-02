/**
 * Sakku — i18n System
 * 
 * Minimal internationalization layer.
 * English is the initial language. Architecture supports future languages.
 */

import en from './en.js';

const translations = { en };
let currentLanguage = 'en';

/**
 * Get a translation by dot-notation path.
 * 
 * @param {string} path - e.g., 'nav.home' or 'dashboard.greeting'
 * @param {object} params - Interpolation params, e.g., { name: 'Danu' }
 * @returns {string}
 */
export function t(path, params = {}) {
  const lang = translations[currentLanguage] || translations.en;
  const keys = path.split('.');
  let value = lang;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to English
      let fallback = translations.en;
      for (const k of keys) {
        if (fallback && typeof fallback === 'object' && k in fallback) {
          fallback = fallback[k];
        } else {
          return path; // Return path if not found
        }
      }
      value = fallback;
      break;
    }
  }

  if (typeof value !== 'string') {
    return path;
  }

  // Interpolate params: {name} → Danu
  return value.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? params[key] : `{${key}}`;
  });
}

/**
 * Set the current language.
 */
export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    document.documentElement.lang = lang === 'en' ? 'en' : lang;
  }
}

/**
 * Get the current language.
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Get a greeting based on time of day.
 */
export function getGreeting(userName) {
  const hour = new Date().getHours();
  let timeOfDay;

  if (hour < 12) timeOfDay = t('dashboard.morning');
  else if (hour < 18) timeOfDay = t('dashboard.afternoon');
  else timeOfDay = t('dashboard.evening');

  return t('dashboard.greeting', { timeOfDay, name: userName || 'there' });
}

export default { t, setLanguage, getLanguage, getGreeting };
