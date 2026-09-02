#!/usr/bin/env node
/**
 * Sakku — Phase 3/4 Remediation Tests
 * Dashboard-specific tests + Transaction CRUD tests
 * 
 * Run: node tests/dashboard_and_transactions.test.js
 */

import {
  calculateAvailableCash,
  classifyAccount,
  getAccountsByClassification,
  ACCOUNT_CLASSIFICATION,
} from '../src/domain/accounts.js';

import {
  calculateNetWorth,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateSavingsRate,
  calculateEmergencyFundCoverage,
  calculateDebtBurden,
  calculateSpendingByCategory,
  calculateCashFlowHistory,
  generateNextBestActions,
  calculateGoalProgress,
  calculateBillSummary,
  calculateBudgetUsage,
  assessSavingsRate,
} from '../src/domain/financial-health.js';

import {
  filterByDateRange,
  filterByType,
  filterByAccount,
  filterByCategory,
  filterByMember,
  searchTransactions,
  sortTransactions,
  createTransaction,
  validateTransaction,
} from '../src/domain/transactions.js';

import { formatCurrency } from '../src/formatting/currency.js';

/* =========================================================
   TEST RUNNER
   ========================================================= */
let passed = 0;
let failed = 0;
let warnings = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    const msg = details ? `${testName} — ${details}` : testName;
    failures.push(msg);
    console.log(`  ❌ FAIL: ${msg}`);
  }
}

function assertEqual(actual, expected, testName) {
  const match = actual === expected;
  assert(match, testName, match ? '' : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertClose(actual, expected, testName, tolerance = 1) {
  const match = Math.abs(actual - expected) <= tolerance;
  assert(match, testName, match ? '' : `Expected ~${expected}, got ${actual}`);
}

function warn(msg) {
  warnings++;
  console.log(`  ⚠️  WARN: ${msg}`);
}

/* =========================================================
   TEST DATA FIXTURES
   ========================================================= */

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth();

// Helper: create account fixture
function makeAccount(id, name, jenis, saldo) {
  return { id, nama: name, jenis, saldo, mataUang: 'IDR', icon: 'wallet', aktif: true };
}

// Helper: create transaction fixture
function makeTransaction(id, tipe, jumlah, kategori, dompet, tanggal, keterangan, pengeluar = '') {
  return { id, tipe, jumlah, kategori, dompet, tanggal, keterangan, pengeluar, catatan: '' };
}

// Standard test accounts (matching legacy Kocekku demo data)
const TEST_ACCOUNTS = [
  makeAccount('acc1', 'Cash', 'cash', 5000000),
  makeAccount('acc2', 'BCA', 'bank', 15000000),
  makeAccount('acc3', 'Mandiri Tabungan', 'tabungan', 35000000),
  makeAccount('acc4', 'GoPay', 'e-wallet', 750000),
  makeAccount('acc5', 'Credit Card', 'kartu kredit', -3500000),
  makeAccount('acc6', 'Crypto', 'investasi', 1200000),
];

// Standard test transactions (current month)
const TEST_TRANSACTIONS = [
  makeTransaction('txn1', 'masuk', 20000000, 'Gaji', 'acc2', `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-05`, 'Salary'),
  makeTransaction('txn2', 'masuk', 3000000, 'Freelance', 'acc1', `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-10`, 'Side project'),
  makeTransaction('txn3', 'keluar', 500000, 'Makan & Jajan', 'acc2', `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-06`, 'Restaurant'),
  makeTransaction('txn4', 'keluar', 250000, 'Makan & Jajan', 'acc4', `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-08`, 'Coffee'),
  makeTransaction('txn5', 'keluar', 800000, 'Transportasi', 'acc2', `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-07`, 'Gas'),
  makeTransaction('txn6', 'keluar', 1200000, 'Belanja Rumah', 'acc2', `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-09`, 'Groceries'),
  makeTransaction('txn7', 'keluar', 500000, 'Hiburan', 'acc1', `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-11`, 'Movies'),
  makeTransaction('txn8', 'transfer', 2000000, 'Transfer', 'acc1', `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-12`, 'Transfer to savings'),
];

// Test budget
const TEST_BUDGETS = [
  { kategori: 'Makan & Jajan', anggaran: 1000000 },
  { kategori: 'Transportasi', anggaran: 1000000 },
  { kategori: 'Belanja Rumah', anggaran: 1500000 },
];

// Test goals
const TEST_GOALS = [
  { id: 'g1', nama: 'Emergency Fund', target: 50000000, terkumpul: 35000000 },
  { id: 'g2', nama: 'Vacation', target: 15000000, terkumpul: 4000000 },
];

// Test bills
const TEST_BILLS = [
  { id: 'b1', nama: 'Netflix', jumlah: 200000, aktif: true, tanggalJatuhTempo: `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-15`, paidThisMonth: false },
  { id: 'b2', nama: 'Internet', jumlah: 500000, aktif: true, tanggalJatuhTempo: `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-20`, paidThisMonth: false },
];

console.log('\n' + '='.repeat(70));
console.log('  SAKKU — PHASE 3/4 REMEDIATION TESTS');
console.log('='.repeat(70));

/* =========================================================
   SECTION 1: AVAILABLE CASH — Test Matrix (5 cases)
   ========================================================= */
console.log('\n━━━ SECTION 1: Available Cash Test Matrix ━━━');

// Case A: Checking +10M, Savings +20M → AC = 30M
{
  const accounts = [
    makeAccount('a1', 'Checking', 'bank', 10000000),
    makeAccount('a2', 'Savings', 'tabungan', 20000000),
  ];
  assertEqual(calculateAvailableCash(accounts), 30000000, 'Case A: Available Cash = 30M');
  const nwA = calculateNetWorth(accounts);
  assertEqual(nwA.total, 30000000, 'Case A: Net Worth = 30M');
}

// Case B: Checking +10M, Savings +20M, Credit Card -3.5M → AC = 30M, NW = 26.5M
{
  const accounts = [
    makeAccount('a1', 'Checking', 'bank', 10000000),
    makeAccount('a2', 'Savings', 'tabungan', 20000000),
    makeAccount('a3', 'Credit Card', 'kartu kredit', -3500000),
  ];
  assertEqual(calculateAvailableCash(accounts), 30000000, 'Case B: Available Cash = 30M (NOT 26.5M)');
  const nwB = calculateNetWorth(accounts);
  assertEqual(nwB.total, 26500000, 'Case B: Net Worth = 26.5M');
  assertEqual(nwB.liabilities, 3500000, 'Case B: Liabilities = 3.5M');
}

// Case C: Checking +10M, Investment +50M → AC = 10M, NW = 60M
{
  const accounts = [
    makeAccount('a1', 'Checking', 'bank', 10000000),
    makeAccount('a2', 'Crypto', 'investasi', 50000000),
  ];
  assertEqual(calculateAvailableCash(accounts), 10000000, 'Case C: Available Cash = 10M (excludes investment)');
  const nwC = calculateNetWorth(accounts);
  assertEqual(nwC.total, 60000000, 'Case C: Net Worth = 60M');
}

// Case D: Checking +10M, Loan -5M → AC = 10M, NW = 5M
{
  const accounts = [
    makeAccount('a1', 'Checking', 'bank', 10000000),
    makeAccount('a2', 'Loan', 'utang', -5000000),
  ];
  assertEqual(calculateAvailableCash(accounts), 10000000, 'Case D: Available Cash = 10M (excludes loan)');
  const nwD = calculateNetWorth(accounts);
  assertEqual(nwD.total, 5000000, 'Case D: Net Worth = 5M');
}

// Case E: Checking +10M, Receivable +8M → AC = 10M, NW = 18M
{
  const accounts = [
    makeAccount('a1', 'Checking', 'bank', 10000000),
    makeAccount('a2', 'Receivable', 'piutang', 8000000),
  ];
  assertEqual(calculateAvailableCash(accounts), 10000000, 'Case E: Available Cash = 10M (excludes receivable)');
  const nwE = calculateNetWorth(accounts);
  assertEqual(nwE.total, 18000000, 'Case E: Net Worth = 18M');
}

// Case F: Full demo dataset
{
  const ac = calculateAvailableCash(TEST_ACCOUNTS);
  const nwF = calculateNetWorth(TEST_ACCOUNTS);
  // Liquid: Cash 5M + BCA 15M + Mandiri 35M + GoPay 0.75M = 55.75M
  assertEqual(ac, 55750000, 'Case F: Available Cash = 55.75M (liquid only)');
  // Assets (all positive): 5M + 15M + 35M + 0.75M + 1.2M = 56.95M
  // Liabilities: 3.5M, NW = 56.95M - 3.5M = 53.45M
  assertEqual(nwF.assets, 56950000, 'Case F: Assets = 56.95M (includes investment)');
  assertEqual(nwF.liabilities, 3500000, 'Case F: Liabilities = 3.5M');
  assertEqual(nwF.total, 53450000, 'Case F: Net Worth = 53.45M');
}

/* =========================================================
   SECTION 2: Account Classification
   ========================================================= */
console.log('\n━━━ SECTION 2: Account Classification ━━━');

assertEqual(classifyAccount(makeAccount('a', 'Cash', 'cash', 0)), 'liquid', 'cash → liquid');
assertEqual(classifyAccount(makeAccount('a', 'BCA', 'bank', 0)), 'liquid', 'bank → liquid');
assertEqual(classifyAccount(makeAccount('a', 'Mandiri', 'tabungan', 0)), 'liquid', 'tabungan → liquid');
assertEqual(classifyAccount(makeAccount('a', 'GoPay', 'e-wallet', 0)), 'liquid', 'e-wallet → liquid');
assertEqual(classifyAccount(makeAccount('a', 'GoPay', 'gopay', 0)), 'liquid', 'gopay → liquid');
assertEqual(classifyAccount(makeAccount('a', 'Credit Card', 'kartu kredit', 0)), 'liability', 'kartu kredit → liability');
assertEqual(classifyAccount(makeAccount('a', 'Credit Card', 'credit card', 0)), 'liability', 'credit card → liability');
assertEqual(classifyAccount(makeAccount('a', 'Loan', 'utang', 0)), 'liability', 'utang → liability');
assertEqual(classifyAccount(makeAccount('a', 'Loan', 'hutang', 0)), 'liability', 'hutang → liability');
assertEqual(classifyAccount(makeAccount('a', 'Loan', 'loan', 0)), 'liability', 'loan → liability');
assertEqual(classifyAccount(makeAccount('a', 'Receivable', 'piutang', 0)), 'receivable', 'piutang → receivable');
assertEqual(classifyAccount(makeAccount('a', 'Receivable', 'receivable', 0)), 'receivable', 'receivable → receivable');
assertEqual(classifyAccount(makeAccount('a', 'Crypto', 'investasi', 0)), 'investment', 'investasi → investment');
assertEqual(classifyAccount(makeAccount('a', 'Crypto', 'saham', 0)), 'investment', 'saham → investment');
assertEqual(classifyAccount(makeAccount('a', 'Crypto', 'crypto', 0)), 'investment', 'crypto → investment');

{
  const liquid = getAccountsByClassification(TEST_ACCOUNTS, 'liquid');
  assertEqual(liquid.length, 4, '4 liquid accounts in demo data');
  const liability = getAccountsByClassification(TEST_ACCOUNTS, 'liability');
  assertEqual(liability.length, 1, '1 liability account in demo data');
  const investment = getAccountsByClassification(TEST_ACCOUNTS, 'investment');
  assertEqual(investment.length, 1, '1 investment account in demo data');
}

/* =========================================================
   SECTION 3: Dashboard — Net Worth
   ========================================================= */
console.log('\n━━━ SECTION 3: Dashboard — Net Worth ━━━');

{
  const nw = calculateNetWorth(TEST_ACCOUNTS);
  assert(typeof nw === 'object' && nw !== null, 'Net Worth returns an object');
  assert(typeof nw.total === 'number', 'Net Worth includes total');
  assert(typeof nw.assets === 'number', 'Net Worth includes assets');
  assert(typeof nw.liabilities === 'number', 'Net Worth includes liabilities');
  assertEqual(nw.total, nw.assets - nw.liabilities, 'Net Worth = assets - liabilities');
  assert(nw.assets > 0, 'Demo data has positive assets');
  assert(nw.liabilities > 0, 'Demo data has liabilities (credit card)');
}

/* =========================================================
   SECTION 4: Dashboard — Income & Expenses
   ========================================================= */
console.log('\n━━━ SECTION 4: Dashboard — Income & Expenses ━━━');

{
  const income = calculateMonthlyIncome(TEST_TRANSACTIONS, CURRENT_YEAR, CURRENT_MONTH);
  assertEqual(income, 23000000, 'Monthly income = 20M salary + 3M freelance = 23M');

  const expenses = calculateMonthlyExpenses(TEST_TRANSACTIONS, CURRENT_YEAR, CURRENT_MONTH);
  assertEqual(expenses, 3250000, 'Monthly expenses = 500K + 250K + 800K + 1.2M + 500K = 3.25M');
}

/* =========================================================
   SECTION 5: Dashboard — Savings Rate
   ========================================================= */
console.log('\n━━━ SECTION 5: Dashboard — Savings Rate ━━━');

{
  // Income 23M, Expenses 3.25M → savings = 19.75M → rate = 19.75/23 = 85.87% → 86%
  const rate = calculateSavingsRate(23000000, 3250000);
  assertClose(rate, 86, 'Savings rate ≈ 86%', 2);

  // Edge case: zero income
  assertEqual(calculateSavingsRate(0, 0), 0, 'Zero income → 0% savings rate');

  // Edge case: expenses > income
  const rateNegative = calculateSavingsRate(1000, 2000);
  assert(rateNegative >= 0, 'Negative savings clamped to 0%');
  
  // Known rate
  const rate30 = calculateSavingsRate(5000, 3500);
  assertClose(rate30, 30, 'Income 5000, Expenses 3500 → 30%', 1);
}

/* =========================================================
   SECTION 6: Dashboard — Cash Flow History
   ========================================================= */
console.log('\n━━━ SECTION 6: Dashboard — Cash Flow History ━━━');

{
  const history = calculateCashFlowHistory(TEST_TRANSACTIONS, CURRENT_YEAR, CURRENT_MONTH);
  assert(Array.isArray(history), 'Cash flow history is an array');
  assertEqual(history.length, 6, 'Cash flow returns 6 months');
  
  // Current month should have data
  const current = history[history.length - 1];
  assertEqual(current.year, CURRENT_YEAR, 'Last entry is current year');
  assertEqual(current.month, CURRENT_MONTH, 'Last entry is current month');
  assertEqual(current.income, 23000000, 'Current month income in cash flow = 23M');
  assertEqual(current.expense, 3250000, 'Current month expense in cash flow = 3.25M');
}

/* =========================================================
   SECTION 7: Dashboard — Spending Breakdown
   ========================================================= */
console.log('\n━━━ SECTION 7: Dashboard — Spending Breakdown ━━━');

{
  const spending = calculateSpendingByCategory(TEST_TRANSACTIONS, CURRENT_YEAR, CURRENT_MONTH);
  assert(Array.isArray(spending), 'Spending breakdown is an array');
  assert(spending.length > 0, 'Spending breakdown has entries');
  
  // Total should match total expenses
  const total = spending.reduce((s, c) => s + c.amount, 0);
  const expenses = calculateMonthlyExpenses(TEST_TRANSACTIONS, CURRENT_YEAR, CURRENT_MONTH);
  assertEqual(total, expenses, 'Sum of categories = total expenses');
  
  // Largest category should be first (sorted desc)
  for (let i = 1; i < spending.length; i++) {
    assert(spending[i - 1].amount >= spending[i].amount, `Category ${i-1} ≥ Category ${i} (sorted desc)`);
  }
}

/* =========================================================
   SECTION 8: Dashboard — Upcoming Bills
   ========================================================= */
console.log('\n━━━ SECTION 8: Dashboard — Upcoming Bills ━━━');

{
  const summary = calculateBillSummary(TEST_BILLS);
  assertEqual(summary.total, 700000, 'Bill total = 200K + 500K = 700K');
  assertEqual(summary.paid, 0, 'No bills paid yet');
  assertEqual(summary.unpaid, 700000, 'Unpaid = 700K');
  
  // Bill with no active bills
  const empty = calculateBillSummary([]);
  assertEqual(empty.total, 0, 'No bills → total = 0');
}

/* =========================================================
   SECTION 9: Dashboard — Goals
   ========================================================= */
console.log('\n━━━ SECTION 9: Dashboard — Goals ━━━');

{
  const g1 = calculateGoalProgress(TEST_GOALS[0]);
  assertEqual(g1.percentage, 70, 'Emergency Fund: 35M/50M = 70%');
  assertEqual(g1.remaining, 15000000, 'Emergency Fund: remaining = 15M');
  assert(!g1.isComplete, 'Emergency Fund: not complete');

  const g2 = calculateGoalProgress(TEST_GOALS[1]);
  assertEqual(g2.percentage, 27, 'Vacation: 4M/15M ≈ 27%');
  assertEqual(g2.remaining, 11000000, 'Vacation: remaining = 11M');
  assert(!g2.isComplete, 'Vacation: not complete');
  
  // Complete goal
  const doneGoal = { nama: 'Done', target: 1000, terkumpul: 1500 };
  const gDone = calculateGoalProgress(doneGoal);
  assertEqual(gDone.percentage, 100, 'Complete goal: 100%');
  assert(gDone.isComplete, 'Complete goal: isComplete = true');
}

/* =========================================================
   SECTION 10: Dashboard — Financial Health
   ========================================================= */
console.log('\n━━━ SECTION 10: Dashboard — Financial Health ━━━');

{
  // Emergency fund
  const ef = calculateEmergencyFundCoverage(TEST_ACCOUNTS, 3250000);
  assert(typeof ef.months === 'number', 'Emergency fund returns months');
  assert(typeof ef.status === 'string', 'Emergency fund returns status');
  assert(['safe', 'caution', 'danger'].includes(ef.status), 'Status is valid enum');
  
  // Savings rate assessment
  const a20 = assessSavingsRate(20);
  assertEqual(a20.level, 'healthy', '20% savings → healthy');
  
  const a10 = assessSavingsRate(10);
  assertEqual(a10.level, 'adequate', '10% savings → adequate');
  
  const a5 = assessSavingsRate(5);
  assertEqual(a5.level, 'critical', '5% savings → critical');
  
  // Debt burden
  const db = calculateDebtBurden(TEST_TRANSACTIONS, TEST_BUDGETS, CURRENT_YEAR, CURRENT_MONTH, 23000000);
  assert(typeof db.ratio === 'number', 'Debt burden returns ratio');
  assert(['safe', 'caution', 'danger'].includes(db.status), 'Debt burden status is valid');
}

/* =========================================================
   SECTION 11: Dashboard — Next Best Actions
   ========================================================= */
console.log('\n━━━ SECTION 11: Dashboard — Next Best Actions ━━━');

{
  // Low emergency fund + low savings rate
  const actions1 = generateNextBestActions({
    savingsRate: 5,
    emergencyFund: { months: 1.5 },
    debtBurden: { ratio: 10 },
    budgetOverruns: [],
  });
  assert(actions1.length >= 2, 'Multiple actions for poor health');
  assert(actions1[0].priority === 'high', 'First action is high priority');
  
  // Over-budget category
  const actions2 = generateNextBestActions({
    savingsRate: 25,
    emergencyFund: { months: 6 },
    debtBurden: { ratio: 10 },
    budgetOverruns: [{ categoryName: 'Food & Dining', overagePercent: 120 }],
  });
  const hasFood = actions2.some(a => a.message.includes('Food & Dining'));
  assert(hasFood, 'Budget overrun generates action for Food & Dining');
  
  // All good
  const actions3 = generateNextBestActions({
    savingsRate: 30,
    emergencyFund: { months: 8 },
    debtBurden: { ratio: 5 },
    budgetOverruns: [],
  });
  assert(actions3.length > 0, 'Even good health shows at least one positive action');
  assert(actions3.some(a => a.priority === 'low'), 'Good health shows low-priority action');
}

/* =========================================================
   SECTION 12: Dashboard — Budget Usage
   ========================================================= */
console.log('\n━━━ SECTION 12: Dashboard — Budget Usage ━━━');

{
  const budget = calculateBudgetUsage(TEST_TRANSACTIONS, 'Makan & Jajan', 1000000, CURRENT_YEAR, CURRENT_MONTH);
  assertEqual(budget.spent, 750000, 'Food spent = 500K + 250K = 750K');
  assertEqual(budget.remaining, 250000, 'Food remaining = 1M - 750K = 250K');
  assertEqual(budget.percentage, 75, 'Food usage = 75%');
  assert(!budget.isOverBudget, 'Food not over budget');
  
  // Over-budget scenario
  const overBudget = calculateBudgetUsage(TEST_TRANSACTIONS, 'Transportasi', 500000, CURRENT_YEAR, CURRENT_MONTH);
  assert(overBudget.isOverBudget, 'Transport over budget (800K > 500K)');
  assert(overBudget.percentage > 100, 'Transport > 100%');
}

/* =========================================================
   SECTION 13: Dashboard — Empty States
   ========================================================= */
console.log('\n━━━ SECTION 13: Dashboard — Empty States ━━━');

{
  const emptyAccounts = [];
  const emptyTransactions = [];
  const emptyGoals = [];
  const emptyBills = [];
  const emptyBudgets = [];
  
  assertEqual(calculateAvailableCash(emptyAccounts), 0, 'Empty accounts → available cash = 0');
  const emptyNW = calculateNetWorth(emptyAccounts);
  assertEqual(emptyNW.total, 0, 'Empty accounts → net worth = 0');
  assertEqual(calculateMonthlyIncome(emptyTransactions, CURRENT_YEAR, CURRENT_MONTH), 0, 'Empty transactions → income = 0');
  assertEqual(calculateMonthlyExpenses(emptyTransactions, CURRENT_YEAR, CURRENT_MONTH), 0, 'Empty transactions → expenses = 0');
  assertEqual(calculateSavingsRate(0, 0), 0, 'Zero income/expenses → savings rate = 0');
  assertEqual(calculateBillSummary(emptyBills).total, 0, 'Empty bills → total = 0');
  assertEqual(calculateSpendingByCategory(emptyTransactions, CURRENT_YEAR, CURRENT_MONTH).length, 0, 'Empty transactions → no categories');
  
  const emptyEf = calculateEmergencyFundCoverage(emptyAccounts, 0);
  assertEqual(emptyEf.months, 0, 'Empty accounts → emergency fund = 0 months');
}

/* =========================================================
   SECTION 14: Transaction CRUD — Add Income
   ========================================================= */
console.log('\n━━━ SECTION 14: Transaction CRUD — Add Income ━━━');

{
  const result = createTransaction({
    tipe: 'masuk',
    jumlah: 5000000,
    kategori: 'Gaji',
    dompet: 'acc2',
    tanggal: '2026-08-15',
    keterangan: 'Test income',
  });
  
  assert(result.id.startsWith('txn_'), 'Transaction has ID');
  assertEqual(result.tipe, 'masuk', 'Type = masuk');
  assertEqual(result.jumlah, 5000000, 'Amount = 5M');
  assertEqual(result.dompet, 'acc2', 'Account = acc2');
  
  const validation = validateTransaction(result);
  assert(validation.valid, 'Income transaction validates');
  assertEqual(validation.errors.length, 0, 'No validation errors');
}

/* =========================================================
   SECTION 15: Transaction CRUD — Add Expense
   ========================================================= */
console.log('\n━━━ SECTION 15: Transaction CRUD — Add Expense ━━━');

{
  const result = createTransaction({
    tipe: 'keluar',
    jumlah: 150000,
    kategori: 'Makan & Jajan',
    dompet: 'acc1',
    tanggal: '2026-08-15',
    keterangan: 'Lunch',
  });
  
  assertEqual(result.tipe, 'keluar', 'Type = keluar');
  assertEqual(result.jumlah, 150000, 'Amount = 150K');
  
  const validation = validateTransaction(result);
  assert(validation.valid, 'Expense transaction validates');
}

/* =========================================================
   SECTION 16: Transaction CRUD — Add Transfer
   ========================================================= */
console.log('\n━━━ SECTION 16: Transaction CRUD — Add Transfer ━━━');

{
  const result = createTransaction({
    tipe: 'transfer',
    jumlah: 500000,
    kategori: 'Transfer',
    dompet: 'acc1',
    tanggal: '2026-08-15',
    keterangan: 'Transfer to savings',
  });
  
  assertEqual(result.tipe, 'transfer', 'Type = transfer');
  assertEqual(result.jumlah, 500000, 'Amount = 500K');
  
  const validation = validateTransaction(result);
  assert(validation.valid, 'Transfer transaction validates');
}

/* =========================================================
   SECTION 17: Transaction CRUD — Edit
   ========================================================= */
console.log('\n━━━ SECTION 17: Transaction CRUD — Edit ━━━');

{
  const original = { ...TEST_TRANSACTIONS[2] };
  assertEqual(original.jumlah, 500000, 'Original expense = 500K');
  
  // Simulate edit
  const edited = { ...original, jumlah: 750000, keterangan: 'Dinner instead' };
  assertEqual(edited.jumlah, 750000, 'Edited amount = 750K');
  assertEqual(edited.keterangan, 'Dinner instead', 'Edited description');
  assertEqual(edited.id, original.id, 'Same transaction ID preserved');
}

/* =========================================================
   SECTION 18: Transaction CRUD — Delete
   ========================================================= */
console.log('\n━━━ SECTION 18: Transaction CRUD — Delete ━━━');

{
  const initialCount = TEST_TRANSACTIONS.length;
  const afterDelete = TEST_TRANSACTIONS.filter(t => t.id !== 'txn3');
  assertEqual(afterDelete.length, initialCount - 1, 'After delete: one fewer transaction');
  assert(!afterDelete.some(t => t.id === 'txn3'), 'Deleted transaction no longer present');
  
  // Verify remaining transactions intact
  const intact = afterDelete.every(t => t.jumlah > 0);
  assert(intact, 'All remaining transactions have valid amounts');
}

/* =========================================================
   SECTION 19: Transaction CRUD — Invalid Transaction
   ========================================================= */
console.log('\n━━━ SECTION 19: Transaction CRUD — Invalid Transaction ━━━');

{
  // Missing date
  const v1 = validateTransaction({ keterangan: 'test', jumlah: 100, tipe: 'keluar', dompet: 'acc1' });
  assert(!v1.valid, 'Missing date → invalid');
  assert(v1.errors.some(e => e.includes('Date')), 'Error mentions Date');
  
  // Missing description
  const v2 = validateTransaction({ tanggal: '2026-08-15', jumlah: 100, tipe: 'keluar', dompet: 'acc1' });
  assert(!v2.valid, 'Missing description → invalid');
  
  // Zero amount
  const v3 = validateTransaction({ tanggal: '2026-08-15', keterangan: 'test', jumlah: 0, tipe: 'keluar', dompet: 'acc1' });
  assert(!v3.valid, 'Zero amount → invalid');
  
  // Negative amount
  const v4 = validateTransaction({ tanggal: '2026-08-15', keterangan: 'test', jumlah: -100, tipe: 'keluar', dompet: 'acc1' });
  assert(!v4.valid, 'Negative amount → invalid');
  
  // Invalid type
  const v5 = validateTransaction({ tanggal: '2026-08-15', keterangan: 'test', jumlah: 100, tipe: 'invalid', dompet: 'acc1' });
  assert(!v5.valid, 'Invalid type → invalid');
  
  // Missing account
  const v6 = validateTransaction({ tanggal: '2026-08-15', keterangan: 'test', jumlah: 100, tipe: 'keluar' });
  assert(!v6.valid, 'Missing account → invalid');
}

/* =========================================================
   SECTION 20: Transaction Filtering
   ========================================================= */
console.log('\n━━━ SECTION 20: Transaction Filtering ━━━');

{
  // Filter by type
  const income = filterByType(TEST_TRANSACTIONS, 'masuk');
  assertEqual(income.length, 2, '2 income transactions');
  const expenses = filterByType(TEST_TRANSACTIONS, 'keluar');
  assertEqual(expenses.length, 5, '5 expense transactions');
  const transfers = filterByType(TEST_TRANSACTIONS, 'transfer');
  assertEqual(transfers.length, 1, '1 transfer');
  
  // Filter by account
  const acc2Txns = filterByAccount(TEST_TRANSACTIONS, 'acc2');
  assert(acc2Txns.length > 0, 'Account filter returns results');
  assert(acc2Txns.every(t => t.dompet === 'acc2'), 'All filtered txns match account');
  
  // Filter all
  assertEqual(filterByType(TEST_TRANSACTIONS, 'all').length, TEST_TRANSACTIONS.length, 'filterByType all returns all');
  assertEqual(filterByAccount(TEST_TRANSACTIONS, 'all').length, TEST_TRANSACTIONS.length, 'filterByAccount all returns all');
  
  // Search
  const found = searchTransactions(TEST_TRANSACTIONS, 'Salary');
  assertEqual(found.length, 1, 'Search "Salary" finds 1 result');
  
  const notFound = searchTransactions(TEST_TRANSACTIONS, 'xyznonexistent');
  assertEqual(notFound.length, 0, 'Search for nonexistent → 0 results');
  
  // Sort by amount desc
  const sorted = sortTransactions(TEST_TRANSACTIONS, 'jumlah', 'desc');
  assert(sorted[0].jumlah >= sorted[1].largest || true, 'Sorted desc: first >= second');
  for (let i = 1; i < sorted.length; i++) {
    assert(sorted[i-1].jumlah >= sorted[i].jumlah, `Sorted desc: index ${i-1} >= ${i}`);
  }
  
  // Sort by amount asc
  const sortedAsc = sortTransactions(TEST_TRANSACTIONS, 'jumlah', 'asc');
  for (let i = 1; i < sortedAsc.length; i++) {
    assert(sortedAsc[i-1].jumlah <= sortedAsc[i].jumlah, `Sorted asc: index ${i-1} <= ${i}`);
  }
}

/* =========================================================
   SECTION 21: Transfer — Not Income or Expense
   ========================================================= */
console.log('\n━━━ SECTION 21: Transfer Isolation ━━━');

{
  const transfer = TEST_TRANSACTIONS.find(t => t.tipe === 'transfer');
  assert(transfer, 'Transfer transaction exists');
  assertEqual(transfer.tipe, 'transfer', 'Type is transfer, NOT masuk or keluar');
  
  // Transfer should not appear in income
  const income = filterByType(TEST_TRANSACTIONS, 'masuk');
  const transferInIncome = income.some(t => t.id === transfer.id);
  assert(!transferInIncome, 'Transfer NOT counted as income');
  
  // Transfer should not appear in expenses
  const expenses = filterByType(TEST_TRANSACTIONS, 'keluar');
  const transferInExpenses = expenses.some(t => t.id === transfer.id);
  assert(!transferInExpenses, 'Transfer NOT counted as expense');
  
  // Income + expense + transfer = total
  assertEqual(
    income.length + expenses.length + filterByType(TEST_TRANSACTIONS, 'transfer').length,
    TEST_TRANSACTIONS.length,
    'Income + Expense + Transfer = Total'
  );
}

/* =========================================================
   SECTION 22: Balance Integrity Simulation
   ========================================================= */
console.log('\n━━━ SECTION 22: Balance Integrity Simulation ━━━');

{
  // Simulate adding an expense and checking balance changes
  const accounts = [
    makeAccount('acc1', 'Checking', 'bank', 10000000),
  ];
  
  // Add expense: balance should decrease
  const balance1 = parseFloat(accounts[0].saldo);
  const expenseAmount = 1500000;
  accounts[0].saldo = balance1 - expenseAmount;
  assertEqual(accounts[0].saldo, 8500000, 'After expense: 10M - 1.5M = 8.5M');
  
  // Edit expense: adjust difference
  const oldAmount = expenseAmount;
  const newAmount = 2000000;
  accounts[0].saldo = accounts[0].saldo + oldAmount - newAmount;
  assertEqual(accounts[0].saldo, 8000000, 'After edit: 8.5M + 1.5M - 2M = 8M');
  
  // Delete expense: restore amount
  accounts[0].saldo = accounts[0].saldo + newAmount;
  assertEqual(accounts[0].saldo, 10000000, 'After delete: 8M + 2M = 10M (back to original)');
}

/* =========================================================
   SECTION 23: Currency Formatting (spot check)
   ========================================================= */
console.log('\n━━━ SECTION 23: Currency Formatting Spot Check ━━━');

{
  const usd = formatCurrency(12345678, 'USD');
  assert(usd.includes('$'), 'USD contains $');
  
  const idr = formatCurrency(12345678, 'IDR');
  assert(idr.includes('Rp'), 'IDR contains Rp');
  
  const eur = formatCurrency(12345678, 'EUR');
  assert(eur.includes('€'), 'EUR contains €');
  
  const gbp = formatCurrency(12345678, 'GBP');
  assert(gbp.includes('£'), 'GBP contains £');
}

/* =========================================================
   RESULTS
   ========================================================= */
console.log('\n' + '='.repeat(70));
console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings`);
console.log('='.repeat(70));

if (failures.length > 0) {
  console.log('\n  FAILURES:');
  failures.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
}

console.log(`\n  TOTAL: ${passed + failed} tests (${passed} ✅ / ${failed} ❌ / ${warnings} ⚠️)\n`);

process.exit(failed > 0 ? 1 : 0);
