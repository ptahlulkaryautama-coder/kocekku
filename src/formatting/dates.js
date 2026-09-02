/**
 * Sakku — Date Formatting
 * 
 * Locale-aware date formatting. Never hardcodes DD/MM/YYYY.
 */

/**
 * Month names in English
 */
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Format a date string (YYYY-MM-DD) to a readable format.
 * 
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @param {string} format - 'short' | 'long' | 'iso' | 'relative'
 * @param {string} locale - BCP 47 locale (default: 'en-US')
 * @returns {string}
 */
export function formatDate(dateStr, format = 'short', locale = 'en-US') {
  if (!dateStr) return '';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (format === 'iso') return dateStr;

  if (format === 'long') {
    try {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(year, month, day));
    } catch {
      return `${MONTHS_LONG[month]} ${day}, ${year}`;
    }
  }

  if (format === 'relative') {
    return formatRelativeDate(dateStr);
  }

  // Default: short format
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(year, month, day));
  } catch {
    return `${MONTHS_SHORT[month]} ${day}, ${year}`;
  }
}

/**
 * Format a month string (YYYY-MM) to readable format.
 * 
 * @param {string} monthStr - Format: YYYY-MM
 * @param {string} format - 'short' | 'long'
 * @returns {string}
 */
export function formatMonth(monthStr, format = 'short') {
  if (!monthStr) return '';

  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;

  if (format === 'long') {
    return `${MONTHS_LONG[month]} ${year}`;
  }
  return `${MONTHS_SHORT[month]} ${year}`;
}

/**
 * Get a relative date string ("Today", "Yesterday", "3 days ago", etc.)
 */
function formatRelativeDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffMs = today - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get month index and year from a date string.
 */
export function getMonthYear(dateStr) {
  const d = new Date(dateStr);
  return { month: d.getMonth(), year: d.getFullYear() };
}

/**
 * Check if two date strings are in the same month.
 */
export function isSameMonth(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

/**
 * Get the month index (0-11) and year for navigation.
 */
export function navigatePeriod(currentMonth, currentYear, direction) {
  const d = new Date(currentYear, currentMonth + direction, 1);
  return { month: d.getMonth(), year: d.getFullYear() };
}
