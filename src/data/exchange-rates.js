/**
 * Exchange Rate Service
 * 
 * Fetches live exchange rates, caches them in localStorage (24h TTL),
 * and provides conversion functions.
 * 
 * Primary API: frankfurter.app (free, no key needed)
 * Fallback: hardcoded approximate rates
 */

const CACHE_KEY = 'nestiq_exchange_rates';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const API_BASE = 'https://api.frankfurter.app';

/** Supported currencies that have exchange rates */
const SUPPORTED = ['USD', 'IDR', 'SGD', 'MYR', 'EUR', 'GBP', 'AUD', 'JPY', 'AED', 'SAR'];

/**
 * Hardcoded fallback rates (relative to USD).
 * Used when API is unreachable.
 */
const FALLBACK_RATES = {
  USD: 1,
  IDR: 15980,
  SGD: 1.34,
  MYR: 4.72,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  JPY: 149.5,
  AED: 3.67,
  SAR: 3.75,
};

/**
 * Get cached rates from localStorage
 */
function getCachedRates() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.rates;
  } catch {
    return null;
  }
}

/**
 * Save rates to localStorage cache
 */
function cacheRates(rates) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      rates,
      timestamp: Date.now(),
    }));
  } catch { /* quota exceeded, ignore */ }
}

/**
 * Fetch live exchange rates from frankfurter.app
 * Returns rates relative to USD: { USD: 1, IDR: 15980, ... }
 */
async function fetchRates() {
  try {
    const currencies = SUPPORTED.filter(c => c !== 'USD').join(',');
    const resp = await fetch(`${API_BASE}/latest?from=USD&to=${currencies}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    
    const rates = { USD: 1, ...data.rates };
    cacheRates(rates);
    return rates;
  } catch (err) {
    console.warn('[ExchangeRates] Fetch failed, using cache or fallback:', err.message);
    return getCachedRates() || FALLBACK_RATES;
  }
}

/**
 * Get current rates (synchronous, from cache or fallback).
 * Kicks off a background refresh if cache is stale.
 */
let _ratesPromise = null;
let _rates = getCachedRates() || FALLBACK_RATES;

/**
 * Initialize rates — call once at app startup.
 * Fetches fresh rates in background.
 */
export async function initExchangeRates() {
  _rates = getCachedRates() || FALLBACK_RATES;
  _ratesPromise = fetchRates().then(r => { _rates = r; return r; });
  return _ratesPromise;
}

/**
 * Get current rates (may be stale if API hasn't responded yet)
 */
export function getRates() {
  return _rates;
}

/**
 * Convert an amount from one currency to another.
 * 
 * @param {number} amount - Amount in source currency
 * @param {string} from - Source currency code (e.g., 'IDR')
 * @param {string} to - Target currency code (e.g., 'USD')
 * @returns {number} Converted amount
 */
export function convertCurrency(amount, from, to) {
  if (!amount || amount === 0) return 0;
  if (from === to) return amount;
  
  const rates = _rates;
  
  // Both currencies must be in our rate table
  if (!rates[from] || !rates[to]) return amount;
  
  // Convert: source → USD → target
  const inUSD = amount / rates[from];
  return inUSD * rates[to];
}

/**
 * Get the last time rates were updated.
 */
export function getRatesTimestamp() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw).timestamp;
  } catch {
    return null;
  }
}

/**
 * Force refresh rates (for manual refresh button).
 */
export async function refreshRates() {
  _rates = await fetchRates();
  return _rates;
}
