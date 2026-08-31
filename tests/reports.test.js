/**
 * Reports Module Tests
 * Tests for report generation, CSV export, JSON export, and summary calculations
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateCashFlow,
  spendingByCategory,
  incomeBySource,
  getTransactionsForPeriod,
  sortTransactions,
} from '../src/domain/transactions.js';

import {
  calculateTotalBalance,
  calculateAvailableCash,
  calculateTotalAssets,
  calculateTotalLiabilities,
} from '../src/domain/accounts.js';

import {
  calculateAllBudgetUsages,
  getBudgetSummary,
} from '../src/domain/budgets.js';

import {
  calculateAllGoalsProgress,
  getGoalsSummary,
} from '../src/domain/goals.js';

/* ============================================
   TEST DATA FIXTURES
   ============================================ */

const ACCOUNTS = [
  { id: 'acc1', nama: 'Cash', jenis: 'kas', saldo: 2000000, normalizedType: 'cash', currency: 'IDR' },
  { id: 'acc2', nama: 'BCA', jenis: 'bank', saldo: 15000000, normalizedType: 'checking', currency: 'IDR' },
  { id: 'acc3', nama: 'Savings', jenis: 'tabungan', saldo: 10000000, normalizedType: 'savings', currency: 'IDR' },
  { id: 'acc4', nama: 'Credit Card', jenis: 'kartu kredit', saldo: -2500000, normalizedType: 'credit', currency: 'IDR' },
  { id: 'acc5', nama: 'Stocks', jenis: 'investasi', saldo: 20000000, normalizedType: 'investment', currency: 'IDR' },
];

function txn(overrides = {}) {
  return {
    id: `txn_${Math.random().toString(36).substr(2, 9)}`,
    tanggal: '2026-08-15',
    keterangan: 'Test',
    jumlah: 100000,
    tipe: 'keluar',
    dompet: 'acc2',
    kategori: 'Makan & Jajan',
    pengeluar: '',
    catatan: '',
    ...overrides,
  };
}

const TRANSACTIONS = [
  // Income
  txn({ id: 't1', tanggal: '2026-08-01', keterangan: 'Salary', jumlah: 15000000, tipe: 'masuk', kategori: 'Gaji' }),
  txn({ id: 't2', tanggal: '2026-08-05', keterangan: 'Freelance', jumlah: 3000000, tipe: 'masuk', kategori: 'Freelance' }),
  txn({ id: 't3', tanggal: '2026-08-10', keterangan: 'Bonus', jumlah: 2000000, tipe: 'masuk', kategori: 'Gaji' }),
  // Expenses
  txn({ id: 't4', tanggal: '2026-08-02', keterangan: 'Groceries', jumlah: 1500000, tipe: 'keluar', kategori: 'Makan & Jajan' }),
  txn({ id: 't5', tanggal: '2026-08-03', keterangan: 'Transport', jumlah: 500000, tipe: 'keluar', kategori: 'Transportasi' }),
  txn({ id: 't6', tanggal: '2026-08-05', keterangan: 'Electricity', jumlah: 800000, tipe: 'keluar', kategori: 'Tagihan & Listrik' }),
  txn({ id: 't7', tanggal: '2026-08-07', keterangan: 'Dinner', jumlah: 350000, tipe: 'keluar', kategori: 'Makan & Jajan' }),
  txn({ id: 't8', tanggal: '2026-08-10', keterangan: 'Clothes', jumlah: 1200000, tipe: 'keluar', kategori: 'Belanja' }),
  txn({ id: 't9', tanggal: '2026-08-12', keterangan: 'Internet', jumlah: 500000, tipe: 'keluar', kategori: 'Tagihan & Listrik' }),
  txn({ id: 't10', tanggal: '2026-08-15', keterangan: 'Lunch', jumlah: 75000, tipe: 'keluar', kategori: 'Makan & Jajan' }),
  // Transfer
  txn({ id: 't11', tanggal: '2026-08-08', keterangan: 'Transfer to savings', jumlah: 2000000, tipe: 'transfer', kategori: '' }),
  // July transaction (different month)
  txn({ id: 't12', tanggal: '2026-07-15', keterangan: 'Old expense', jumlah: 500000, tipe: 'keluar', kategori: 'Lainnya' }),
];

/* ============================================
   MONTHLY SUMMARY CALCULATIONS
   ============================================ */

describe('Monthly Summary Calculations', () => {
  it('should calculate monthly income correctly', () => {
    const income = calculateMonthlyIncome(TRANSACTIONS, 2026, 7); // August = 7 (0-indexed)
    assert.equal(income, 20000000); // 15M + 3M + 2M
  });

  it('should calculate monthly expenses correctly', () => {
    const expenses = calculateMonthlyExpenses(TRANSACTIONS, 2026, 7);
    assert.equal(expenses, 4925000); // 1.5M + 500K + 800K + 350K + 1.2M + 500K + 75K
  });

  it('should calculate cash flow correctly', () => {
    const cashFlow = calculateCashFlow(TRANSACTIONS, 2026, 7);
    assert.equal(cashFlow, 15075000); // 20M - 4.925M
  });

  it('should calculate savings rate correctly', () => {
    const income = calculateMonthlyIncome(TRANSACTIONS, 2026, 7);
    const expenses = calculateMonthlyExpenses(TRANSACTIONS, 2026, 7);
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    assert.equal(savingsRate, 75); // 75%
  });

  it('should handle zero income gracefully', () => {
    const emptyTxns = TRANSACTIONS.filter(t => t.tipe !== 'masuk');
    const income = calculateMonthlyIncome(emptyTxns, 2026, 7);
    assert.equal(income, 0);
    const savingsRate = income > 0 ? Math.round(((income - 0) / income) * 100) : 0;
    assert.equal(savingsRate, 0);
  });

  it('should only count transactions for the specified month', () => {
    const income = calculateMonthlyIncome(TRANSACTIONS, 2026, 6); // July
    assert.equal(income, 0, 'No income in July');
  });
});

/* ============================================
   INCOME REPORT
   ============================================ */

describe('Income Report', () => {
  it('should group income by source', () => {
    const sources = incomeBySource(TRANSACTIONS, 2026, 7);
    assert.equal(sources['Gaji'], 17000000); // 15M + 2M
    assert.equal(sources['Freelance'], 3000000);
  });

  it('should exclude expenses from income report', () => {
    const sources = incomeBySource(TRANSACTIONS, 2026, 7);
    assert.equal(sources['Makan & Jajan'], undefined);
  });

  it('should exclude transfers from income report', () => {
    const sources = incomeBySource(TRANSACTIONS, 2026, 7);
    const totalIncome = Object.values(sources).reduce((a, b) => a + b, 0);
    assert.equal(totalIncome, 20000000);
  });

  it('should handle empty income', () => {
    const emptyTxns = TRANSACTIONS.filter(t => t.tipe !== 'masuk');
    const sources = incomeBySource(emptyTxns, 2026, 7);
    assert.deepEqual(sources, {});
  });
});

/* ============================================
   EXPENSE REPORT
   ============================================ */

describe('Expense Report', () => {
  it('should group expenses by category', () => {
    const categories = spendingByCategory(TRANSACTIONS, 2026, 7);
    assert.equal(categories['Makan & Jajan'], 1925000); // 1.5M + 350K + 75K
    assert.equal(categories['Transportasi'], 500000);
    assert.equal(categories['Tagihan & Listrik'], 1300000); // 800K + 500K
    assert.equal(categories['Belanja'], 1200000);
  });

  it('should exclude income from expense report', () => {
    const categories = spendingByCategory(TRANSACTIONS, 2026, 7);
    assert.equal(categories['Gaji'], undefined);
  });

  it('should exclude transfers from expense report', () => {
    const categories = spendingByCategory(TRANSACTIONS, 2026, 7);
    const totalExpenses = Object.values(categories).reduce((a, b) => a + b, 0);
    assert.equal(totalExpenses, 4925000);
  });

  it('should handle empty expenses', () => {
    const emptyTxns = TRANSACTIONS.filter(t => t.tipe !== 'keluar');
    const categories = spendingByCategory(emptyTxns, 2026, 7);
    assert.deepEqual(categories, {});
  });

  it('should default category to Lainnya if missing', () => {
    const txns = [txn({ kategori: '', jumlah: 100000, tipe: 'keluar', tanggal: '2026-08-10' })];
    const categories = spendingByCategory(txns, 2026, 7);
    assert.equal(categories['Lainnya'], 100000);
  });
});

/* ============================================
   CSV GENERATION
   ============================================ */

describe('CSV Generation', () => {
  function generateCSV(transactions, accounts) {
    const accountMap = {};
    accounts.forEach(a => { accountMap[a.id] = a.nama; });

    const header = 'Date,Description,Amount,Type,Account,Category,Member,Notes';
    const rows = transactions.map(t => {
      const type = t.tipe === 'masuk' ? 'Income' : t.tipe === 'keluar' ? 'Expense' : 'Transfer';
      const account = accountMap[t.dompet] || t.dompet || '';
      return [
        t.tanggal,
        `"${(t.keterangan || '').replace(/"/g, '""')}"`,
        t.jumlah,
        type,
        `"${account}"`,
        `"${t.kategori || ''}"`,
        `"${t.pengeluar || ''}"`,
        `"${(t.catatan || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  it('should generate CSV with header', () => {
    const csv = generateCSV(TRANSACTIONS, ACCOUNTS);
    const lines = csv.split('\n');
    assert.equal(lines[0], 'Date,Description,Amount,Type,Account,Category,Member,Notes');
  });

  it('should generate correct number of rows', () => {
    const csv = generateCSV(TRANSACTIONS, ACCOUNTS);
    const lines = csv.split('\n');
    assert.equal(lines.length, TRANSACTIONS.length + 1); // header + data rows
  });

  it('should format income as "Income"', () => {
    const csv = generateCSV([TRANSACTIONS[0]], ACCOUNTS);
    assert.ok(csv.includes(',Income,'), 'Income type should appear');
  });

  it('should format expense as "Expense"', () => {
    const csv = generateCSV([TRANSACTIONS[3]], ACCOUNTS);
    assert.ok(csv.includes(',Expense,'), 'Expense type should appear');
  });

  it('should format transfer as "Transfer"', () => {
    const csv = generateCSV([TRANSACTIONS[10]], ACCOUNTS);
    assert.ok(csv.includes(',Transfer,'), 'Transfer type should appear');
  });

  it('should resolve account name', () => {
    const csv = generateCSV([TRANSACTIONS[0]], ACCOUNTS);
    assert.ok(csv.includes('"BCA"'), 'Account name should be resolved');
  });

  it('should handle empty transactions', () => {
    const csv = generateCSV([], ACCOUNTS);
    const lines = csv.split('\n');
    assert.equal(lines.length, 1); // only header
  });

  it('should escape quotes in description', () => {
    const testTxn = [txn({ keterangan: 'He said "hello"', jumlah: 100000, tipe: 'keluar', tanggal: '2026-08-10' })];
    const csv = generateCSV(testTxn, ACCOUNTS);
    assert.ok(csv.includes('He said ""hello""'), 'Quotes should be escaped');
  });

  it('should produce valid CSV content', () => {
    const csv = generateCSV(TRANSACTIONS, ACCOUNTS);
    assert.ok(csv.length > 0, 'CSV should not be empty');
    assert.ok(csv.includes('Salary'), 'CSV should contain transaction descriptions');
    assert.ok(csv.includes('Groceries'), 'CSV should contain expense descriptions');
  });
});

/* ============================================
   JSON EXPORT
   ============================================ */

describe('JSON Export', () => {
  it('should create valid backup object', () => {
    const data = {
      accounts: ACCOUNTS,
      transactions: TRANSACTIONS,
      budgets: [],
      goals: [],
      bills: [],
      members: [],
    };
    const json = JSON.stringify(data);
    const parsed = JSON.parse(json);
    assert.equal(parsed.accounts.length, ACCOUNTS.length);
    assert.equal(parsed.transactions.length, TRANSACTIONS.length);
  });

  it('should preserve all transaction fields', () => {
    const original = TRANSACTIONS[0];
    const json = JSON.stringify(original);
    const parsed = JSON.parse(json);
    assert.equal(parsed.id, original.id);
    assert.equal(parsed.tanggal, original.tanggal);
    assert.equal(parsed.keterangan, original.keterangan);
    assert.equal(parsed.jumlah, original.jumlah);
    assert.equal(parsed.tipe, original.tipe);
    assert.equal(parsed.dompet, original.dompet);
    assert.equal(parsed.kategori, original.kategori);
  });

  it('should handle special characters in JSON', () => {
    const data = { description: 'Test "quotes" and \\backslash' };
    const json = JSON.stringify(data);
    const parsed = JSON.parse(json);
    assert.equal(parsed.description, data.description);
  });
});

/* ============================================
   PERIOD FILTERING
   ============================================ */

describe('Period Filtering', () => {
  it('should filter transactions for specific month', () => {
    const augustTxns = getTransactionsForPeriod(TRANSACTIONS, 2026, 7);
    assert.ok(augustTxns.length > 0, 'Should have August transactions');
    augustTxns.forEach(t => {
      const d = new Date(t.tanggal);
      assert.equal(d.getFullYear(), 2026);
      assert.equal(d.getMonth(), 7);
    });
  });

  it('should exclude other months', () => {
    const augustTxns = getTransactionsForPeriod(TRANSACTIONS, 2026, 7);
    const hasJuly = augustTxns.some(t => t.tanggal.startsWith('2026-07'));
    assert.equal(hasJuly, false, 'Should not include July transactions');
  });

  it('should return empty for month with no transactions', () => {
    const empty = getTransactionsForPeriod(TRANSACTIONS, 2026, 0); // January
    assert.equal(empty.length, 0);
  });
});

/* ============================================
   CROSS-MODULE CONSISTENCY
   ============================================ */

describe('Report Cross-Module Consistency', () => {
  it('total income should equal sum of income transactions', () => {
    const income = calculateMonthlyIncome(TRANSACTIONS, 2026, 7);
    const incomeTxns = TRANSACTIONS.filter(t => t.tipe === 'masuk');
    const sum = incomeTxns.reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);
    assert.equal(income, sum);
  });

  it('total expenses should equal sum of expense transactions for the month', () => {
    const expenses = calculateMonthlyExpenses(TRANSACTIONS, 2026, 7);
    const expenseTxns = TRANSACTIONS.filter(t => {
      const d = new Date(t.tanggal);
      return t.tipe === 'keluar' && d.getFullYear() === 2026 && d.getMonth() === 7;
    });
    const sum = expenseTxns.reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);
    assert.equal(expenses, sum);
  });

  it('cash flow should equal income minus expenses', () => {
    const cashFlow = calculateCashFlow(TRANSACTIONS, 2026, 7);
    const income = calculateMonthlyIncome(TRANSACTIONS, 2026, 7);
    const expenses = calculateMonthlyExpenses(TRANSACTIONS, 2026, 7);
    assert.equal(cashFlow, income - expenses);
  });

  it('spending by category total should equal monthly expenses', () => {
    const categories = spendingByCategory(TRANSACTIONS, 2026, 7);
    const categoryTotal = Object.values(categories).reduce((a, b) => a + b, 0);
    const expenses = calculateMonthlyExpenses(TRANSACTIONS, 2026, 7);
    assert.equal(categoryTotal, expenses);
  });

  it('income by source total should equal monthly income', () => {
    const sources = incomeBySource(TRANSACTIONS, 2026, 7);
    const sourceTotal = Object.values(sources).reduce((a, b) => a + b, 0);
    const income = calculateMonthlyIncome(TRANSACTIONS, 2026, 7);
    assert.equal(sourceTotal, income);
  });
});

/* ============================================
   EDGE CASES
   ============================================ */

describe('Edge Cases', () => {
  it('should handle empty transaction list', () => {
    const income = calculateMonthlyIncome([], 2026, 7);
    const expenses = calculateMonthlyExpenses([], 2026, 7);
    const cashFlow = calculateCashFlow([], 2026, 7);
    assert.equal(income, 0);
    assert.equal(expenses, 0);
    assert.equal(cashFlow, 0);
  });

  it('should handle null amounts gracefully', () => {
    const txns = [txn({ jumlah: null, tipe: 'keluar', tanggal: '2026-08-10' })];
    const expenses = calculateMonthlyExpenses(txns, 2026, 7);
    assert.equal(expenses, 0);
  });

  it('should handle very large amounts', () => {
    const txns = [txn({ jumlah: 999999999999, tipe: 'masuk', tanggal: '2026-08-10' })];
    const income = calculateMonthlyIncome(txns, 2026, 7);
    assert.equal(income, 999999999999);
  });

  it('should handle negative amounts (refunds)', () => {
    const txns = [txn({ jumlah: -100000, tipe: 'keluar', tanggal: '2026-08-10' })];
    const expenses = calculateMonthlyExpenses(txns, 2026, 7);
    assert.equal(expenses, -100000);
  });

  it('should sort transactions correctly', () => {
    const sorted = sortTransactions(TRANSACTIONS, 'tanggal', 'desc');
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(new Date(sorted[i - 1].tanggal) >= new Date(sorted[i].tanggal));
    }
  });

  it('should sort transactions ascending', () => {
    const sorted = sortTransactions(TRANSACTIONS, 'tanggal', 'asc');
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(new Date(sorted[i - 1].tanggal) <= new Date(sorted[i].tanggal));
    }
  });
});
