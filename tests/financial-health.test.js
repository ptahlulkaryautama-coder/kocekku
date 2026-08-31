/**
 * Phase 9 — Financial Health Test Suite
 * Tests health score calculation, metric breakdowns, and next best actions
 */

import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateSavingsRate,
  assessSavingsRate,
  calculateEmergencyFundCoverage,
  calculateDebtBurden,
  generateNextBestActions,
  calculateNetWorth,
} from '../src/domain/financial-health.js';

import {
  calculateAvailableCash,
  classifyAccount,
} from '../src/domain/accounts.js';

import {
  createTransaction,
} from '../src/domain/transactions.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, msg) {
  if (condition) { passed++; process.stdout.write('.'); }
  else { failed++; failures.push(msg); process.stdout.write('F'); }
}

function assertEq(a, b, msg) {
  const eq = Math.abs(a - b) < 0.01;
  assert(eq, `${msg} — expected ${b}, got ${a}`);
}

/* ================================================================
   HELPER: Calculate composite health score
   Mirrors the logic that will be used in the UI
   ================================================================ */
function calculateHealthScore(savingsRateResult, emergencyResult, debtResult) {
  let score = 0;
  
  // Savings Rate (40 points)
  const sr = savingsRateResult;
  if (sr >= 20) score += 40;
  else if (sr >= 10) score += 25;
  else if (sr >= 5) score += 10;
  // else 0
  
  // Emergency Fund (35 points)
  const ef = emergencyResult.months;
  if (ef >= 6) score += 35;
  else if (ef >= 3) score += 20;
  else if (ef >= 1) score += 8;
  // else 0
  
  // Debt Burden (25 points)
  const db = debtResult.ratio;
  if (db <= 10) score += 25;
  else if (db <= 20) score += 18;
  else if (db <= 35) score += 8;
  // else 0
  
  return score;
}

/* ================================================================
   1. Health Score Calculation
   ================================================================ */
console.log('\n--- 1. Health Score Calculation ---');
{
  // Perfect health: high savings, 6+ months emergency, low debt
  const accounts = [
    { id: 'a1', nama: 'BCA', jenis: 'bank', saldo: 20000000, normalizedType: 'checking' },
  ];
  const txns = [
    createTransaction({ tipe: 'masuk', keterangan: 'Salary', jumlah: 10000000, dompet: 'a1', kategori: 'Salary', tanggal: '2026-08-15' }),
    createTransaction({ tipe: 'keluar', keterangan: 'Rent', jumlah: 2000000, dompet: 'a1', kategori: 'Housing', tanggal: '2026-08-15' }),
    createTransaction({ tipe: 'keluar', keterangan: 'Food', jumlah: 1000000, dompet: 'a1', kategori: 'Food', tanggal: '2026-08-15' }),
  ];
  
  const income = calculateMonthlyIncome(txns, 2026, 7);
  const expenses = calculateMonthlyExpenses(txns, 2026, 7);
  const savingsRate = calculateSavingsRate(income, expenses);
  const emergency = calculateEmergencyFundCoverage(accounts, expenses);
  const debt = calculateDebtBurden(txns, [], 2026, 7, income);
  
  assertEq(income, 10000000, 'Income');
  assertEq(expenses, 3000000, 'Expenses');
  assertEq(savingsRate, 70, 'Savings rate 70%');
  assertEq(emergency.months, 6.7, 'Emergency fund 6.7 months');
  assertEq(debt.ratio, 0, 'Debt ratio 0%');
  
  const score = calculateHealthScore(savingsRate, emergency, debt);
  assertEq(score, 100, 'Perfect health score = 100');
}

{
  // Poor health: low savings, no emergency fund, high debt
  const accounts = [
    { id: 'a1', nama: 'BCA', jenis: 'bank', saldo: 500000, normalizedType: 'checking' },
  ];
  const txns = [
    createTransaction({ tipe: 'masuk', keterangan: 'Salary', jumlah: 5000000, dompet: 'a1', kategori: 'Salary', tanggal: '2026-08-15' }),
    createTransaction({ tipe: 'keluar', keterangan: 'Rent', jumlah: 2000000, dompet: 'a1', kategori: 'Housing', tanggal: '2026-08-15' }),
    createTransaction({ tipe: 'keluar', keterangan: 'Food', jumlah: 1500000, dompet: 'a1', kategori: 'Food', tanggal: '2026-08-15' }),
    createTransaction({ tipe: 'keluar', keterangan: 'Shopping', jumlah: 1000000, dompet: 'a1', kategori: 'Shopping', tanggal: '2026-08-15' }),
    createTransaction({ tipe: 'keluar', keterangan: 'Debt Payment', jumlah: 1000000, dompet: 'a1', kategori: 'Debt Payment', tanggal: '2026-08-15' }),
  ];
  
  const income = calculateMonthlyIncome(txns, 2026, 7);
  const expenses = calculateMonthlyExpenses(txns, 2026, 7);
  const savingsRate = calculateSavingsRate(income, expenses);
  const emergency = calculateEmergencyFundCoverage(accounts, expenses);
  const debt = calculateDebtBurden(txns, [], 2026, 7, income);
  
  assertEq(income, 5000000, 'Income');
  assertEq(expenses, 5500000, 'Expenses (5.5M)');
  assertEq(savingsRate, 0, 'Savings rate 0% (expenses > income)');
  assert(emergency.months < 1, 'Emergency fund < 1 month');
  assertEq(debt.ratio, 20, 'Debt ratio 20%');
  
  const score = calculateHealthScore(savingsRate, emergency, debt);
  assert(score <= 20, `Poor health score should be low: ${score}`);
}

/* ================================================================
   2. Emergency Fund — Investment Exclusion
   ================================================================ */
console.log('\n--- 2. Emergency Fund Investment Exclusion ---');
{
  const accounts = [
    { id: 'a1', nama: 'Cash', jenis: 'kas', saldo: 1000000, normalizedType: 'cash' },
    { id: 'a2', nama: 'BCA', jenis: 'bank', saldo: 5000000, normalizedType: 'checking' },
    { id: 'a3', nama: 'Stocks', jenis: 'investasi', saldo: 50000000, normalizedType: 'investment' },
  ];
  
  const result = calculateEmergencyFundCoverage(accounts, 2000000);
  
  assertEq(result.liquidAssets, 6000000, 'Liquid assets = 6M (no investment)');
  assertEq(result.months, 3, 'Coverage = 3 months');
  assert(result.status === 'caution', 'Status = caution (3 months)');
}

/* ================================================================
   3. Savings Rate Assessment
   ================================================================ */
console.log('\n--- 3. Savings Rate Assessment ---');
{
  const healthy = assessSavingsRate(25);
  assert(healthy.level === 'healthy', '25% = healthy');
  assert(healthy.status === 'HEALTHY', '25% status = HEALTHY');
  
  const adequate = assessSavingsRate(15);
  assert(adequate.level === 'adequate', '15% = adequate');
  assert(adequate.status === 'ADEQUATE', '15% status = ADEQUATE');
  
  const critical = assessSavingsRate(5);
  assert(critical.level === 'critical', '5% = critical');
  assert(critical.status === 'CRITICAL', '5% status = CRITICAL');
}

/* ================================================================
   4. Debt Burden Assessment
   ================================================================ */
console.log('\n--- 4. Debt Burden Assessment ---');
{
  const txns = [
    createTransaction({ tipe: 'keluar', keterangan: 'Debt Payment', jumlah: 500000, dompet: 'a1', kategori: 'Debt Payment', tanggal: '2026-08-15' }),
  ];
  
  const low = calculateDebtBurden(txns, [], 2026, 7, 10000000);
  assertEq(low.ratio, 5, '5% debt ratio');
  assert(low.status === 'safe', '5% = safe');
  
  const moderate = calculateDebtBurden(txns, [], 2026, 7, 2000000);
  assertEq(moderate.ratio, 25, '25% debt ratio');
  assert(moderate.status === 'caution', '25% = caution');
  
  const high = calculateDebtBurden(txns, [], 2026, 7, 1000000);
  assertEq(high.ratio, 50, '50% debt ratio');
  assert(high.status === 'danger', '50% = danger');
}

/* ================================================================
   5. Next Best Actions
   ================================================================ */
console.log('\n--- 5. Next Best Actions ---');
{
  // All healthy — should suggest investing
  const healthyActions = generateNextBestActions({
    savingsRate: 25,
    emergencyFund: { months: 8 },
    debtBurden: { ratio: 5 },
    budgetOverruns: [],
  });
  assert(healthyActions.length > 0, 'Healthy profile has actions');
  assert(healthyActions.some(a => a.priority === 'low'), 'Healthy has low-priority suggestion');
  
  // All poor — should have high-priority actions
  const poorActions = generateNextBestActions({
    savingsRate: 5,
    emergencyFund: { months: 1 },
    debtBurden: { ratio: 40 },
    budgetOverruns: [{ categoryName: 'Food', overagePercent: 30 }],
  });
  assert(poorActions.length >= 3, `Poor profile has ${poorActions.length} actions (expected >= 3)`);
  assert(poorActions.filter(a => a.priority === 'high').length >= 2, 'Poor has >= 2 high-priority actions');
  
  // Budget overrun
  const overrunActions = generateNextBestActions({
    savingsRate: 25,
    emergencyFund: { months: 8 },
    debtBurden: { ratio: 5 },
    budgetOverruns: [{ categoryName: 'Food', overagePercent: 25 }],
  });
  assert(overrunActions.some(a => a.message.includes('Food')), 'Budget overrun mentions category');
}

/* ================================================================
   6. Net Worth Integration
   ================================================================ */
console.log('\n--- 6. Net Worth Integration ---');
{
  const accounts = [
    { id: 'a1', nama: 'BCA', jenis: 'bank', saldo: 15000000, normalizedType: 'checking' },
    { id: 'a2', nama: 'Savings', jenis: 'tabungan', saldo: 25000000, normalizedType: 'savings' },
    { id: 'a3', nama: 'Credit Card', jenis: 'kartu kredit', saldo: -3500000, normalizedType: 'credit' },
    { id: 'a4', nama: 'Stocks', jenis: 'investasi', saldo: 10000000, normalizedType: 'investment' },
  ];
  
  const nw = calculateNetWorth(accounts);
  assertEq(nw.assets, 50000000, 'Total assets = 50M');
  assertEq(nw.liabilities, 3500000, 'Total liabilities = 3.5M');
  assertEq(nw.total, 46500000, 'Net worth = 46.5M');
}

/* ================================================================
   7. Edge Cases
   ================================================================ */
console.log('\n--- 7. Edge Cases ---');
{
  // No transactions
  const noIncome = calculateMonthlyIncome([], 2026, 7);
  assertEq(noIncome, 0, 'No transactions = 0 income');
  
  const noExpenses = calculateMonthlyExpenses([], 2026, 7);
  assertEq(noExpenses, 0, 'No transactions = 0 expenses');
  
  const noSavingsRate = calculateSavingsRate(0, 0);
  assertEq(noSavingsRate, 0, 'Zero income = 0 savings rate');
  
  // No accounts
  const noEmergency = calculateEmergencyFundCoverage([], 5000000);
  assertEq(noEmergency.months, 0, 'No accounts = 0 months');
  assert(noEmergency.status === 'danger', 'No accounts = danger');
  
  // No debt
  const noDebt = calculateDebtBurden([], [], 2026, 7, 10000000);
  assertEq(noDebt.ratio, 0, 'No debt transactions = 0%');
  assert(noDebt.status === 'safe', 'No debt = safe');
  
  // No actions needed
  const noActions = generateNextBestActions({
    savingsRate: 25,
    emergencyFund: { months: 8 },
    debtBurden: { ratio: 5 },
    budgetOverruns: [],
  });
  assert(noActions.length > 0, 'Even healthy profile has at least 1 action');
}

/* ================================================================
   8. Credit Card as Liability in Net Worth
   ================================================================ */
console.log('\n--- 8. Credit Card Net Worth Treatment ---');
{
  // Positive credit card balance (overpayment) — still a liability
  const accounts = [
    { id: 'a1', nama: 'BCA', jenis: 'bank', saldo: 10000000, normalizedType: 'checking' },
    { id: 'a2', nama: 'CC', jenis: 'kartu kredit', saldo: 500000, normalizedType: 'credit' },
  ];
  
  const nw = calculateNetWorth(accounts);
  assertEq(nw.liabilities, 500000, 'Positive CC balance is still a liability');
  assertEq(nw.assets, 10000000, 'Assets = checking only');
  assertEq(nw.total, 9500000, 'Net worth = 10M - 500K');
  
  // Negative credit card balance (debt) — still a liability
  const accounts2 = [
    { id: 'a1', nama: 'BCA', jenis: 'bank', saldo: 10000000, normalizedType: 'checking' },
    { id: 'a2', nama: 'CC', jenis: 'kartu kredit', saldo: -3000000, normalizedType: 'credit' },
  ];
  
  const nw2 = calculateNetWorth(accounts2);
  assertEq(nw2.liabilities, 3000000, 'Negative CC balance is a liability');
  assertEq(nw2.total, 7000000, 'Net worth = 10M - 3M');
}

/* ================================================================
   REPORT
   ================================================================ */
console.log(`\n\n=== Financial Health Tests ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFAILURES:');
  failures.forEach(f => console.log(`  ❌ ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ All financial health tests passed!');
}
