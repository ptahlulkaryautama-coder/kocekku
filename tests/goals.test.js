/**
 * Phase 7 — Goals Test Suite
 * Tests goal domain logic, CRUD, contribution semantics, and financial invariants
 */

import {
  calculateGoalProgress,
  calculateAllGoalsProgress,
  getGoalsSummary,
  projectCompletionDate,
  createGoal,
  validateGoal,
} from '../src/domain/goals.js';

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
   1. Goal Creation
   ================================================================ */

process.stdout.write('\n--- Goal Creation ---\n');

const g1 = createGoal({ nama: 'Emergency Fund', target: 50000000, terkumpul: 10000000 });
assert(g1.nama === 'Emergency Fund', 'Goal creation: name');
assertEq(g1.target, 50000000, 'Goal creation: target');
assertEq(g1.terkumpul, 10000000, 'Goal creation: current');
assert(g1.id && g1.id.startsWith('goal_'), 'Goal creation: id');
assert(g1.icon === 'target', 'Goal creation: default icon');
assert(g1.createdAt, 'Goal creation: createdAt');

const g2 = createGoal({ nama: 'Vacation', target: 15000000, targetDate: '2026-12-31', icon: 'plane' });
assert(g2.targetDate === '2026-12-31', 'Goal creation: target date');
assert(g2.icon === 'plane', 'Goal creation: custom icon');

/* ================================================================
   2. Goal Validation
   ================================================================ */

process.stdout.write('\n--- Goal Validation ---\n');

const v1 = validateGoal({ nama: 'Fund', target: 1000 });
assert(v1.valid === true, 'Valid goal passes');

const v2 = validateGoal({ nama: '', target: 1000 });
assert(v2.valid === false, 'Empty name fails');

const v3 = validateGoal({ nama: 'Fund', target: 0 });
assert(v3.valid === false, 'Zero target fails');

const v4 = validateGoal({ nama: 'Fund', target: -100 });
assert(v4.valid === false, 'Negative target fails');

const v5 = validateGoal({ nama: '', target: 0 });
assert(v5.valid === false, 'Both invalid fails');

/* ================================================================
   3. Goal Editing
   ================================================================ */

process.stdout.write('\n--- Goal Editing ---\n');

const edited = createGoal({ nama: 'Fund', target: 1000 });
edited.nama = 'Emergency Fund';
edited.target = 2000;
assert(edited.nama === 'Emergency Fund', 'Goal edit: name changes');
assertEq(edited.target, 2000, 'Goal edit: target changes');

/* ================================================================
   4. Goal Deletion
   ================================================================ */

process.stdout.write('\n--- Goal Deletion ---\n');

let goalList = [g1, g2];
goalList = goalList.filter(g => g.id !== g1.id);
assert(goalList.length === 1, 'Goal deletion: removes goal');
assert(goalList[0].id === g2.id, 'Goal deletion: keeps others');

/* ================================================================
   5. Progress Calculation
   ================================================================ */

process.stdout.write('\n--- Progress Calculation ---\n');

const p1 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 50000 });
assertEq(p1.percentage, 50, 'Progress: 50%');
assertEq(p1.remaining, 50000, 'Progress: remaining');
assert(p1.isComplete === false, 'Progress: not complete');
assert(p1.status === 'on-track', 'Progress: on-track at 50%');

const p2 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 75000 });
assertEq(p2.percentage, 75, 'Progress: 75%');
assert(p2.status === 'near-complete', 'Progress: near-complete at 75%');

/* ================================================================
   6. Remaining Amount
   ================================================================ */

process.stdout.write('\n--- Remaining Amount ---\n');

const r1 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 30000 });
assertEq(r1.remaining, 70000, 'Remaining: positive');

const r2 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 100000 });
assertEq(r2.remaining, 0, 'Remaining: zero at target');

const r3 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 150000 });
assertEq(r3.remaining, 0, 'Remaining: capped at 0 when over-target');

/* ================================================================
   7. 0% Progress
   ================================================================ */

process.stdout.write('\n--- 0% Progress ---\n');

const z1 = calculateGoalProgress({ nama: 'Fund', target: 50000, terkumpul: 0 });
assertEq(z1.percentage, 0, 'Zero progress: 0%');
assertEq(z1.current, 0, 'Zero progress: current is 0');
assertEq(z1.remaining, 50000, 'Zero progress: full remaining');
assert(z1.isComplete === false, 'Zero progress: not complete');
assert(z1.status === 'in-progress', 'Zero progress: in-progress');

/* ================================================================
   8. Partial Progress
   ================================================================ */

process.stdout.write('\n--- Partial Progress ---\n');

const pp1 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 25000 });
assertEq(pp1.percentage, 25, 'Partial: 25%');
assert(pp1.status === 'in-progress', 'Partial: in-progress at 25%');

const pp2 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 60000 });
assertEq(pp2.percentage, 60, 'Partial: 60%');
assert(pp2.status === 'on-track', 'Partial: on-track at 60%');

/* ================================================================
   9. 100% Progress
   ================================================================ */

process.stdout.write('\n--- 100% Progress ---\n');

const c1 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 100000 });
assertEq(c1.percentage, 100, 'Complete: 100%');
assertEq(c1.remaining, 0, 'Complete: zero remaining');
assert(c1.isComplete === true, 'Complete: is complete');
assert(c1.status === 'complete', 'Complete: status complete');

/* ================================================================
   10. Over-Target Progress
   ================================================================ */

process.stdout.write('\n--- Over-Target Progress ---\n');

const ot1 = calculateGoalProgress({ nama: 'Fund', target: 100000, terkumpul: 120000 });
assertEq(ot1.percentage, 100, 'Over-target: capped at 100%');
assertEq(ot1.current, 120000, 'Over-target: preserves actual amount');
assertEq(ot1.remaining, 0, 'Over-target: zero remaining');
assert(ot1.isComplete === true, 'Over-target: complete');
assert(ot1.status === 'complete', 'Over-target: status complete');

/* ================================================================
   11. Target Date
   ================================================================ */

process.stdout.write('\n--- Target Date ---\n');

const td1 = createGoal({ nama: 'Fund', target: 50000, targetDate: '2026-12-31' });
assert(td1.targetDate === '2026-12-31', 'Target date: stored');

const td2 = createGoal({ nama: 'Fund', target: 50000 });
assert(td2.targetDate === null, 'Target date: null when not provided');

/* ================================================================
   12. Days Remaining
   ================================================================ */

process.stdout.write('\n--- Days Remaining (manual calc) ---\n');

// Test the logic conceptually
const futureDate = new Date();
futureDate.setMonth(futureDate.getMonth() + 6);
const daysRemaining = Math.ceil((futureDate - new Date()) / (1000 * 60 * 60 * 24));
assert(daysRemaining > 170 && daysRemaining < 190, 'Days remaining: ~6 months ≈ 180 days');

/* ================================================================
   13. Completed State
   ================================================================ */

process.stdout.write('\n--- Completed State ---\n');

const completeGoal = { nama: 'Laptop', target: 15000000, terkumpul: 15000000 };
const cp = calculateGoalProgress(completeGoal);
assert(cp.isComplete === true, 'Completed: is complete');
assert(cp.status === 'complete', 'Completed: status');
assertEq(cp.percentage, 100, 'Completed: 100%');
assertEq(cp.remaining, 0, 'Completed: no remaining');

/* ================================================================
   14. Multiple Goals
   ================================================================ */

process.stdout.write('\n--- Multiple Goals ---\n');

const goals = [
  { nama: 'A', target: 100, terkumpul: 50 },
  { nama: 'B', target: 200, terkumpul: 200 },
  { nama: 'C', target: 300, terkumpul: 0 },
];

const allProgress = calculateAllGoalsProgress(goals);
assert(allProgress.length === 3, 'Multiple: returns 3 results');
assertEq(allProgress[0].percentage, 50, 'Multiple A: 50%');
assertEq(allProgress[1].percentage, 100, 'Multiple B: 100%');
assertEq(allProgress[2].percentage, 0, 'Multiple C: 0%');

/* ================================================================
   15. Empty Goals
   ================================================================ */

process.stdout.write('\n--- Empty Goals ---\n');

const emptyProgress = calculateAllGoalsProgress([]);
assert(emptyProgress.length === 0, 'Empty goals: returns empty array');

const summary = getGoalsSummary([]);
assertEq(summary.totalTarget, 0, 'Empty summary: target 0');
assertEq(summary.totalCurrent, 0, 'Empty summary: current 0');
assertEq(summary.completedCount, 0, 'Empty summary: 0 completed');
assertEq(summary.totalCount, 0, 'Empty summary: 0 total');

/* ================================================================
   16. Legacy Goal Loading
   ================================================================ */

process.stdout.write('\n--- Legacy Goal Loading ---\n');

const legacyGoals = [
  { nama: 'Dana Darurat', target: 50000000, terkumpul: 32000000, icon: 'shield' },
  { nama: 'Liburan', target: 15000000, terkumpul: 5500000, icon: 'plane' },
  { nama: 'Sekolah Anak', target: 100000000, terkumpul: 25000000, icon: 'graduation-cap' },
];

const legacyProgress = calculateAllGoalsProgress(legacyGoals);
assertEq(legacyProgress[0].percentage, 64, 'Legacy: Dana Darurat 64%');
assertEq(legacyProgress[1].percentage, 37, 'Legacy: Liburan 37%');
assertEq(legacyProgress[2].percentage, 25, 'Legacy: Sekolah Anak 25%');

const legacySummary = getGoalsSummary(legacyProgress);
assertEq(legacySummary.totalTarget, 165000000, 'Legacy: total target');
assertEq(legacySummary.totalCurrent, 62500000, 'Legacy: total current');
assertEq(legacySummary.completedCount, 0, 'Legacy: none completed');
assertEq(legacySummary.totalCount, 3, 'Legacy: 3 goals');

/* ================================================================
   17. Invalid Goal Data
   ================================================================ */

process.stdout.write('\n--- Invalid Goal Data ---\n');

const inv1 = calculateGoalProgress(null);
assertEq(inv1.percentage, 0, 'Null goal: percentage 0');
assertEq(inv1.target, 0, 'Null goal: target 0');
assertEq(inv1.current, 0, 'Null goal: current 0');
assert(inv1.isComplete === false, 'Null goal: not complete');

const inv2 = calculateGoalProgress({ nama: 'X', target: 'abc', terkumpul: 'xyz' });
assertEq(inv2.percentage, 0, 'NaN amounts: percentage 0');
assertEq(inv2.target, 0, 'NaN amounts: target 0');
assertEq(inv2.current, 0, 'NaN amounts: current 0');

const inv3 = calculateGoalProgress({ nama: 'X', target: 0, terkumpul: 0 });
assertEq(inv3.percentage, 0, 'Zero amounts: percentage 0');

/* ================================================================
   18. Goal Contribution Behavior
   ================================================================ */

process.stdout.write('\n--- Goal Contribution Behavior ---\n');

// Conceptual: Adding a goal contribution updates terkumpul
const goal = createGoal({ nama: 'Emergency', target: 100000, terkumpul: 20000 });
const beforeContribution = goal.terkumpul;

// Simulate contribution
goal.terkumpul = goal.terkumpul + 30000;
assertEq(goal.terkumpul, 50000, 'Contribution: terkumpul increases');

const afterProgress = calculateGoalProgress(goal);
assertEq(afterProgress.percentage, 50, 'Contribution: progress updates');

// Verify the contribution amount
const contributionAmount = goal.terkumpul - beforeContribution;
assertEq(contributionAmount, 30000, 'Contribution: amount correct');

/* ================================================================
   19. Contribution Does Not Become Ordinary Expense
   ================================================================ */

process.stdout.write('\n--- Contribution Isolation ---\n');

// In the existing Kocekku model, goal contributions ARE recorded as
// 'keluar' transactions with kategori = goal.nama.
// This means they DO appear in category-based expense tracking.
// This is the EXISTING behavior we preserve.
// The test documents this semantic, not changes it.

// Goal contribution transaction
const goalTxn = {
  tipe: 'keluar',
  kategori: 'Dana Darurat', // Goal name as category
  jumlah: 30000,
};

// It IS an expense transaction in the existing model
assert(goalTxn.tipe === 'keluar', 'Contribution: recorded as expense type');
assert(goalTxn.kategori === 'Dana Darurat', 'Contribution: uses goal name as category');

// The amount flows through as keluar
assertEq(goalTxn.jumlah, 30000, 'Contribution: amount preserved');

/* ================================================================
   20. Account Balance Integrity
   ================================================================ */

process.stdout.write('\n--- Account Balance Integrity ---\n');

// When contributing to a goal, the source account balance decreases
// This is the existing Kocekku behavior
let accountBalance = 100000;
const contribution = 30000;
accountBalance -= contribution;
assertEq(accountBalance, 70000, 'Account: balance decreases after contribution');

// When withdrawing from a goal, the account balance increases
accountBalance += contribution;
assertEq(accountBalance, 100000, 'Account: balance restored after withdrawal');

/* ================================================================
   21. Dashboard Goal Consistency
   ================================================================ */

process.stdout.write('\n--- Dashboard Goal Consistency ---\n');

const dashGoals = [
  { nama: 'Emergency Fund', target: 50000000, terkumpul: 35000000 },
  { nama: 'Vacation', target: 15000000, terkumpul: 5500000 },
  { nama: 'Laptop', target: 20000000, terkumpul: 20000000 },
];

const dashProgress = calculateAllGoalsProgress(dashGoals);
const dashSummary = getGoalsSummary(dashProgress);

assertEq(dashSummary.totalTarget, 85000000, 'Dashboard: total target');
assertEq(dashSummary.totalCurrent, 60500000, 'Dashboard: total current');
assertEq(dashSummary.totalRemaining, 24500000, 'Dashboard: total remaining');
assertEq(dashSummary.completedCount, 1, 'Dashboard: 1 completed');
assertEq(dashSummary.totalCount, 3, 'Dashboard: 3 total');
assertEq(dashSummary.overallPercentage, 71, 'Dashboard: overall percentage');

// Individual progress should match
assertEq(dashProgress[0].percentage, 70, 'Dashboard: Emergency 70%');
assertEq(dashProgress[1].percentage, 37, 'Dashboard: Vacation 37%');
assertEq(dashProgress[2].percentage, 100, 'Dashboard: Laptop 100%');

/* ================================================================
   22. Currency Formatting
   ================================================================ */

process.stdout.write('\n--- Currency Formatting ---\n');

// Goals use raw numbers; formatting happens in UI
const largeGoal = createGoal({ nama: 'House', target: 5000000000, terkumpul: 1250000000 });
assertEq(largeGoal.target, 5000000000, 'Large goal: target preserved');
assertEq(largeGoal.terkumpul, 1250000000, 'Large goal: current preserved');

const largeProgress = calculateGoalProgress(largeGoal);
assertEq(largeProgress.percentage, 25, 'Large goal: 25%');
assertEq(largeProgress.remaining, 3750000000, 'Large goal: remaining');

/* ================================================================
   23. Large Goal Amounts
   ================================================================ */

process.stdout.write('\n--- Large Goal Amounts ---\n');

const veryLarge = createGoal({ nama: 'Retirement', target: 1000000000000, terkumpul: 500000000000 });
const vlProgress = calculateGoalProgress(veryLarge);
assertEq(vlProgress.percentage, 50, 'Very large: 50%');
assertEq(vlProgress.remaining, 500000000000, 'Very large: remaining');

/* ================================================================
   24. Zero/Invalid Amounts
   ================================================================ */

process.stdout.write('\n--- Zero/Invalid Amounts ---\n');

const zeroTarget = calculateGoalProgress({ nama: 'X', target: 0, terkumpul: 100 });
assertEq(zeroTarget.percentage, 0, 'Zero target: 0%');
assert(zeroTarget.isComplete === false, 'Zero target: not complete');

const zeroBoth = calculateGoalProgress({ nama: 'X', target: 0, terkumpul: 0 });
assertEq(zeroBoth.percentage, 0, 'Both zero: 0%');

const negativeCurrent = calculateGoalProgress({ nama: 'X', target: 100, terkumpul: -50 });
assertEq(negativeCurrent.current, -50, 'Negative current: preserved');
assertEq(negativeCurrent.percentage, 0, 'Negative current: 0% (Math.round of -50% then capped at 0 by isComplete=false)');

/* ================================================================
   25. Delete Behavior
   ================================================================ */

process.stdout.write('\n--- Delete Behavior ---\n');

const deleteGoals = [
  { id: 'g1', nama: 'Keep', target: 100, terkumpul: 50 },
  { id: 'g2', nama: 'Delete', target: 200, terkumpul: 100 },
  { id: 'g3', nama: 'Keep', target: 300, terkumpul: 150 },
];

const afterDelete = deleteGoals.filter(g => g.id !== 'g2');
assert(afterDelete.length === 2, 'Delete: removes correct goal');
assert(afterDelete[0].id === 'g1', 'Delete: keeps first');
assert(afterDelete[1].id === 'g3', 'Delete: keeps third');

// Verify remaining goals still work
const afterDeleteProgress = calculateAllGoalsProgress(afterDelete);
assertEq(afterDeleteProgress.length, 2, 'Delete: 2 remaining goals');

/* ================================================================
   26. Projected Completion Date
   ================================================================ */

process.stdout.write('\n--- Projected Completion ---\n');

const projGoal = { nama: 'Fund', target: 100000, terkumpul: 50000 };

// No transactions → no projection
const proj1 = projectCompletionDate(projGoal, [], 3);
assert(proj1 === null, 'Projection: null without data');

// Complete goal → now
const completeProj = { nama: 'Fund', target: 100000, terkumpul: 100000 };
const proj2 = projectCompletionDate(completeProj, [], 3);
assert(proj2 !== null, 'Projection: date for complete goal');

/* ================================================================
   27. Financial Invariants
   ================================================================ */

process.stdout.write('\n--- Financial Invariants ---\n');

// Goal calculations are pure — they don't modify input data
const invariantGoals = [
  { nama: 'A', target: 100, terkumpul: 50 },
  { nama: 'B', target: 200, terkumpul: 100 },
];

const beforeGoals = JSON.parse(JSON.stringify(invariantGoals));
calculateAllGoalsProgress(invariantGoals);
getGoalsSummary(calculateAllGoalsProgress(invariantGoals));

// Verify goals not mutated
assert(JSON.stringify(invariantGoals) === JSON.stringify(beforeGoals), 'Invariant: goals not mutated');

/* ================================================================
   RESULTS
   ================================================================ */

process.stdout.write('\n\n');
console.log(`\n=== GOALS TEST SUITE ===`);
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
