/**
 * Kocekku 2.0 — Number Formatting
 * 
 * Locale-aware number formatting.
 */

/**
 * Format a number with locale-aware separators.
 * 
 * @param {number} value
 * @param {string} locale - BCP 47 locale (default: 'en-US')
 * @param {object} options - Intl.NumberFormat options
 * @returns {string}
 */
export function formatNumber(value, locale = 'en-US', options = {}) {
  if (value === undefined || value === null || isNaN(value)) {
    value = 0;
  }

  const defaults = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  };

  try {
    return new Intl.NumberFormat(locale, { ...defaults, ...options }).format(value);
  } catch {
    return Number(value).toLocaleString();
  }
}

/**
 * Format a percentage.
 * 
 * @param {number} value - The percentage value (e.g., 75 for 75%)
 * @param {number} decimals - Decimal places
 * @returns {string}
 */
export function formatPercent(value, decimals = 0) {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format a compact number (e.g., "1.2K", "3.5M").
 */
export function formatCompactNumber(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}${abs}`;
}

/**
 * Calculate percentage of part relative to total.
 */
export function percentage(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
