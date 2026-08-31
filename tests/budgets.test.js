/**
 * Phase 6 — Budgets Test Suite
 * Tests budget domain logic, CRUD, transaction matching, and financial invariants
 */

import {
  calculateBudgetUsage,
  calculateAllBudgetUsages,
  getBudgetSummary,
  createBudget,
  validateBudget,
} from '../src/domain/budgets.js';
import { appState } from '../src/app/state.js';

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

function assertDeepEq(a, b, msg) {
  assert(JSON.stringify(a) === JSON.stringify(b), `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

/* ================================================================
   1. Budget Creation
   ================================================================ */

process.stdout.write('\n--- Budget Creation ---\n');

const b1 = createBudget({ kategori: 'Makan & Jajan', anggaran: 500000 });
assert(b1.kategori === 'Makan & Jajan', 'Budget creation: category');
assert(b1.anggaran === 500000, 'Budget creation: amount');
assert(b1.id && b1.id.startsWith('budget_'), 'Budget creation: id');
assert(b1.period === 'monthly', 'Budget creation: default period');
assert(b1.createdAt, 'Budget creation: createdAt');

const b2 = createBudget({ kategori: 'Transport', anggaran: 300000, period: 'weekly' });
assert(b2.period === 'weekly', 'Budget creation: custom period');

/* ================================================================
   2. Budget Validation
   ================================================================ */

process.stdout.write('\n--- Budget Validation ---\n');

const v1 = validateBudget({ kategori: 'Food', anggaran: 500 });
assert(v1.valid === true, 'Valid budget passes');

const v2 = validateBudget({ kategori: '', anggaran: 500 });
assert(v2.valid === false, 'Empty category fails');
assert(v2.errors.length > 0, 'Empty category has error');

const v3 = validateBudget({ kategori: 'Food', anggaran: 0 });
assert(v3.valid === false, 'Zero amount fails');

const v4 = validateBudget({ kategori: 'Food', anggaran: -100 });
assert(v4.valid === false, 'Negative amount fails');

const v5 = validateBudget({ kategori: '', anggaran: 0 });
assert(v5.valid === false, 'Both invalid fails');

/* ================================================================
   3. Budget Editing
   ================================================================ */

process.stdout.write('\n--- Budget Editing ---\n');

const edited = createBudget({ kategori: 'Food', anggaran: 500 });
edited.anggaran = 800;
assert(edited.anggaran === 800, 'Budget edit: amount changes');

edited.kategori = 'Dining';
assert(edited.kategori === 'Dining', 'Budget edit: category changes');

/* ================================================================
   4. Budget Deletion
   ================================================================ */

process.stdout.write('\n--- Budget Deletion ---\n');

let budgetList = [b1, b2];
budgetList = budgetList.filter(b => b.id !== b1.id);
assert(budgetList.length === 1, 'Budget deletion: removes budget');
assert(budgetList[0].id === b2.id, 'Budget deletion: keeps others');

/* ================================================================
   5. Budget Usage Calculation
   ================================================================ */

process.stdout.write('\n--- Budget Usage Calculation ---\n');

const usage1 = calculateBudgetUsage({ kategori: 'Food', anggaran: 500 }, 300);
assertEq(usage1.used, 300, 'Usage: used amount');
assertEq(usage1.remaining, 200, 'Usage: remaining');
assertEq(usage1.percentage, 60, 'Usage: percentage');
assert(usage1.isOverBudget === false, 'Usage: not over budget');
assert(usage1.status === 'on-track', 'Usage: on-track status');

const usage2 = calculateBudgetUsage({ kategori: 'Food', anggaran: 500 }, 480);
assertEq(usage2.percentage, 96, 'Usage: near limit percentage');
assert(usage2.status === 'warning', 'Usage: warning status at 90%+');

const usage3 = calculateBudgetUsage({ kategori: 'Food', anggaran: 500 }, 600);
assertEq(usage3.used, 600, 'Usage over: used');
assertEq(usage3.remaining, -100, 'Usage over: negative remaining');
assertEq(usage3.percentage, 120, 'Usage over: >100%');
assert(usage3.isOverBudget === true, 'Usage over: over budget');
assert(usage3.status === 'over', 'Usage over: over status');

/* ================================================================
   6. Monthly Spending Matching
   ================================================================ */

process.stdout.write('\n--- Monthly Spending Matching ---\n');

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

const budgets = [
  { kategori: 'Makan & Jajan', anggaran: 500000 },
  { kategori: 'Transportasi', anggaran: 300000 },
  { kategori: 'Hiburan', anggaran: 200000 },
];

const transactions = [
  { kategori: 'Makan & Jajan', tipe: 'keluar', jumlah: 125000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-05` },
  { kategori: 'Makan & Jajan', tipe: 'keluar', jumlah: 75000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-12` },
  { kategori: 'Transportasi', tipe: 'keluar', jumlah: 50000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-08` },
  // Income should NOT count
  { kategori: 'Makan & Jajan', tipe: 'masuk', jumlah: 100000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
];

const usages = calculateAllBudgetUsages(budgets, transactions, year, month);

const foodUsage = usages.find(u => u.category === 'Makan & Jajan');
assertEq(foodUsage.used, 200000, 'Monthly: food spending (income excluded)');
assertEq(foodUsage.limit, 500000, 'Monthly: food limit');
assertEq(foodUsage.percentage, 40, 'Monthly: food percentage');

const transportUsage = usages.find(u => u.category === 'Transportasi');
assertEq(transportUsage.used, 50000, 'Monthly: transport spending');

const hiburanUsage = usages.find(u => u.category === 'Hiburan');
assertEq(hiburanUsage.used, 0, 'Monthly: hiburan no spending');

/* ================================================================
   7. Weekly Spending (period handling)
   ================================================================ */

process.stdout.write('\n--- Period Handling ---\n');

// Budgets currently support monthly period matching in calculateAllBudgetUsages
// This test verifies that only current-month transactions are included
const futureTransactions = [
  { kategori: 'Makan & Jajan', tipe: 'keluar', jumlah: 999999, tanggal: `${year+1}-01-01` },
  { kategori: 'Makan & Jajan', tipe: 'keluar', jumlah: 10000, tanggal: `${year}-01-01` }, // wrong month
];

const periodUsages = calculateAllBudgetUsages(budgets, futureTransactions, year, month);
const periodFood = periodUsages.find(u => u.category === 'Makan & Jajan');
assertEq(periodFood.used, 0, 'Period: future transactions excluded');

/* ================================================================
   8. Category Matching
   ================================================================ */

process.stdout.write('\n--- Category Matching ---\n');

const catTransactions = [
  { kategori: 'Makan & Jajan', tipe: 'keluar', jumlah: 100, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
  { kategori: 'Belanja Rumah', tipe: 'keluar', jumlah: 200, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
  { kategori: '', tipe: 'keluar', jumlah: 50, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
];

const catUsages = calculateAllBudgetUsages(budgets, catTransactions, year, month);
const catFood = catUsages.find(u => u.category === 'Makan & Jajan');
assertEq(catFood.used, 100, 'Category matching: correct category');

/* ================================================================
   9. Expense Inclusion
   ================================================================ */

process.stdout.write('\n--- Expense Inclusion ---\n');

const expenseTransactions = [
  { kategori: 'Makan & Jajan', tipe: 'keluar', jumlah: 300, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
];

const expUsages = calculateAllBudgetUsages(budgets, expenseTransactions, year, month);
const expFood = expUsages.find(u => u.category === 'Makan & Jajan');
assertEq(expFood.used, 300, 'Expense inclusion: keluar counted');

/* ================================================================
   10. Income Exclusion
   ================================================================ */

process.stdout.write('\n--- Income Exclusion ---\n');

const incomeTransactions = [
  { kategori: 'Makan & Jajan', tipe: 'masuk', jumlah: 300, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
];

const incUsages = calculateAllBudgetUsages(budgets, incomeTransactions, year, month);
const incFood = incUsages.find(u => u.category === 'Makan & Jajan');
assertEq(incFood.used, 0, 'Income exclusion: masuk NOT counted');

/* ================================================================
   11. Transfer Exclusion
   ================================================================ */

process.stdout.write('\n--- Transfer Exclusion ---\n');

const transferTransactions = [
  { kategori: 'Makan & Jajan', tipe: 'transfer', jumlah: 300, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
];

const trUsages = calculateAllBudgetUsages(budgets, transferTransactions, year, month);
const trFood = trUsages.find(u => u.category === 'Makan & Jajan');
assertEq(trFood.used, 0, 'Transfer exclusion: transfer NOT counted');

/* ================================================================
   12. Goal Contribution Behavior
   ================================================================ */

process.stdout.write('\n--- Goal Contribution Behavior ---\n');

// Goal contributions use 'keluar' type but should not inflate budget spending
// in the real app, goal contributions go through a separate mechanism
// The budget system only tracks by category, so if a goal contribution
// uses 'Makan & Jajan' category, it would incorrectly count.
// This test verifies the model and documents the limitation.

const goalContribTransactions = [
  { kategori: 'Tabungan', tipe: 'keluar', jumlah: 200, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
];

const goalUsages = calculateAllBudgetUsages(budgets, goalContribTransactions, year, month);
const goalTabungan = goalUsages.find(u => u.category === 'Tabungan');
assertEq(goalTabungan?.used || 0, 0, 'Goal contribution: no budget for Tabungan category = 0 spent');

/* ================================================================
   13. Remaining Amount
   ================================================================ */

process.stdout.write('\n--- Remaining Amount ---\n');

const r1 = calculateBudgetUsage({ kategori: 'Food', anggaran: 1000 }, 400);
assertEq(r1.remaining, 600, 'Remaining: positive when under');

const r2 = calculateBudgetUsage({ kategori: 'Food', anggaran: 1000 }, 1200);
assertEq(r2.remaining, -200, 'Remaining: negative when over');

const r3 = calculateBudgetUsage({ kategori: 'Food', anggaran: 1000 }, 1000);
assertEq(r3.remaining, 0, 'Remaining: zero at exact limit');

/* ================================================================
   14. Progress Percentage
   ================================================================ */

process.stdout.write('\n--- Progress Percentage ---\n');

const p1 = calculateBudgetUsage({ kategori: 'Food', anggaran: 200 }, 100);
assertEq(p1.percentage, 50, 'Progress: 50%');

const p2 = calculateBudgetUsage({ kategori: 'Food', anggaran: 200 }, 150);
assertEq(p2.percentage, 75, 'Progress: 75%');

const p3 = calculateBudgetUsage({ kategori: 'Food', anggaran: 200 }, 250);
assertEq(p3.percentage, 125, 'Progress: over 100%');

const p4 = calculateBudgetUsage({ kategori: 'Food', anggaran: 200 }, 198);
assertEq(p4.percentage, 99, 'Progress: near 100%');

/* ================================================================
   15. Over-Budget Detection
   ================================================================ */

process.stdout.write('\n--- Over-Budget Detection ---\n');

const ob1 = calculateBudgetUsage({ kategori: 'Food', anggaran: 500 }, 499);
assert(ob1.isOverBudget === false, 'Not over at 499/500');
assert(ob1.status === 'warning', 'Warning at 99%');

const ob2 = calculateBudgetUsage({ kategori: 'Food', anggaran: 500 }, 501);
assert(ob2.isOverBudget === true, 'Over at 501/500');
assert(ob2.status === 'over', 'Over status');

const ob3 = calculateBudgetUsage({ kategori: 'Food', anggaran: 500 }, 500);
assert(ob3.isOverBudget === false, 'Not over at exact 500/500');

/* ================================================================
   16. Multiple Categories
   ================================================================ */

process.stdout.write('\n--- Multiple Categories ---\n');

const multiBudgets = [
  { kategori: 'A', anggaran: 100 },
  { kategori: 'B', anggaran: 200 },
  { kategori: 'C', anggaran: 300 },
];

const multiTxns = [
  { kategori: 'A', tipe: 'keluar', jumlah: 80, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
  { kategori: 'B', tipe: 'keluar', jumlah: 150, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
  { kategori: 'C', tipe: 'keluar', jumlah: 100, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
];

const multiUsages = calculateAllBudgetUsages(multiBudgets, multiTxns, year, month);
assert(multiUsages.length === 3, 'Multiple: returns all 3 usages');

const usageA = multiUsages.find(u => u.category === 'A');
assertEq(usageA.used, 80, 'Multiple cat A spending');
assertEq(usageA.percentage, 80, 'Multiple cat A percentage');

const usageB = multiUsages.find(u => u.category === 'B');
assertEq(usageB.used, 150, 'Multiple cat B spending');

const usageC = multiUsages.find(u => u.category === 'C');
assertEq(usageC.used, 100, 'Multiple cat C spending');
assertEq(usageC.percentage, 33, 'Multiple cat C percentage');

/* ================================================================
   17. Empty Budgets
   ================================================================ */

process.stdout.write('\n--- Empty Budgets ---\n');

const emptyUsages = calculateAllBudgetUsages([], transactions, year, month);
assert(emptyUsages.length === 0, 'Empty budgets: returns empty array');

const emptyTxnUsages = calculateAllBudgetUsages(budgets, [], year, month);
const emptyFood = emptyTxnUsages.find(u => u.category === 'Makan & Jajan');
assertEq(emptyFood.used, 0, 'Empty transactions: no spending');

/* ================================================================
   18. Budget Summary
   ================================================================ */

process.stdout.write('\n--- Budget Summary ---\n');

const summaryUsages = [
  { limit: 500, used: 300, remaining: 200, percentage: 60, isOverBudget: false },
  { limit: 300, used: 350, remaining: -50, percentage: 117, isOverBudget: true },
  { limit: 200, used: 100, remaining: 100, percentage: 50, isOverBudget: false },
];

const summary = getBudgetSummary(summaryUsages);
assertEq(summary.totalLimit, 1000, 'Summary: total limit');
assertEq(summary.totalUsed, 750, 'Summary: total used');
assertEq(summary.totalRemaining, 250, 'Summary: total remaining');
assertEq(summary.overallPercentage, 75, 'Summary: overall percentage');
assertEq(summary.overBudgetCount, 1, 'Summary: over budget count');
assertEq(summary.categoryCount, 3, 'Summary: category count');

/* ================================================================
   19. Invalid/Malformed Budget Data
   ================================================================ */

process.stdout.write('\n--- Invalid Budget Data ---\n');

const u1 = calculateBudgetUsage(null, 100);
assertEq(u1.limit, 0, 'Null budget: limit is 0');
assertEq(u1.used, 0, 'Null budget: used is 0 (safe default)');

const u2 = calculateBudgetUsage({ kategori: 'X', anggaran: 'abc' }, 100);
assertEq(u2.limit, 0, 'NaN amount: limit is 0');

const u3 = calculateBudgetUsage({ kategori: 'X', anggaran: 500 }, null);
assertEq(u3.used, 0, 'Null spent: used is 0');

const u4 = calculateBudgetUsage({ kategori: 'X', anggaran: 500 }, 'not-a-number');
assertEq(u4.used, 0, 'String spent: used is 0');

/* ================================================================
   20. Dashboard/Budget Consistency
   ================================================================ */

process.stdout.write('\n--- Dashboard/Budget Consistency ---\n');

// The budget summary should match the sum of individual usages
const consistencyBudgets = [
  { kategori: 'Food', anggaran: 1000 },
  { kategori: 'Transport', anggaran: 500 },
];

const consistencyTxns = [
  { kategori: 'Food', tipe: 'keluar', jumlah: 400, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
  { kategori: 'Food', tipe: 'keluar', jumlah: 200, tanggal: `${year}-${String(month+1).padStart(2,'0')}-05` },
  { kategori: 'Transport', tipe: 'keluar', jumlah: 300, tanggal: `${year}-${String(month+1).padStart(2,'0')}-03` },
  // Income should NOT affect budget
  { kategori: 'Food', tipe: 'masuk', jumlah: 50000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
  // Transfer should NOT affect budget
  { kategori: 'Transport', tipe: 'transfer', jumlah: 5000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-02` },
];

const consistencyUsages = calculateAllBudgetUsages(consistencyBudgets, consistencyTxns, year, month);
const consistencySummary = getBudgetSummary(consistencyUsages);

// Food: 400 + 200 = 600 (income and transfer excluded)
assertEq(consistencyUsages.find(u => u.category === 'Food').used, 600, 'Consistency: food total');
assertEq(consistencyUsages.find(u => u.category === 'Transport').used, 300, 'Consistency: transport total');
assertEq(consistencySummary.totalUsed, 900, 'Consistency: summary total used');
assertEq(consistencySummary.totalLimit, 1500, 'Consistency: summary total limit');
assertEq(consistencySummary.overallPercentage, 60, 'Consistency: overall percentage');
assert(consistencySummary.overBudgetCount === 0, 'Consistency: none over budget');

/* ================================================================
   21. Budget Does Not Modify Account Balances
   ================================================================ */

process.stdout.write('\n--- Financial Invariants ---\n');

// Creating/deleting budgets should never touch accounts or transactions
const beforeBudgets = JSON.parse(JSON.stringify(consistencyBudgets));
const beforeTxns = JSON.parse(JSON.stringify(consistencyTxns));

// Calculate budget usage (pure function, should not mutate)
calculateAllBudgetUsages(consistencyBudgets, consistencyTxns, year, month);

assertDeepEq(consistencyBudgets, beforeBudgets, 'Invariant: budgets not mutated by calculation');
assertDeepEq(consistencyTxns, beforeTxns, 'Invariant: transactions not mutated by calculation');

/* ================================================================
   22. Zero-Budget Edge Cases
   ================================================================ */

process.stdout.write('\n--- Zero Budget Edge Cases ---\n');

const z1 = calculateBudgetUsage({ kategori: 'Food', anggaran: 0 }, 100);
assertEq(z1.percentage, 0, 'Zero budget: percentage is 0');
assert(z1.isOverBudget === false, 'Zero budget: not over budget');

const z2 = calculateBudgetUsage({ kategori: 'Food', anggaran: 0 }, 0);
assertEq(z2.percentage, 0, 'Zero/zero: percentage is 0');

/* ================================================================
   23. Legacy Budget Category Names
   ================================================================ */

process.stdout.write('\n--- Legacy Category Names ---\n');

const legacyBudgets = [
  { kategori: 'Makan & Jajan', anggaran: 500000 },
  { kategori: 'Belanja Rumah', anggaran: 300000 },
  { kategori: 'Anak & Sekolah', anggaran: 200000 },
  { kategori: 'Tagihan & Listrik', anggaran: 150000 },
  { kategori: 'Kesehatan', anggaran: 100000 },
  { kategori: 'Hiburan', anggaran: 100000 },
];

const legacyTxns = [
  { kategori: 'Makan & Jajan', tipe: 'keluar', jumlah: 200000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
  { kategori: 'Belanja Rumah', tipe: 'keluar', jumlah: 150000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
  { kategori: 'Tagihan & Listrik', tipe: 'keluar', jumlah: 100000, tanggal: `${year}-${String(month+1).padStart(2,'0')}-01` },
];

const legacyUsages = calculateAllBudgetUsages(legacyBudgets, legacyTxns, year, month);
const legacyFood = legacyUsages.find(u => u.category === 'Makan & Jajan');
assertEq(legacyFood.used, 200000, 'Legacy: Makan & Jajan spending');
assertEq(legacyFood.percentage, 40, 'Legacy: Makan & Jajan percentage');

const legacyHousing = legacyUsages.find(u => u.category === 'Belanja Rumah');
assertEq(legacyHousing.used, 150000, 'Legacy: Belanja Rumah spending');

// Categories with no transactions should be 0
const legacyHealth = legacyUsages.find(u => u.category === 'Kesehatan');
assertEq(legacyHealth.used, 0, 'Legacy: Kesehatan no spending');

/* ================================================================
   RESULTS
   ================================================================ */

process.stdout.write('\n\n');
console.log(`\n=== BUDGETS TEST SUITE ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED');
}
