/**
 * Sakku — Currency Formatting System
 * 
 * Centralized currency formatting using Intl.NumberFormat.
 * Supports 10 currencies. Never hardcodes "Rp" or any currency symbol.
 * Supports live currency conversion between currencies.
 */

import { convertCurrency } from '../data/exchange-rates.js';

/**
 * Supported currencies
 */
export const CURRENCIES = {
  USD: { symbol: '$',   code: 'USD', locale: 'en-US',  decimals: 2, name: 'US Dollar' },
  IDR: { symbol: 'Rp',  code: 'IDR', locale: 'id-ID',  decimals: 0, name: 'Indonesian Rupiah' },
  SGD: { symbol: 'S$',  code: 'SGD', locale: 'en-SG',  decimals: 2, name: 'Singapore Dollar' },
  MYR: { symbol: 'RM',  code: 'MYR', locale: 'ms-MY',  decimals: 2, name: 'Malaysian Ringgit' },
  EUR: { symbol: '€',   code: 'EUR', locale: 'de-DE',  decimals: 2, name: 'Euro' },
  GBP: { symbol: '£',   code: 'GBP', locale: 'en-GB',  decimals: 2, name: 'British Pound' },
  AUD: { symbol: 'A$',  code: 'AUD', locale: 'en-AU',  decimals: 2, name: 'Australian Dollar' },
  JPY: { symbol: '¥',   code: 'JPY', locale: 'ja-JP',  decimals: 0, name: 'Japanese Yen' },
  AED: { symbol: 'د.إ', code: 'AED', locale: 'ar-AE',  decimals: 2, name: 'UAE Dirham' },
  SAR: { symbol: 'ر.س', code: 'SAR', locale: 'ar-SA',  decimals: 2, name: 'Saudi Riyal' }
};

/**
 * Get currency config by code
 */
export function getCurrency(code) {
  return CURRENCIES[code] || CURRENCIES.USD;
}

/**
 * Format a monetary amount with the appropriate currency.
 * 
 * Supports optional currency conversion: pass `fromCurrency` in options
 * to automatically convert the amount before formatting.
 * 
 * @param {number} amount - The amount in source currency
 * @param {string} currencyCode - Target/display currency code (e.g., 'USD')
 * @param {object} options - Optional overrides
 * @param {string} options.fromCurrency - Source currency if different from display
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currencyCode = 'USD', options = {}) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  // Convert if source currency differs from display currency
  if (options.fromCurrency && options.fromCurrency !== currencyCode) {
    amount = convertCurrency(amount, options.fromCurrency, currencyCode);
  }

  const currency = getCurrency(currencyCode);
  const locale = options.locale || currency.locale;
  const decimals = options.decimals !== undefined ? options.decimals : currency.decimals;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  } catch (e) {
    // Fallback: manual formatting
    const formatted = Number(amount).toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `${currency.symbol}${formatted}`;
  }
}

/**
 * Format amount without currency symbol (for compact display).
 * 
 * @param {number} amount
 * @param {string} currencyCode
 * @returns {string}
 */
export function formatAmount(amount, currencyCode = 'USD') {
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  const currency = getCurrency(currencyCode);

  try {
    return new Intl.NumberFormat(currency.locale, {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals
    }).format(amount);
  } catch (e) {
    return Number(amount).toLocaleString();
  }
}

/**
 * Format a compact amount (e.g., "1.2K", "3.5M") for charts and tight spaces.
 */
export function formatCompact(amount, currencyCode = 'USD') {
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const currency = getCurrency(currencyCode);

  if (absAmount >= 1_000_000_000) {
    return `${sign}${currency.symbol}${(absAmount / 1_000_000_000).toFixed(1)}B`;
  }
  if (absAmount >= 1_000_000) {
    return `${sign}${currency.symbol}${(absAmount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 1_000) {
    return `${sign}${currency.symbol}${(absAmount / 1_000).toFixed(1)}K`;
  }
  return `${sign}${currency.symbol}${absAmount}`;
}

/**
 * Parse a currency string back to a number.
 * Handles common formats like "$1,234.56", "Rp1.234.567", "€1.234,56"
 */
/**
 * Detect the dominant currency from a set of amounts with currencies.
 * Returns the currency of the largest total.
 * 
 * @param {Array<{amount: number, currency: string}>} items
 * @returns {string} Dominant currency code
 */
export function detectDominantCurrency(items) {
  const totals = {};
  for (const item of items) {
    const cur = item.currency || 'IDR';
    totals[cur] = (totals[cur] || 0) + Math.abs(item.amount || 0);
  }
  let max = 0;
  let dominant = 'IDR';
  for (const [cur, total] of Object.entries(totals)) {
    if (total > max) { max = total; dominant = cur; }
  }
  return dominant;
}

export function parseCurrency(formatted, currencyCode = 'USD') {
  if (typeof formatted !== 'string') return 0;

  const currency = getCurrency(currencyCode);

  // Remove currency symbol and whitespace
  let cleaned = formatted
    .replace(new RegExp(`[${currency.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s]`, 'g'), '')
    .trim();

  // Handle different decimal separators based on locale
  if (['de-DE', 'fr-FR', 'es-ES', 'it-IT'].includes(currency.locale)) {
    // European: 1.234,56 → 1234.56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (currency.locale === 'id-ID') {
    // Indonesian: 1.234.567 → 1234567 (no decimal separator for IDR)
    cleaned = cleaned.replace(/\./g, '');
  } else {
    // US/UK/AU: 1,234.56 → 1234.56
    cleaned = cleaned.replace(/,/g, '');
  }

  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}
