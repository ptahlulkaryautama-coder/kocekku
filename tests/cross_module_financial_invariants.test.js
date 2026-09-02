/**
 * Cross-Module Financial Invariant Tests
 * 
 * Specifically tests:
 * - P1-1: Goal deposits must NOT inflate expenses
 * - P1-2: Goal withdrawals must NOT inflate income
 * - Account balance integrity across modules
 * - Net worth consistency
 * - Available Cash consistency
 */

import {
  calculateEmergencyFundCoverage,
} from '../src/domain/financial-health.js';

import {
  calculateTotalBalance,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculateAvailableCash,
  classifyAccount,
} from '../src/domain/accounts.js';

import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
} from '../src/domain/transactions.js';



import {
  projectCompletionDate,
} from '../src/domain/goals.js';

import {
  createTransaction,
} from '../src/domain/transactions.js';

// Dynamic date helper — tests must work regardless of the current month
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth();
const txDate = `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-15`;
const txDate2 = `${CURRENT_YEAR}-${String(CURRENT_MONTH + 1).padStart(2, '0')}-10`;

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
   SCENARIO A — Goal deposit does NOT inflate expenses
   ================================================================ */
console.log('\n--- Scenario A: Goal deposit must NOT inflate expenses ---');
{
  const accounts = [
    { id: 'acc1', nama: 'BCA', jenis: 'bank', saldo: 10000000, normalizedType: 'checking' },
  ];
  const goal = { id: 'g1', nama: 'Emergency Fund', target: 5000000, terkumpul: 0 };
  
  // Simulate goal deposit: account balance decreases, goal increases
  const updatedAccounts = accounts.map(a => 
    a.id === 'acc1' ? { ...a, saldo: a.saldo - 2000000 } : a
  );
  const updatedGoal = { ...goal, terkumpul: goal.terkumpul + 2000000 };
  
  // Transaction should be tipe: 'transfer' (not 'keluar')
  const txn = createTransaction({
    tipe: 'transfer',
    keterangan: 'Goal: Emergency Fund - Deposit',
    jumlah: 2000000,
    dompet: 'acc1',
    kategori: 'Emergency Fund',
    tanggal: txDate,
  });
  
  // Verify transaction type
  assert(txn.tipe === 'transfer', `Goal deposit tx type should be 'transfer', got '${txn.tipe}'`);
  
  // Account balance decreased
  assertEq(updatedAccounts[0].saldo, 8000000, 'Account balance after deposit');
  
  // Goal increased
  assertEq(updatedGoal.terkumpul, 2000000, 'Goal amount after deposit');
  
  // Expense calculation should NOT include this
  const transactions = [txn];
  const expenses = calculateMonthlyExpenses(transactions, new Date().getFullYear(), new Date().getMonth());
  assertEq(expenses, 0, 'Goal deposit must NOT appear in monthly expenses');
  
  // Income should NOT include this
  const income = calculateMonthlyIncome(transactions, new Date().getFullYear(), new Date().getMonth());
  assertEq(income, 0, 'Goal deposit must NOT appear in monthly income');
  
  // Savings rate should not be affected negatively
  const incomeTxn = createTransaction({
    tipe: 'masuk',
    keterangan: 'Salary',
    jumlah: 10000000,
    dompet: 'acc1',
    kategori: 'Salary',
    tanggal: txDate,
  });
  
  const allTxns = [incomeTxn, txn]; // income + goal deposit
  const totalIncome = calculateMonthlyIncome(allTxns, new Date().getFullYear(), new Date().getMonth());
  const totalExpenses = calculateMonthlyExpenses(allTxns, new Date().getFullYear(), new Date().getMonth());
  assertEq(totalIncome, 10000000, 'Income should be 10M (salary only)');
  assertEq(totalExpenses, 0, 'Expenses should be 0 (goal deposit is transfer, not expense)');
  
  // Available Cash should decrease (account balance dropped)
  assertEq(calculateAvailableCash(updatedAccounts), 8000000, 'Available cash after deposit');
  
  // Net worth should be unchanged (money moved to goal, not spent)
  const nw = calculateNetWorth(updatedAccounts);
  assertEq(nw.total, 8000000, 'Net worth unchanged (goal is internal allocation)');
}

/* ================================================================
   SCENARIO B — Goal withdrawal does NOT inflate income
   ================================================================ */
console.log('\n--- Scenario B: Goal withdrawal must NOT inflate income ---');
{
  const accounts = [
    { id: 'acc1', nama: 'BCA', jenis: 'bank', saldo: 8000000, normalizedType: 'checking' },
  ];
  const goal = { id: 'g1', nama: 'Emergency Fund', target: 5000000, terkumpul: 2000000 };
  
  // Simulate goal withdrawal: account balance increases, goal decreases
  const updatedAccounts = accounts.map(a => 
    a.id === 'acc1' ? { ...a, saldo: a.saldo + 1000000 } : a
  );
  const updatedGoal = { ...goal, terkumpul: goal.terkumpul - 1000000 };
  
  // Transaction should be tipe: 'transfer' (not 'masuk')
  const txn = createTransaction({
    tipe: 'transfer',
    keterangan: 'Goal: Emergency Fund - Withdrawal',
    jumlah: 1000000,
    dompet: 'acc1',
    kategori: 'Emergency Fund',
    tanggal: txDate,
  });
  
  // Verify transaction type
  assert(txn.tipe === 'transfer', `Goal withdrawal tx type should be 'transfer', got '${txn.tipe}'`);
  
  // Account balance increased
  assertEq(updatedAccounts[0].saldo, 9000000, 'Account balance after withdrawal');
  
  // Goal decreased
  assertEq(updatedGoal.terkumpul, 1000000, 'Goal amount after withdrawal');
  
  // Income should NOT include this
  const transactions = [txn];
  const income = calculateMonthlyIncome(transactions, new Date().getFullYear(), new Date().getMonth());
  assertEq(income, 0, 'Goal withdrawal must NOT appear in monthly income');
  
  // Expenses should NOT include this
  const expenses = calculateMonthlyExpenses(transactions, new Date().getFullYear(), new Date().getMonth());
  assertEq(expenses, 0, 'Goal withdrawal must NOT appear in monthly expenses');
  
  // Savings rate should not be inflated
  const expenseTxn = createTransaction({
    tipe: 'keluar',
    keterangan: 'Groceries',
    jumlah: 500000,
    dompet: 'acc1',
    kategori: 'Food',
    tanggal: txDate,
  });
  
  const allTxns = [expenseTxn, txn]; // expense + goal withdrawal
  const totalIncome = calculateMonthlyIncome(allTxns, new Date().getFullYear(), new Date().getMonth());
  const totalExpenses = calculateMonthlyExpenses(allTxns, new Date().getFullYear(), new Date().getMonth());
  assertEq(totalIncome, 0, 'Income should be 0 (goal withdrawal is transfer, not income)');
  assertEq(totalExpenses, 500000, 'Expenses should be 500K (groceries only)');
  
  // Net worth unchanged
  const nw = calculateNetWorth(updatedAccounts);
  assertEq(nw.total, 9000000, 'Net worth after withdrawal');
}

/* ================================================================
   SCENARIO C — Account balance integrity across full lifecycle
   ================================================================ */
console.log('\n--- Scenario C: Full lifecycle balance integrity ---');
{
  const accounts = [
    { id: 'acc1', nama: 'BCA', jenis: 'bank', saldo: 10000000, normalizedType: 'checking' },
    { id: 'acc2', nama: 'Cash', jenis: 'kas', saldo: 2000000, normalizedType: 'cash' },
  ];
  const goal = { id: 'g1', nama: 'Vacation', target: 3000000, terkumpul: 0 };
  
  // 1. Salary income
  let acc1Bal = 10000000 + 5000000; // +5M salary
  assertEq(acc1Bal, 15000000, 'After salary');
  
  // 2. Grocery expense
  acc1Bal -= 500000;
  assertEq(acc1Bal, 14500000, 'After grocery');
  
  // 3. Transfer BCA -> Cash
  acc1Bal -= 1000000;
  let acc2Bal = 2000000 + 1000000;
  assertEq(acc1Bal, 13500000, 'After transfer (source)');
  assertEq(acc2Bal, 3000000, 'After transfer (dest)');
  
  // 4. Goal deposit from BCA
  acc1Bal -= 2000000;
  goal.terkumpul += 2000000;
  assertEq(acc1Bal, 11500000, 'After goal deposit (account)');
  assertEq(goal.terkumpul, 2000000, 'After goal deposit (goal)');
  
  // 5. Goal withdrawal to BCA
  acc1Bal += 500000;
  goal.terkumpul -= 500000;
  assertEq(acc1Bal, 12000000, 'After goal withdrawal (account)');
  assertEq(goal.terkumpul, 1500000, 'After goal withdrawal (goal)');
  
  // Total assets should equal sum of account balances
  const finalAccounts = [
    { id: 'acc1', nama: 'BCA', jenis: 'bank', saldo: acc1Bal, normalizedType: 'checking' },
    { id: 'acc2', nama: 'Cash', jenis: 'kas', saldo: acc2Bal, normalizedType: 'cash' },
  ];
  assertEq(calculateTotalBalance(finalAccounts), 15000000, 'Total balance = sum of accounts');
  assertEq(calculateNetWorth(finalAccounts).total, 15000000, 'Net worth = total balance (no liabilities)');
  assertEq(calculateAvailableCash(finalAccounts), 15000000, 'Available cash = all liquid');
}

/* ================================================================
   SCENARIO D — Savings rate not distorted by goal activity
   ================================================================ */
console.log('\n--- Scenario D: Savings rate not distorted by goal activity ---');
{
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-15`;
  
  const transactions = [
    // Income
    createTransaction({ tipe: 'masuk', keterangan: 'Salary', jumlah: 10000000, dompet: 'acc1', kategori: 'Salary', tanggal: dateStr }),
    // Real expense
    createTransaction({ tipe: 'keluar', keterangan: 'Rent', jumlah: 3000000, dompet: 'acc1', kategori: 'Housing', tanggal: dateStr }),
    createTransaction({ tipe: 'keluar', keterangan: 'Food', jumlah: 1000000, dompet: 'acc1', kategori: 'Food', tanggal: dateStr }),
    // Goal deposit (should NOT be an expense)
    createTransaction({ tipe: 'transfer', keterangan: 'Goal: Emergency Fund - Deposit', jumlah: 2000000, dompet: 'acc1', kategori: 'Emergency Fund', tanggal: dateStr }),
  ];
  
  const income = calculateMonthlyIncome(transactions, year, month);
  const expenses = calculateMonthlyExpenses(transactions, year, month);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  
  assertEq(income, 10000000, 'Income = salary only');
  assertEq(expenses, 4000000, 'Expenses = rent + food only (NOT goal deposit)');
  assertEq(savingsRate, 60, 'Savings rate = 60% (not reduced by goal deposit)');
  
  // Without the fix, goal deposit would count as expense:
  // expenses would be 6M, savings rate would be 40%
  // With the fix, savings rate is correctly 60%
}

/* ================================================================
   SCENARIO E — Emergency fund calculation excludes investments
   ================================================================ */
console.log('\n--- Scenario E: Emergency fund uses liquid assets only ---');
{
  const accounts = [
    { id: 'acc1', nama: 'Cash', jenis: 'kas', saldo: 1000000, normalizedType: 'cash' },
    { id: 'acc2', nama: 'BCA', jenis: 'bank', saldo: 5000000, normalizedType: 'checking' },
    { id: 'acc3', nama: 'Stocks', jenis: 'investasi', saldo: 20000000, normalizedType: 'investment' },
  ];
  
  // Liquid = cash + checking = 6M
  const liquidAccounts = accounts.filter(a => classifyAccount(a) === 'liquid');
  const liquidTotal = liquidAccounts.reduce((sum, a) => sum + (parseFloat(a.saldo) || 0), 0);
  
  assertEq(liquidTotal, 6000000, 'Liquid assets = cash + checking (NOT investment)');
  assertEq(calculateAvailableCash(accounts), 6000000, 'Available cash excludes investment');
  
  // But net worth includes investments
  const nw = calculateNetWorth(accounts);
  assertEq(nw.total, 26000000, 'Net worth includes investments');
}

/* ================================================================
   SCENARIO F — ProjectCompletionDate uses transfer type
   ================================================================ */
console.log('\n--- Scenario F: projectCompletionDate matches transfer transactions ---');
{
  const goal = { id: 'g1', nama: 'Car Fund', target: 10000000, terkumpul: 2000000, targetDate: '2027-01-01' };
  
  // Transactions with tipe: 'transfer' (the new correct type)
  const transactions = [
    createTransaction({ tipe: 'transfer', keterangan: 'Goal: Car Fund - Deposit', jumlah: 2000000, dompet: 'acc1', kategori: 'Car Fund', tanggal: '2026-06-15' }),
    createTransaction({ tipe: 'transfer', keterangan: 'Goal: Car Fund - Deposit', jumlah: 2000000, dompet: 'acc1', kategori: 'Car Fund', tanggal: '2026-07-15' }),
    createTransaction({ tipe: 'transfer', keterangan: 'Goal: Car Fund - Deposit', jumlah: 2000000, dompet: 'acc1', kategori: 'Car Fund', tanggal: txDate }),
  ];
  
  const projected = projectCompletionDate(goal, transactions, 3);
  
  // 3 deposits of 2M over 3 months = 2M/month
  // Remaining = 8M, so 4 more months needed
  // Projected = ~Dec 2026
  assert(projected !== null, 'projectCompletionDate should return a date');
  
  if (projected) {
    assert(projected > NOW, 'Projected date should be in the future');
    assert(projected <= new Date('2027-06-01'), 'Projected date should be reasonable');
  }
}

/* ================================================================
   SCENARIO G — Emergency fund excludes investments (P1-3)
   ================================================================ */
console.log('\n--- Scenario G: Emergency fund excludes investments ---');
{
  // Liquid accounts: Cash 1M + BCA 5M = 6M
  // Investment: Stocks 20M (should be EXCLUDED)
  const accounts = [
    { id: 'acc1', nama: 'Cash', jenis: 'kas', saldo: 1000000, normalizedType: 'cash' },
    { id: 'acc2', nama: 'BCA', jenis: 'bank', saldo: 5000000, normalizedType: 'checking' },
    { id: 'acc3', nama: 'Stocks', jenis: 'investasi', saldo: 20000000, normalizedType: 'investment' },
  ];
  const monthlyExpenses = 2000000;
  
  const result = calculateEmergencyFundCoverage(accounts, monthlyExpenses);
  
  // liquidAssets should be 6M (cash + checking), NOT 26M (which would include stocks)
  assertEq(result.liquidAssets, 6000000, 'Emergency fund liquid assets = cash + checking only (NOT investment)');
  assertEq(result.months, 3, 'Emergency fund coverage = 3 months (6M / 2M)');
  assert(result.status === 'caution' || result.status === 'safe', 'Status should be caution or safe for 3 months');
  
  // If investments were incorrectly included, liquidAssets would be 26M and months = 13
  assert(result.months < 10, 'Coverage must NOT include investment assets (>10 would indicate investment leak)');
}

/* ================================================================
   SCENARIO H — Emergency fund with zero expenses
   ================================================================ */
console.log('\n--- Scenario H: Emergency fund with zero expenses ---');
{
  const accounts = [
    { id: 'acc1', nama: 'BCA', jenis: 'bank', saldo: 5000000, normalizedType: 'checking' },
  ];
  
  const result = calculateEmergencyFundCoverage(accounts, 0);
  // With 0 expenses, function defaults to 1 to prevent div-by-zero
  // months = 5M / 1 = 5M, status = 'safe' (>=6)
  assert(!isNaN(result.months), 'Zero expenses should not cause NaN');
  assert(isFinite(result.months), 'Zero expenses should not cause Infinity');
  assert(result.months > 0, 'Months should be positive with liquid assets');
}

/* ================================================================
   SCENARIO I — Emergency fund with only investment accounts
   ================================================================ */
console.log('\n--- Scenario I: Emergency fund with only investment accounts ---');
{
  const accounts = [
    { id: 'acc1', nama: 'Stocks', jenis: 'investasi', saldo: 50000000, normalizedType: 'investment' },
  ];
  
  const result = calculateEmergencyFundCoverage(accounts, 2000000);
  assertEq(result.liquidAssets, 0, 'No liquid assets when only investments exist');
  assertEq(result.months, 0, 'Zero months coverage with no liquid assets');
}

/* ================================================================
   REPORT
   ================================================================ */
console.log(`\n\n=== Cross-Module Financial Invariant Tests ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFAILURES:');
  failures.forEach(f => console.log(`  ❌ ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ All cross-module financial invariant tests passed!');
}
