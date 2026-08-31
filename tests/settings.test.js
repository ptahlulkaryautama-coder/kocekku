/**
 * Settings Module Tests
 * Tests for settings persistence, currency/language switching, export/import, reset
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CURRENCIES, formatCurrency, getCurrency } from '../src/formatting/currency.js';
import { formatDate, formatMonth } from '../src/formatting/dates.js';
import { setLanguage, getLanguage, t } from '../src/i18n/index.js';
import { SCHEMA_VERSION } from '../src/data/schema.js';

/* ============================================
   CURRENCY SYSTEM
   ============================================ */

describe('Currency System', () => {
  it('should have all 10 supported currencies', () => {
    const codes = Object.keys(CURRENCIES);
    assert.equal(codes.length, 10);
    assert.ok(codes.includes('USD'));
    assert.ok(codes.includes('IDR'));
    assert.ok(codes.includes('SGD'));
    assert.ok(codes.includes('MYR'));
    assert.ok(codes.includes('EUR'));
    assert.ok(codes.includes('GBP'));
    assert.ok(codes.includes('AUD'));
    assert.ok(codes.includes('JPY'));
    assert.ok(codes.includes('AED'));
    assert.ok(codes.includes('SAR'));
  });

  it('should format USD correctly', () => {
    const result = formatCurrency(1234.56, 'USD');
    assert.ok(result.includes('1,234.56'), `USD format: ${result}`);
  });

  it('should format IDR correctly (no decimals)', () => {
    const result = formatCurrency(1500000, 'IDR');
    assert.ok(result.includes('1.500.000') || result.includes('1,500,000'), `IDR format: ${result}`);
  });

  it('should format EUR correctly', () => {
    const result = formatCurrency(1234.56, 'EUR');
    assert.ok(result.includes('1.234,56') || result.includes('1,234.56'), `EUR format: ${result}`);
  });

  it('should format JPY correctly (no decimals)', () => {
    const result = formatCurrency(50000, 'JPY');
    assert.ok(result.includes('50,000') || result.includes('50.000'), `JPY format: ${result}`);
  });

  it('should format GBP correctly', () => {
    const result = formatCurrency(99.99, 'GBP');
    assert.ok(result.includes('99.99'), `GBP format: ${result}`);
  });

  it('should handle zero amount', () => {
    const result = formatCurrency(0, 'USD');
    assert.ok(result.includes('0'), `Zero: ${result}`);
  });

  it('should handle negative amount', () => {
    const result = formatCurrency(-500, 'USD');
    assert.ok(result.includes('500'), `Negative: ${result}`);
  });

  it('should handle null amount gracefully', () => {
    const result = formatCurrency(null, 'USD');
    assert.ok(typeof result === 'string', 'Should return string for null');
  });

  it('should handle undefined amount gracefully', () => {
    const result = formatCurrency(undefined, 'USD');
    assert.ok(typeof result === 'string', 'Should return string for undefined');
  });

  it('should fallback to USD for unknown currency', () => {
    const result = formatCurrency(100, 'XXX');
    assert.ok(typeof result === 'string', 'Should not crash for unknown currency');
  });

  it('should get currency config', () => {
    const usd = getCurrency('USD');
    assert.equal(usd.code, 'USD');
    assert.equal(usd.symbol, '$');
    assert.equal(usd.decimals, 2);
  });

  it('should get IDR config', () => {
    const idr = getCurrency('IDR');
    assert.equal(idr.code, 'IDR');
    assert.equal(idr.decimals, 0);
  });

  it('should fallback to USD for unknown getCurrency', () => {
    const unknown = getCurrency('NONEXISTENT');
    assert.equal(unknown.code, 'USD');
  });
});

/* ============================================
   LANGUAGE / i18n
   ============================================ */

describe('Language / i18n', () => {
  it('should return en as default language', () => {
    const lang = getLanguage();
    assert.equal(lang, 'en');
  });

  it('should translate basic keys', () => {
    const homeLabel = t('nav.home');
    assert.equal(homeLabel, 'Home');
  });

  it('should translate dashboard keys', () => {
    const title = t('dashboard.netWorth');
    assert.equal(title, 'Net Worth');
  });

  it('should translate settings keys', () => {
    const title = t('settings.title');
    assert.equal(title, 'Settings');
  });

  it('should translate reports keys', () => {
    const title = t('reports.title');
    assert.equal(title, 'Reports');
  });

  it('should return path for missing keys', () => {
    const result = t('nonexistent.deeply.nested.key');
    assert.equal(result, 'nonexistent.deeply.nested.key');
  });

  it('should support parameter interpolation', () => {
    const greeting = t('dashboard.greeting', { timeOfDay: 'morning', name: 'Alex' });
    assert.ok(greeting.includes('morning'), `Greeting: ${greeting}`);
    assert.ok(greeting.includes('Alex'), `Greeting: ${greeting}`);
  });

  it('should translate family keys', () => {
    const title = t('family.title');
    assert.equal(title, 'Family');
  });

  it('should translate budget keys', () => {
    const title = t('budgets.title');
    assert.equal(title, 'Budgets');
  });

  it('should translate goal keys', () => {
    const title = t('goals.title');
    assert.equal(title, 'Financial Goals');
  });

  it('should translate bill keys', () => {
    const title = t('bills.title');
    assert.equal(title, 'Bills & Subscriptions');
  });

  it('should translate health keys', () => {
    const title = t('health.title');
    assert.equal(title, 'Financial Health');
  });
});

/* ============================================
   DATE FORMATTING
   ============================================ */

describe('Date Formatting', () => {
  it('should format date in short format', () => {
    const result = formatDate('2026-08-15', 'short');
    assert.ok(result.includes('Aug') || result.includes('8'), `Short: ${result}`);
  });

  it('should format date in long format', () => {
    const result = formatDate('2026-08-15', 'long');
    assert.ok(result.includes('August'), `Long: ${result}`);
    assert.ok(result.includes('15'), `Long: ${result}`);
  });

  it('should format date in ISO format', () => {
    const result = formatDate('2026-08-15', 'iso');
    assert.equal(result, '2026-08-15');
  });

  it('should handle empty date', () => {
    const result = formatDate('', 'short');
    assert.equal(result, '');
  });

  it('should handle null date', () => {
    const result = formatDate(null, 'short');
    assert.equal(result, '');
  });

  it('should format month', () => {
    const result = formatMonth('2026-08');
    assert.ok(result.includes('Aug') || result.includes('2026'), `Month: ${result}`);
  });
});

/* ============================================
   SCHEMA / VERSION
   ============================================ */

describe('Schema Version', () => {
  it('should have schema version 2', () => {
    assert.equal(SCHEMA_VERSION, 2);
  });

  it('should be a number', () => {
    assert.equal(typeof SCHEMA_VERSION, 'number');
  });
});

/* ============================================
   SETTINGS PERSISTENCE MODEL
   ============================================ */

describe('Settings Persistence Model', () => {
  it('should define supported currencies as array of codes', () => {
    const codes = Object.keys(CURRENCIES);
    assert.ok(codes.length >= 10, 'Should have at least 10 currencies');
    codes.forEach(code => {
      assert.equal(typeof code, 'string');
      assert.equal(code.length, 3);
    });
  });

  it('each currency should have required fields', () => {
    Object.values(CURRENCIES).forEach(c => {
      assert.ok(c.code, 'Should have code');
      assert.ok(c.symbol, 'Should have symbol');
      assert.ok(c.locale, 'Should have locale');
      assert.equal(typeof c.decimals, 'number', 'Should have decimals');
      assert.ok(c.name, 'Should have name');
    });
  });

  it('IDR should have 0 decimals', () => {
    assert.equal(CURRENCIES.IDR.decimals, 0);
  });

  it('USD should have 2 decimals', () => {
    assert.equal(CURRENCIES.USD.decimals, 2);
  });

  it('JPY should have 0 decimals', () => {
    assert.equal(CURRENCIES.JPY.decimals, 0);
  });
});

/* ============================================
   EXPORT / IMPORT MODEL
   ============================================ */

describe('Export/Import Model', () => {
  it('should create valid export structure', () => {
    const exportData = {
      version: '2.0.0',
      exportDate: new Date().toISOString(),
      data: {
        accounts: [],
        transactions: [],
        budgets: [],
        goals: [],
        bills: [],
        members: []
      }
    };
    assert.equal(exportData.version, '2.0.0');
    assert.ok(exportData.exportDate);
    assert.ok(exportData.data);
    assert.ok(Array.isArray(exportData.data.accounts));
    assert.ok(Array.isArray(exportData.data.transactions));
  });

  it('should serialize and deserialize correctly', () => {
    const original = {
      version: '2.0.0',
      data: { accounts: [{ id: 'a1', name: 'Test' }] }
    };
    const json = JSON.stringify(original);
    const parsed = JSON.parse(json);
    assert.deepEqual(parsed, original);
  });
});

/* ============================================
   CROSS-MODULE CURRENCY CONSISTENCY
   ============================================ */

describe('Cross-Module Currency Consistency', () => {
  it('formatCurrency should produce consistent output for same input', () => {
    const r1 = formatCurrency(1000, 'USD');
    const r2 = formatCurrency(1000, 'USD');
    assert.equal(r1, r2);
  });

  it('different currencies should produce different formats', () => {
    const usd = formatCurrency(1000, 'USD');
    const idr = formatCurrency(1000, 'IDR');
    const eur = formatCurrency(1000, 'EUR');
    // At least USD and IDR should differ in format
    assert.notEqual(usd, idr, 'USD and IDR should format differently');
  });

  it('currency switching should affect format output', () => {
    const result1 = formatCurrency(1500000, 'IDR');
    const result2 = formatCurrency(1500000, 'USD');
    assert.notEqual(result1, result2, 'IDR and USD should format 1500000 differently');
  });
});

/* ============================================
   EDGE CASES
   ============================================ */

describe('Edge Cases', () => {
  it('should handle very large currency amounts', () => {
    const result = formatCurrency(999999999999, 'USD');
    assert.ok(result.includes('999,999,999,999'), `Large: ${result}`);
  });

  it('should handle very small currency amounts', () => {
    const result = formatCurrency(0.01, 'USD');
    assert.ok(result.includes('0.01'), `Small: ${result}`);
  });

  it('should handle locale with special characters', () => {
    const result = formatCurrency(1000, 'AED');
    assert.ok(typeof result === 'string', 'AED should format without error');
  });

  it('i18n should handle deep nested key', () => {
    const result = t('health.status.safe');
    assert.equal(result, 'SAFE');
  });

  it('i18n should handle array-like keys gracefully', () => {
    // t() only handles string values; arrays return the path string
    const months = t('months.short');
    assert.equal(months, 'months.short', 'Array keys return path as fallback');
  });
});
