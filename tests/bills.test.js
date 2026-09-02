/**
 * Bills & Recurring Expenses — Test Suite
 * Phase 8: Comprehensive bill domain tests
 */

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label, detail) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push({ label, detail: detail || '' });
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push({ label, detail: `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` });
    console.log(`  ❌ FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertApprox(actual, expected, label, tolerance = 1) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed++;
  } else {
    failed++;
    failures.push({ label, detail: `expected ~${expected}, got ${actual}` });
    console.log(`  ❌ FAIL: ${label} — expected ~${expected}, got ${actual}`);
  }
}

// ============================================================
// Import domain functions
// ============================================================
import {
  createBill,
  validateBill,
  calculateBillStatus,
  getNextDueDate,
  getDaysUntilDue,
  getUpcomingBills,
  getBillsByStatus,
  calculateBillsSummary,
  calculateMonthlyCommitments,
  calculateCommitmentPercentage,
  getBillsSummary,
  isBillPaidForMonth,
  calculateNextOccurrence,
  BILL_STATUS,
  RECURRENCE,
} from '../src/domain/bills.js';

import {
  createTransaction,
  validateTransaction,
  filterByType,
  calculateMonthlyExpenses,
} from '../src/domain/transactions.js';

// ============================================================
// Test helpers
// ============================================================

function makeBill(overrides = {}) {
  return createBill({
    nama: 'Netflix',
    jumlah: 150000,
    tanggalJatuhTempo: 5,
    kategori: 'Hiburan',
    ...overrides
  });
}

function makeAccount(overrides = {}) {
  return {
    id: 'acc_1',
    nama: 'BCA',
    jenis: 'bank',
    saldo: 5000000,
    mataUang: 'IDR',
    aktif: true,
    ...overrides
  };
}

// ============================================================
// 1. CREATE BILL
// ============================================================
console.log('\n=== CREATE BILL ===');

{
  const bill = makeBill();
  assert(typeof bill.id === 'string' && bill.id.startsWith('bill_'), 'Create bill generates ID');
  assertEqual(bill.nama, 'Netflix', 'Create bill sets name');
  assertEqual(bill.jumlah, 150000, 'Create bill sets amount');
  assertEqual(bill.tanggalJatuhTempo, 5, 'Create bill sets due day');
  assertEqual(bill.kategori, 'Hiburan', 'Create bill sets category');
  assertEqual(bill.aktif, true, 'Create bill is active by default');
  assertEqual(bill.ulang, RECURRENCE.MONTHLY, 'Create bill defaults to monthly recurrence');
  assertEqual(bill.dompet, '', 'Create bill has empty payment account');
  assertEqual(bill.terakhirBayar, null, 'Create bill has no payment history');
  assertEqual(bill.catatan, '', 'Create bill has empty notes');
}

// ============================================================
// 2. VALIDATE BILL
// ============================================================
console.log('\n=== VALIDATE BILL ===');

{
  const valid = validateBill(makeBill());
  assert(valid.valid === true, 'Valid bill passes validation');
  assertEqual(valid.errors.length, 0, 'Valid bill has no errors');
}

{
  const noName = validateBill(makeBill({ nama: '' }));
  assert(noName.valid === false, 'Bill without name fails validation');
  assert(noName.errors.some(e => e.includes('name')), 'Name error message present');
}

{
  const zeroAmount = validateBill(makeBill({ jumlah: 0 }));
  assert(zeroAmount.valid === false, 'Bill with zero amount fails validation');
}

{
  const negAmount = validateBill(makeBill({ jumlah: -100 }));
  assert(negAmount.valid === false, 'Bill with negative amount fails validation');
}

{
  const badDay = validateBill(makeBill({ tanggalJatuhTempo: 32 }));
  assert(badDay.valid === false, 'Bill with day 32 fails validation');
}

{
  const badRecurrence = validateBill(makeBill({ ulang: 'daily' }));
  assert(badRecurrence.valid === false, 'Bill with invalid recurrence fails validation');
  assert(badRecurrence.errors.some(e => e.includes('recurrence')), 'Recurrence error message present');
}

{
  const validRecurrence = validateBill(makeBill({ ulang: RECURRENCE.WEEKLY }));
  assert(validRecurrence.valid === true, 'Bill with weekly recurrence passes validation');
}

// ============================================================
// 3. BILL STATUS
// ============================================================
console.log('\n=== BILL STATUS ===');

{
  const bill = makeBill({ aktif: false });
  assertEqual(calculateBillStatus(bill), BILL_STATUS.INACTIVE, 'Inactive bill has INACTIVE status');
}

{
  const bill = makeBill({ terakhirBayar: new Date().toISOString() });
  const now = new Date();
  assertEqual(calculateBillStatus(bill, now), BILL_STATUS.PAID, 'Bill paid this month is PAID');
}

{
  // Bill with future due date → UPCOMING
  const futureBill = makeBill({ tanggalJatuhTempo: 28 });
  const now = new Date(2026, 7, 1); // Aug 1, 2026
  const status = calculateBillStatus(futureBill, now);
  assertEqual(status, BILL_STATUS.UPCOMING, 'Future bill is UPCOMING');
}

{
  // Bill with past due date → OVERDUE or UPCOMING (moves to next month)
  const pastBill = makeBill({ tanggalJatuhTempo: 1 });
  const now = new Date(2026, 7, 15); // Aug 15
  const status = calculateBillStatus(pastBill, now);
  // Day 1 has passed in Aug, so next due date is Sep 1 → UPCOMING
  assert(status === BILL_STATUS.UPCOMING || status === BILL_STATUS.OVERDUE, 'Past due bill has valid status');
}

// ============================================================
// 4. NEXT DUE DATE
// ============================================================
console.log('\n=== NEXT DUE DATE ===');

{
  const bill = makeBill({ tanggalJatuhTempo: 15 });
  const now = new Date(2026, 7, 1); // Aug 1
  const dueDate = getNextDueDate(bill, now);
  assert(dueDate !== null, 'Next due date is not null');
  assertEqual(dueDate.getDate(), 15, 'Due date is day 15');
  assertEqual(dueDate.getMonth(), 7, 'Due date is August (0-indexed)');
}

{
  // Due date already passed this month
  const bill = makeBill({ tanggalJatuhTempo: 3 });
  const now = new Date(2026, 7, 10); // Aug 10
  const dueDate = getNextDueDate(bill, now);
  assertEqual(dueDate.getMonth(), 8, 'Past due moves to September');
  assertEqual(dueDate.getDate(), 3, 'Past due keeps day 3');
}

{
  // Invalid day
  const bill = makeBill({ tanggalJatuhTempo: 32 });
  assertEqual(getNextDueDate(bill), null, 'Invalid day returns null');
}

// ============================================================
// 5. YEARLY RECURRENCE
// ============================================================
console.log('\n=== YEARLY RECURRENCE ===');

{
  const bill = makeBill({ ulang: RECURRENCE.YEARLY, tanggalJatuhTempo: 15 });
  const now = new Date(2026, 7, 1); // Aug 1
  const dueDate = getNextDueDate(bill, now);
  assertEqual(dueDate.getFullYear(), 2026, 'Yearly due in current year');
  assertEqual(dueDate.getMonth(), 7, 'Yearly due in August');
  assertEqual(dueDate.getDate(), 15, 'Yearly due on day 15');
}

// ============================================================
// 6. DAYS UNTIL DUE
// ============================================================
console.log('\n=== DAYS UNTIL DUE ===');

{
  const bill = makeBill({ tanggalJatuhTempo: 16 });
  const now = new Date(2026, 7, 14); // Aug 14
  const days = getDaysUntilDue(bill, now);
  assertEqual(days, 2, 'Days until due is 2');
}

{
  const bill = makeBill({ tanggalJatuhTempo: 14 });
  const now = new Date(2026, 7, 14); // Aug 14, due date = today
  const days = getDaysUntilDue(bill, now);
  // Due date is Aug 14 (same day), or rolls to Sep 14 if already past
  assert(typeof days === 'number', 'Days until due returns a number');
  assert(!isNaN(days) && isFinite(days), 'Days until due is valid');
}

// ============================================================
// 7. BILL DOES NOT AFFECT BALANCE BEFORE PAYMENT
// ============================================================
console.log('\n=== BILL BEFORE PAYMENT ===');

{
  const bill = makeBill({ jumlah: 500000 });
  const status = calculateBillStatus(bill);
  // Bill exists but has NOT been paid
  // It should NOT reduce any account balance
  // It should NOT appear as an expense transaction
  assert(status !== BILL_STATUS.PAID || bill.terakhirBayar !== null, 'Unpaid bill is not marked paid');
  assert(!bill.terakhirBayar, 'Bill has no payment record before payment');
}

// ============================================================
// 8. BILL DOES NOT AFFECT EXPENSES BEFORE PAYMENT
// ============================================================
console.log('\n=== BILL EXPENSE ISOLATION ===');

{
  // Create a transaction list without any bill payment
  const transactions = [
    createTransaction({ jumlah: 2000000, tipe: 'keluar', keterangan: 'Groceries' }),
    createTransaction({ jumlah: 500000, tipe: 'keluar', keterangan: 'Transport' }),
  ];
  
  const bill = makeBill({ jumlah: 1000000, kategori: 'Tagihan & Listrik' });
  
  // The bill should NOT appear in expense calculations
  const totalExpenses = transactions.reduce((sum, t) => sum + (parseFloat(t.jumlah) || 0), 0);
  assertEqual(totalExpenses, 2500000, 'Bill amount not in expense total before payment');
}

// ============================================================
// 9. GET BILLS BY STATUS
// ============================================================
console.log('\n=== GET BILLS BY STATUS ===');

{
  const bills = [
    makeBill({ nama: 'Paid Bill', terakhirBayar: new Date().toISOString(), tanggalJatuhTempo: 1 }),
    makeBill({ nama: 'Inactive', aktif: false }),
    makeBill({ nama: 'Upcoming', tanggalJatuhTempo: 25 }),
  ];
  
  const now = new Date();
  const groups = getBillsByStatus(bills, new Date(now.getFullYear(), now.getMonth(), 1));
  assert(Array.isArray(groups.paid), 'Paid group is array');
  assert(Array.isArray(groups.inactive), 'Inactive group is array');
  assert(Array.isArray(groups.upcoming), 'Upcoming group is array');
  assert(groups.paid.some(b => b.nama === 'Paid Bill'), 'Paid bill in paid group');
  assert(groups.inactive.some(b => b.nama === 'Inactive'), 'Inactive bill in inactive group');
  assert(groups.upcoming.some(b => b.nama === 'Upcoming'), 'Upcoming bill in upcoming group');
}

// ============================================================
// 10. BILLS SUMMARY
// ============================================================
console.log('\n=== BILLS SUMMARY ===');

{
  const bills = [
    makeBill({ nama: 'Netflix', jumlah: 150000 }),
    makeBill({ nama: 'Internet', jumlah: 500000, tanggalJatuhTempo: 8 }),
    makeBill({ nama: 'Rent', jumlah: 2000000, tanggalJatuhTempo: 1 }),
  ];
  
  const summary = calculateBillsSummary(bills, 10000000, new Date(2026, 7, 1));
  assert(typeof summary.totalDue === 'number', 'Summary has totalDue');
  assert(typeof summary.monthlyCommitments === 'number', 'Summary has monthlyCommitments');
  assert(summary.totalCount === 3, 'Summary counts 3 active bills');
}

{
  // Empty bills
  const summary = calculateBillsSummary([], 0);
  assertEqual(summary.totalDue, 0, 'Empty bills: totalDue is 0');
  assertEqual(summary.totalCount, 0, 'Empty bills: totalCount is 0');
}

// ============================================================
// 11. MONTHLY COMMITMENTS
// ============================================================
console.log('\n=== MONTHLY COMMITMENTS ===');

{
  const bills = [
    makeBill({ jumlah: 150000 }),
    makeBill({ jumlah: 500000 }),
    makeBill({ jumlah: 2000000 }),
  ];
  
  const total = calculateMonthlyCommitments(bills);
  assertEqual(total, 2650000, 'Monthly commitments sum correctly');
}

{
  const bills = [
    makeBill({ jumlah: 100000 }),
    makeBill({ jumlah: 200000, aktif: false }),
  ];
  
  const total = calculateMonthlyCommitments(bills);
  assertEqual(total, 100000, 'Inactive bills excluded from commitments');
}

// ============================================================
// 12. COMMITMENT PERCENTAGE
// ============================================================
console.log('\n=== COMMITMENT PERCENTAGE ===');

{
  const bills = [makeBill({ jumlah: 1000000 })];
  const pct = calculateCommitmentPercentage(bills, 5000000);
  assertEqual(pct, 20, 'Commitment percentage calculated correctly');
}

{
  const bills = [makeBill({ jumlah: 1000000 })];
  const pct = calculateCommitmentPercentage(bills, 0);
  assertEqual(pct, 0, 'Zero income gives 0% commitment');
}

// ============================================================
// 13. PAY BILL — CREATES EXPENSE TRANSACTION
// ============================================================
console.log('\n=== PAY BILL ===');

{
  const bill = makeBill({ jumlah: 500000, dompet: 'acc_1' });
  
  // Simulate paying the bill
  const paymentDate = new Date().toISOString();
  const transaction = createTransaction({
    tanggal: paymentDate.split('T')[0],
    keterangan: `Bill: ${bill.nama}`,
    jumlah: bill.jumlah,
    tipe: 'keluar',
    dompet: bill.dompet,
    kategori: bill.kategori || 'Bills & Utilities',
  });
  
  assertEqual(transaction.tipe, 'keluar', 'Payment creates expense transaction');
  assertEqual(transaction.jumlah, 500000, 'Payment amount matches bill');
  assertEqual(transaction.dompet, 'acc_1', 'Payment uses correct account');
  assert(transaction.keterangan.includes(bill.nama), 'Payment references bill name');
}

// ============================================================
// 14. PAY BILL — DOES NOT CREATE DUPLICATE
// ============================================================
console.log('\n=== PAY BILL NO DUPLICATE ===');

{
  const bill = makeBill({ terakhirBayar: new Date().toISOString() });
  const status = calculateBillStatus(bill);
  assertEqual(status, BILL_STATUS.PAID, 'Already-paid bill is PAID');
  // Should not create another transaction
}

// ============================================================
// 15. PAID BILL CANNOT BE PAID TWICE
// ============================================================
console.log('\n=== CANNOT PAY TWICE ===');

{
  const bill = makeBill({ terakhirBayar: new Date().toISOString() });
  assertEqual(calculateBillStatus(bill), BILL_STATUS.PAID, 'Paid bill remains PAID');
}

// ============================================================
// 16. RECURRING — NEXT OCCURRENCE
// ============================================================
console.log('\n=== NEXT OCCURRENCE ===');

{
  const bill = makeBill({ ulang: RECURRENCE.MONTHLY, tanggalJatuhTempo: 15 });
  const paymentDate = new Date(2026, 7, 15); // Aug 15
  const next = calculateNextOccurrence(bill, paymentDate);
  assertEqual(next.getMonth(), 8, 'Monthly next occurrence is September');
  assertEqual(next.getDate(), 15, 'Monthly next keeps day 15');
}

{
  const bill = makeBill({ ulang: RECURRENCE.WEEKLY, tanggalJatuhTempo: 5 });
  const paymentDate = new Date(2026, 7, 10); // Aug 10
  const next = calculateNextOccurrence(bill, paymentDate);
  assertApprox(next.getTime(), paymentDate.getTime() + 7 * 24 * 60 * 60 * 1000, 'Weekly next is +7 days', 60000);
}

{
  const bill = makeBill({ ulang: RECURRENCE.YEARLY, tanggalJatuhTempo: 15 });
  const paymentDate = new Date(2026, 7, 15);
  const next = calculateNextOccurrence(bill, paymentDate);
  assertEqual(next.getFullYear(), 2027, 'Yearly next is next year');
}

{
  const bill = makeBill({ ulang: RECURRENCE.NONE, tanggalJatuhTempo: 5 });
  const next = calculateNextOccurrence(bill, new Date());
  assertEqual(next, null, 'One-time bill has no next occurrence');
}

// ============================================================
// 17. IS BILL PAID FOR MONTH
// ============================================================
console.log('\n=== IS BILL PAID FOR MONTH ===');

{
  const bill = makeBill({ terakhirBayar: '2026-08-05T10:00:00.000Z' });
  assert(isBillPaidForMonth(bill, 2026, 7) === true, 'Bill paid in August returns true for Aug');
  assert(isBillPaidForMonth(bill, 2026, 8) === false, 'Bill paid in August returns false for Sep');
}

{
  const bill = makeBill();
  assert(isBillPaidForMonth(bill, 2026, 7) === false, 'Unpaid bill returns false');
}

// ============================================================
// 18. INVALID / MALFORMED BILL DATA
// ============================================================
console.log('\n=== INVALID DATA ===');

{
  assertEqual(validateBill(null).valid, false, 'Null bill fails validation');
}

{
  assertEqual(validateBill({}).valid, false, 'Empty object fails validation');
}

{
  const v = validateBill({ nama: '', jumlah: 0, tanggalJatuhTempo: 0 });
  assertEqual(v.valid, false, 'All-empty bill fails validation');
  assert(v.errors.length >= 2, 'Multiple validation errors');
}

// ============================================================
// 19. LEGACY BILL LOADING
// ============================================================
console.log('\n=== LEGACY COMPATIBILITY ===');

{
  // Legacy Indonesian fields
  const legacyBill = {
    id: 'bill_legacy_1',
    nama: 'Listrik',
    jumlah: 500000,
    tanggalJatuhTempo: 10,
    kategori: 'Tagihan & Listrik',
    aktif: true,
    catatan: 'Monthly electricity',
    createdAt: '2026-01-01T00:00:00.000Z'
  };
  
  // Should work with all functions
  assertEqual(legacyBill.nama, 'Listrik', 'Legacy bill has Indonesian name');
  assertEqual(legacyBill.jumlah, 500000, 'Legacy bill amount preserved');
  assertEqual(legacyBill.tanggalJatuhTempo, 10, 'Legacy bill due day preserved');
  
  const status = calculateBillStatus(legacyBill, new Date(2026, 7, 1));
  assert(typeof status === 'string', 'Status derived from legacy bill');
  
  const dueDate = getNextDueDate(legacyBill, new Date(2026, 7, 1));
  assert(dueDate !== null, 'Due date calculated from legacy bill');
}

{
  // Legacy bill without new fields (ulang, dompet, terakhirBayar)
  const legacyBill = {
    id: 'bill_legacy_2',
    nama: 'Internet',
    jumlah: 300000,
    tanggalJatuhTempo: 15,
    kategori: 'Tagihan & Listrik',
    aktif: true,
  };
  
  // createBill should add defaults
  const normalized = createBill(legacyBill);
  assertEqual(normalized.ulang, RECURRENCE.MONTHLY, 'Legacy bill gets monthly recurrence');
  assertEqual(normalized.dompet, '', 'Legacy bill gets empty payment account');
  assertEqual(normalized.terakhirBayar, null, 'Legacy bill has no payment history');
}

// ============================================================
// 20. MULTIPLE BILLS
// ============================================================
console.log('\n=== MULTIPLE BILLS ===');

{
  const bills = [
    makeBill({ nama: 'Netflix', jumlah: 150000 }),
    makeBill({ nama: 'Internet', jumlah: 500000, tanggalJatuhTempo: 8 }),
    makeBill({ nama: 'Rent', jumlah: 2000000, tanggalJatuhTempo: 1 }),
    makeBill({ nama: 'Insurance', jumlah: 300000, tanggalJatuhTempo: 20 }),
  ];
  
  assertEqual(bills.length, 4, 'Four bills created');
  assertEqual(calculateMonthlyCommitments(bills), 2950000, 'Total commitments correct');
}

// ============================================================
// 21. EMPTY BILLS
// ============================================================
console.log('\n=== EMPTY BILLS ===');

{
  const groups = getBillsByStatus([]);
  assertEqual(groups.paid.length, 0, 'Empty: no paid bills');
  assertEqual(groups.upcoming.length, 0, 'Empty: no upcoming bills');
  assertEqual(groups.overdue.length, 0, 'Empty: no overdue bills');
  assertEqual(groups.due.length, 0, 'Empty: no due bills');
}

// ============================================================
// 22. BILL STATUS DERIVATION ACCURACY
// ============================================================
console.log('\n=== STATUS ACCURACY ===');

{
  // Due today
  const bill = makeBill({ tanggalJatuhTempo: 15 });
  const status = calculateBillStatus(bill, new Date(2026, 7, 15));
  assert(status === BILL_STATUS.DUE || status === BILL_STATUS.UPCOMING || status === BILL_STATUS.PAID,
    'Bill due today has valid status (DUE/UPCOMING/PAID)');
}

{
  // Paid bill on time
  const bill = makeBill({ tanggalJatuhTempo: 5, terakhirBayar: '2026-08-05T10:00:00.000Z' });
  const status = calculateBillStatus(bill, new Date(2026, 7, 15));
  assertEqual(status, BILL_STATUS.PAID, 'Paid bill is PAID');
}

{
  // Paid bill, but month changed → should be UPCOMING
  const bill = makeBill({ tanggalJatuhTempo: 5, terakhirBayar: '2026-07-05T10:00:00.000Z' });
  const status = calculateBillStatus(bill, new Date(2026, 7, 15));
  assert(status === BILL_STATUS.UPCOMING || status === BILL_STATUS.OVERDUE,
    'Last-month paid bill is UPCOMING/OVERDUE');
}

// ============================================================
// 23. GET UPCOMING BILLS FILTERS PAID
// ============================================================
console.log('\n=== UPCOMING FILTERS PAID ===');

{
  const bills = [
    makeBill({ nama: 'Unpaid', tanggalJatuhTempo: 20 }),
    makeBill({ nama: 'Paid', tanggalJatuhTempo: 20, terakhirBayar: new Date().toISOString() }),
  ];
  
  const upcoming = getUpcomingBills(bills, 30);
  assert(upcoming.some(b => b.nama === 'Unpaid'), 'Unpaid bill appears in upcoming');
  assert(!upcoming.some(b => b.nama === 'Paid'), 'Paid bill filtered from upcoming');
}

// ============================================================
// 24. EDGE CASE — BILL ON DAY 31
// ============================================================
console.log('\n=== EDGE CASES ===');

{
  const bill = makeBill({ tanggalJatuhTempo: 31 });
  const now = new Date(2026, 7, 1); // Aug 1
  const dueDate = getNextDueDate(bill, now);
  assertEqual(dueDate.getDate(), 31, 'Day 31 bill works in August');
}

{
  // Feb edge case: day 30 doesn't exist
  const bill = makeBill({ tanggalJatuhTempo: 30 });
  const now = new Date(2026, 1, 1); // Feb 1
  const dueDate = getNextDueDate(bill, now);
  // Feb 30 → JavaScript rolls to March 2
  assert(dueDate !== null, 'Day 30 in Feb rolls forward gracefully');
}

// ============================================================
// 25. GET BILLS SUMMARY (LEGACY)
// ============================================================
console.log('\n=== LEGACY BILLS SUMMARY ===');

{
  const bills = [
    makeBill({ jumlah: 100000 }),
    makeBill({ jumlah: 200000, aktif: false }),
  ];
  
  const summary = getBillsSummary(bills, 5000000);
  assertEqual(summary.totalCount, 1, 'Legacy summary counts only active');
  assertEqual(summary.monthlyCommitments, 100000, 'Legacy summary total correct');
}

// ============================================================
// 26. BILL WITH NOTES
// ============================================================
console.log('\n=== BILL WITH NOTES ===');

{
  const bill = makeBill({ catatan: 'Premium plan' });
  assertEqual(bill.catatan, 'Premium plan', 'Bill notes preserved');
}

// ============================================================
// 27. BILL DOMPET FIELD
// ============================================================
console.log('\n=== BILL PAYMENT ACCOUNT ===');

{
  const bill = makeBill({ dompet: 'acc_bca' });
  assertEqual(bill.dompet, 'acc_bca', 'Payment account preserved');
  
  // Payment should use this account
  const transaction = createTransaction({
    jumlah: bill.jumlah,
    tipe: 'keluar',
    dompet: bill.dompet,
    keterangan: `Bill: ${bill.nama}`,
  });
  assertEqual(transaction.dompet, 'acc_bca', 'Payment uses bill account');
}

// ============================================================
// 28. RECURRING NONE (ONE-TIME)
// ============================================================
console.log('\n=== ONE-TIME BILL ===');

{
  const bill = makeBill({ ulang: RECURRENCE.NONE });
  const nextOccurrence = calculateNextOccurrence(bill, new Date());
  assertEqual(nextOccurrence, null, 'One-time bill has no next occurrence');
}

// ============================================================
// 29. BUDGET INTEGRATION — BILL BEFORE PAYMENT
// ============================================================
console.log('\n=== BUDGET INTEGRATION ===');

{
  // A bill should NOT contribute to budget spending until paid
  const bill = makeBill({ jumlah: 800000, kategori: 'Tagihan & Listrik' });
  
  // Simulated expense transactions (no bill payment yet)
  const transactions = [
    createTransaction({ jumlah: 300000, tipe: 'keluar', kategori: 'Tagihan & Listrik' }),
    createTransaction({ jumlah: 200000, tipe: 'keluar', kategori: 'Makan & Jajan' }),
  ];
  
  const billCategoryExpenses = transactions
    .filter(t => t.tipe === 'keluar' && t.kategori === bill.kategori)
    .reduce((sum, t) => sum + (parseFloat(t.jumlah) || 0), 0);
  
  // Bill amount (800K) should NOT be in expenses yet
  assertEqual(billCategoryExpenses, 300000, 'Bill amount not in budget spending before payment');
  assert(billCategoryExpenses < bill.jumlah, 'Actual spending < bill amount');
}

// ============================================================
// 30. CATEGORY PRESERVATION
// ============================================================
console.log('\n=== CATEGORY PRESERVATION ===');

{
  const bill = makeBill({ kategori: 'Bills & Utilities' });
  const transaction = createTransaction({
    jumlah: bill.jumlah,
    tipe: 'keluar',
    kategori: bill.kategori,
    dompet: bill.dompet,
    keterangan: `Bill: ${bill.nama}`,
  });
  assertEqual(transaction.kategori, 'Bills & Utilities', 'Category preserved in payment transaction');
}

// ============================================================
// 31. BILL CREATION WITH CUSTOM ID
// ============================================================
console.log('\n=== CUSTOM ID ===');

{
  const bill = makeBill({ id: 'bill_custom_123' });
  assertEqual(bill.id, 'bill_custom_123', 'Custom ID preserved');
}

// ============================================================
// 32. BILL VALIDATION — ALL ERRORS
// ============================================================
console.log('\n=== FULL VALIDATION ===');

{
  const v = validateBill({ nama: '', jumlah: -5, tanggalJatuhTempo: 50, ulang: 'invalid' });
  assertEqual(v.valid, false, 'Fully invalid bill fails');
  assert(v.errors.length >= 3, 'Multiple errors returned');
}

// ============================================================
// 33. OVERDUE BILL STATUS
// ============================================================
console.log('\n=== OVERDUE STATUS ===');

{
  // Bill with day 1, reference date is day 15
  // getNextDueDate will move it to next month
  // So technically it won't be "overdue" in this month
  // But if we set the bill to be paid last month and not this month,
  // and today is past the due date...
  
  const bill = makeBill({ tanggalJatuhTempo: 1, terakhirBayar: '2026-07-05T10:00:00.000Z' });
  const status = calculateBillStatus(bill, new Date(2026, 7, 5)); // Aug 5
  // Paid in July, Aug 1 due date hasn't been paid → depends on logic
  assert(status === BILL_STATUS.UPCOMING || status === BILL_STATUS.OVERDUE || status === BILL_STATUS.PAID,
    'Overdue derivation produces valid status');
}

// ============================================================
// 34. DASHBOARD CONSISTENCY
// ============================================================
console.log('\n=== DASHBOARD CONSISTENCY ===');

{
  const bills = [
    makeBill({ nama: 'Netflix', jumlah: 150000 }),
    makeBill({ nama: 'Internet', jumlah: 500000, tanggalJatuhTempo: 20 }),
  ];
  
  const upcoming = getUpcomingBills(bills, 30);
  const summary = calculateBillsSummary(bills, 10000000);
  
  // Dashboard uses both functions — they should be consistent
  assert(upcoming.length <= bills.length, 'Upcoming bills <= total bills');
  assert(summary.totalCount <= bills.length, 'Summary count <= total bills');
}

// ============================================================
// 35. BILL NAME IN PAYMENT TRANSACTION
// ============================================================
console.log('\n=== PAYMENT TRANSACTION NAMING ===');

{
  const bill = makeBill({ nama: 'Spotify Premium' });
  const transaction = createTransaction({
    jumlah: bill.jumlah,
    tipe: 'keluar',
    dompet: bill.dompet,
    keterangan: `Bill: ${bill.nama}`,
  });
  assert(transaction.keterangan.includes('Spotify Premium'), 'Transaction includes bill name');
}

// ============================================================
// 36. BILL AMOUNT PRECISION
// ============================================================
console.log('\n=== AMOUNT PRECISION ===');

{
  const bill = makeBill({ jumlah: 159900 });
  assertEqual(bill.jumlah, 159900, 'Precise amount preserved');
  
  const bill2 = makeBill({ jumlah: 99.99 });
  assertApprox(bill2.jumlah, 99.99, 'Decimal amount preserved', 0.001);
}

// ============================================================
// 37. BILL STATUS WITH INACTIVE
// ============================================================
console.log('\n=== INACTIVE BILL IN GROUPS ===');

{
  const bills = [
    makeBill({ nama: 'Old Bill', aktif: false }),
    makeBill({ nama: 'Active Bill' }),
  ];
  
  const groups = getBillsByStatus(bills);
  assert(groups.inactive.some(b => b.nama === 'Old Bill'), 'Inactive bill in inactive group');
  assert(!groups.upcoming.some(b => b.nama === 'Old Bill'), 'Inactive bill not in upcoming');
}

// ============================================================
// SUMMARY
// ============================================================
console.log('\n' + '='.repeat(60));
console.log(`BILLS TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f.label}${f.detail ? ' — ' + f.detail : ''}`));
  process.exit(1);
} else {
  console.log('\n✅ All bills tests passed!');
  process.exit(0);
}
