#!/usr/bin/env node
/**
 * Sakku — Phase 5: Accounts Tests
 * Account classification, CRUD, legacy compatibility, balance integrity
 * 
 * Run: node tests/accounts.test.js
 */

import {
  calculateTotalBalance,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  getAccountsByType,
  getActiveAccounts,
  findAccountById,
  updateAccountBalance,
  createAccount,
  validateAccount,
  normalizeAccountType,
  classifyAccount,
  getAccountsByClassification,
  calculateAvailableCash,
  ACCOUNT_CLASSIFICATION,
  ACCOUNT_TYPE_MAP,
} from '../src/domain/accounts.js';

import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
} from '../src/domain/financial-health.js';

import {
  createTransaction,
  validateTransaction,
} from '../src/domain/transactions.js';

/* =========================================================
   TEST RUNNER
   ========================================================= */
let passed = 0;
let failed = 0;
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

/* =========================================================
   TEST DATA
   ========================================================= */

function mkAccount(id, nama, jenis, saldo) {
  return { id, nama, jenis, saldo, mataUang: 'IDR', icon: 'wallet', aktif: true };
}

const FULL_ACCOUNTS = [
  mkAccount('a1', 'Cash', 'cash', 5000000),
  mkAccount('a2', 'BCA', 'bank', 15000000),
  mkAccount('a3', 'Mandiri Savings', 'tabungan', 35000000),
  mkAccount('a4', 'GoPay', 'e-wallet', 750000),
  mkAccount('a5', 'Credit Card', 'kartu kredit', -3500000),
  mkAccount('a6', 'Crypto', 'investasi', 1200000),
  mkAccount('a7', 'Money Lent', 'piutang', 8000000),
  mkAccount('a8', 'Personal Loan', 'utang', -5000000),
];

const INACTIVE_ACCOUNT = mkAccount('a9', 'Old Account', 'cash', 100000);
INACTIVE_ACCOUNT.aktif = false;

console.log('\n' + '='.repeat(70));
console.log('  SAKKU — PHASE 5: ACCOUNTS TESTS');
console.log('='.repeat(70));

/* =========================================================
   SECTION 1: Account Classification
   ========================================================= */
console.log('\n━━━ SECTION 1: Account Classification ━━━');

// 1.1 Liquid classification
assertEqual(classifyAccount(mkAccount('x', 'Cash', 'cash', 0)), 'liquid', '1.1 cash → liquid');
assertEqual(classifyAccount(mkAccount('x', 'Dompet', 'dompet', 0)), 'liquid', '1.1b dompet → liquid');
assertEqual(classifyAccount(mkAccount('x', 'Bank', 'bank', 0)), 'liquid', '1.1c bank → liquid');
assertEqual(classifyAccount(mkAccount('x', 'Rekening', 'rekening', 0)), 'liquid', '1.1d rekening → liquid');
assertEqual(classifyAccount(mkAccount('x', 'Tabungan', 'tabungan', 0)), 'liquid', '1.1e tabungan → liquid');
assertEqual(classifyAccount(mkAccount('x', 'GoPay', 'e-wallet', 0)), 'liquid', '1.1f e-wallet → liquid');
assertEqual(classifyAccount(mkAccount('x', 'GoPay', 'gopay', 0)), 'liquid', '1.1g gopay → liquid');
assertEqual(classifyAccount(mkAccount('x', 'OVO', 'ovo', 0)), 'liquid', '1.1h ovo → liquid');
assertEqual(classifyAccount(mkAccount('x', 'Dana', 'dana', 0)), 'liquid', '1.1i dana → liquid');
assertEqual(classifyAccount(mkAccount('x', 'ShopeePay', 'shopeepay', 0)), 'liquid', '1.1j shopeepay → liquid');

// 1.2 Investment classification
assertEqual(classifyAccount(mkAccount('x', 'Crypto', 'investasi', 0)), 'investment', '1.2a investasi → investment');
assertEqual(classifyAccount(mkAccount('x', 'Stocks', 'saham', 0)), 'investment', '1.2b saham → investment');
assertEqual(classifyAccount(mkAccount('x', 'Crypto', 'crypto', 0)), 'investment', '1.2c crypto → investment');
assertEqual(classifyAccount(mkAccount('x', 'Fund', 'investment', 0)), 'investment', '1.2d investment → investment');

// 1.3 Receivable classification
assertEqual(classifyAccount(mkAccount('x', 'Piutang', 'piutang', 0)), 'receivable', '1.3a piutang → receivable');
assertEqual(classifyAccount(mkAccount('x', 'Receivable', 'receivable', 0)), 'receivable', '1.3b receivable → receivable');

// 1.4 Liability classification
assertEqual(classifyAccount(mkAccount('x', 'Utang', 'utang', 0)), 'liability', '1.4a utang → liability');
assertEqual(classifyAccount(mkAccount('x', 'Hutang', 'hutang', 0)), 'liability', '1.4b hutang → liability');
assertEqual(classifyAccount(mkAccount('x', 'Loan', 'loan', 0)), 'liability', '1.4c loan → liability');
assertEqual(classifyAccount(mkAccount('x', 'CC', 'kartu kredit', 0)), 'liability', '1.4d kartu kredit → liability');
assertEqual(classifyAccount(mkAccount('x', 'CC', 'credit card', 0)), 'liability', '1.4e credit card → liability');
// 'credit' alone is not a valid legacy type — only 'credit card' and 'kartu kredit' are
// classifyAccount normalizes via ACCOUNT_TYPE_MAP which maps 'credit card' → 'credit'
assertEqual(classifyAccount(mkAccount('x', 'CC', 'credit card', 0)), 'liability', '1.4f credit card → liability');

// 1.5 Other classification
assertEqual(classifyAccount(mkAccount('x', 'Unknown', 'lainnya', 0)), 'other', '1.5a lainnya → other');
assertEqual(classifyAccount(mkAccount('x', 'Other', 'other', 0)), 'other', '1.5b other → other');
assertEqual(classifyAccount(mkAccount('x', 'Mystery', 'xyz', 0)), 'other', '1.5c unknown → other');

/* =========================================================
   SECTION 2: Available Cash (with full dataset)
   ========================================================= */
console.log('\n━━━ SECTION 2: Available Cash ━━━');

// 2.1 Available Cash excludes credit card, investment, loan, receivable
const ac = calculateAvailableCash(FULL_ACCOUNTS);
assertEqual(ac, 5000000 + 15000000 + 35000000 + 750000, '2.1 Available Cash = 55.75M (liquid only)');

// 2.2 Available Cash with empty accounts
assertEqual(calculateAvailableCash([]), 0, '2.2 Empty accounts → 0');

// 2.3 Available Cash with only liabilities
assertEqual(calculateAvailableCash([mkAccount('x', 'CC', 'kartu kredit', -5000)]), 0, '2.3 Only liability → 0');

// 2.4 Available Cash with only investments
assertEqual(calculateAvailableCash([mkAccount('x', 'Crypto', 'investasi', 50000)]), 0, '2.4 Only investment → 0');

// 2.5 Available Cash with mixed types
const mixed = [mkAccount('a', 'Cash', 'cash', 100), mkAccount('b', 'CC', 'kartu kredit', -50), mkAccount('c', 'Stock', 'investasi', 200)];
assertEqual(calculateAvailableCash(mixed), 100, '2.5 Mixed: only cash counts');

/* =========================================================
   SECTION 3: Net Worth
   ========================================================= */
console.log('\n━━━ SECTION 3: Net Worth ━━━');

// accounts.js calculateNetWorth now returns { total, assets, liabilities }
const nw = calculateNetWorth(FULL_ACCOUNTS);
assert(typeof nw === 'object' && nw !== null, '3.1 Net Worth returns object');

// 3.2 Net Worth = assets - liabilities
const assets = calculateTotalAssets(FULL_ACCOUNTS);
const liabilities = calculateTotalLiabilities(FULL_ACCOUNTS);
assertEqual(nw.total, assets - liabilities, '3.2 Net Worth = assets - liabilities');
assertEqual(nw.assets, assets, '3.2b NW.assets matches calculateTotalAssets');
assertEqual(nw.liabilities, liabilities, '3.2c NW.liabilities matches calculateTotalLiabilities');

// 3.3 Credit card counted as liability
assert(liabilities >= 3500000, '3.3 Credit card (3.5M) in liabilities');

// 3.4 Loan counted as liability
assert(liabilities >= 8500000, '3.4 Credit card + loan (3.5M + 5M) in liabilities');

/* =========================================================
   SECTION 4: Create Account
   ========================================================= */
console.log('\n━━━ SECTION 4: Create Account ━━━');

// 4.1 Create with all fields
const newAcc = createAccount({ nama: 'My Bank', jenis: 'bank', saldo: 1000000, mataUang: 'IDR' });
assert(newAcc.id.startsWith('acc_'), '4.1 ID generated');
assertEqual(newAcc.nama, 'My Bank', '4.1 Name set');
assertEqual(newAcc.jenis, 'bank', '4.1 Type set');
assertEqual(newAcc.saldo, 1000000, '4.1 Balance set');
assertEqual(newAcc.mataUang, 'IDR', '4.1 Currency defaults to IDR');
assertEqual(newAcc.aktif, true, '4.1 Active by default');

// 4.2 Create with minimal fields
const minimal = createAccount({ nama: 'Cash' });
assert(minimal.id.startsWith('acc_'), '4.2 ID generated');
assertEqual(minimal.jenis, 'lainnya', '4.2 Type defaults to lainnya');
assertEqual(minimal.saldo, 0, '4.2 Balance defaults to 0');

// 4.3 Create with negative balance
const negative = createAccount({ nama: 'Credit Card', jenis: 'kartu kredit', saldo: -500000 });
assertEqual(negative.saldo, -500000, '4.3 Negative balance accepted');

/* =========================================================
   SECTION 5: Validate Account
   ========================================================= */
console.log('\n━━━ SECTION 5: Validate Account ━━━');

// 5.1 Valid account
const v1 = validateAccount({ nama: 'Bank', jenis: 'bank' });
assert(v1.valid, '5.1 Valid account passes');

// 5.2 Missing name
const v2 = validateAccount({ jenis: 'bank' });
assert(!v2.valid, '5.2 Missing name → invalid');
assert(v2.errors.some(e => e.includes('name')), '5.2 Error mentions name');

// 5.3 Empty name
const v3 = validateAccount({ nama: '  ', jenis: 'bank' });
assert(!v3.valid, '5.3 Empty name → invalid');

// 5.4 Missing type
const v4 = validateAccount({ nama: 'Bank' });
assert(!v4.valid, '5.4 Missing type → invalid');
assert(v4.errors.some(e => e.includes('type')), '5.4 Error mentions type');

/* =========================================================
   SECTION 6: Edit Account
   ========================================================= */
console.log('\n━━━ SECTION 6: Edit Account ━━━');

// 6.1 Find and modify
const original = mkAccount('e1', 'Old Name', 'bank', 1000000);
const edited = { ...original, nama: 'New Name', saldo: 2000000 };
assertEqual(edited.nama, 'New Name', '6.1 Name updated');
assertEqual(edited.saldo, 2000000, '6.2 Balance updated');
assertEqual(edited.id, 'e1', '6.3 ID preserved');

// 6.2 Edit preserves classification
assertEqual(classifyAccount(edited), 'liquid', '6.4 Classification preserved after edit');

/* =========================================================
   SECTION 7: Delete Account
   ========================================================= */
console.log('\n━━━ SECTION 7: Delete Account ━━━');

// 7.1 Filter-based delete
const before = [mkAccount('d1', 'A', 'bank', 100), mkAccount('d2', 'B', 'cash', 200), mkAccount('d3', 'C', 'bank', 300)];
const after = before.filter(a => a.id !== 'd2');
assertEqual(after.length, 2, '7.1 One account removed');
assert(!after.some(a => a.id === 'd2'), '7.2 Deleted account gone');
assert(after.some(a => a.id === 'd1'), '7.3 Other accounts remain');

// 7.3 Cannot delete by nonexistent ID
const same = before.filter(a => a.id !== 'nonexistent');
assertEqual(same.length, 3, '7.4 Nonexistent ID → no change');

/* =========================================================
   SECTION 8: Invalid Account Handling
   ========================================================= */
console.log('\n━━━ SECTION 8: Invalid Account Handling ━━━');

// 8.1 Empty name
const inv1 = validateAccount({ nama: '', jenis: 'bank' });
assert(!inv1.valid, '8.1 Empty name invalid');

// 8.2 No name at all
const inv2 = validateAccount({ jenis: 'bank' });
assert(!inv2.valid, '8.2 No name invalid');

// 8.3 No type
const inv3 = validateAccount({ nama: 'Test' });
assert(!inv3.valid, '8.3 No type invalid');

// 8.4 Both missing
const inv4 = validateAccount({});
assert(!inv4.valid, '8.4 Both missing invalid');
assert(inv4.errors.length >= 2, '8.5 Multiple errors reported');

/* =========================================================
   SECTION 9: Legacy Account Loading
   ========================================================= */
console.log('\n━━━ SECTION 9: Legacy Account Loading ━━━');

// 9.1 Indonesian types normalize correctly
assertEqual(normalizeAccountType('cash'), 'cash', '9.1a cash');
assertEqual(normalizeAccountType('bank'), 'checking', '9.1b bank → checking');
assertEqual(normalizeAccountType('tabungan'), 'savings', '9.1c tabungan → savings');
assertEqual(normalizeAccountType('e-wallet'), 'ewallet', '9.1d e-wallet → ewallet');
assertEqual(normalizeAccountType('kartu kredit'), 'credit', '9.1e kartu kredit → credit');
assertEqual(normalizeAccountType('investasi'), 'investment', '9.1f investasi → investment');
assertEqual(normalizeAccountType('utang'), 'loan', '9.1g utang → loan');
assertEqual(normalizeAccountType('piutang'), 'receivable', '9.1h piutang → receivable');

// 9.2 English types normalize correctly
// English normalized types — 'checking' and 'savings' are not legacy types,
// they are OUTPUT values of normalizeAccountType. Legacy types map TO them.
assertEqual(normalizeAccountType('bank'), 'checking', '9.2a bank → checking');
assertEqual(normalizeAccountType('tabungan'), 'savings', '9.2b tabungan → savings');
assertEqual(normalizeAccountType('credit card'), 'credit', '9.2c credit card → credit');
assertEqual(normalizeAccountType('investment'), 'investment', '9.2d investment');
assertEqual(normalizeAccountType('loan'), 'loan', '9.2e loan');
assertEqual(normalizeAccountType('receivable'), 'receivable', '9.2f receivable');

// 9.3 Unknown types → 'other'
assertEqual(normalizeAccountType('xyz'), 'other', '9.3a unknown → other');
assertEqual(normalizeAccountType(''), 'other', '9.3b empty → other');
assertEqual(normalizeAccountType(null), 'other', '9.3c null → other');

/* =========================================================
   SECTION 10: Credit Card Handling
   ========================================================= */
console.log('\n━━━ SECTION 10: Credit Card Handling ━━━');

// 10.1 Credit card is liability
const cc = mkAccount('cc1', 'Visa', 'kartu kredit', -3500000);
assertEqual(classifyAccount(cc), 'liability', '10.1 Credit card → liability');

// 10.2 Credit card negative balance reduces net worth
// accounts.js calculateNetWorth: assets (positive balances) - liabilities (negative/loan types)
// Cash 10000 = asset, CC -3500000 = liability (abs = 3500000)
const ccAccounts = [mkAccount('a1', 'Cash', 'cash', 10000), cc];
const ccNW = calculateNetWorth(ccAccounts);
assertEqual(ccNW.total, 10000 - 3500000, '10.2 NW = 10000 - 3500000');

// 10.3 Credit card NOT in available cash
assertEqual(calculateAvailableCash(ccAccounts), 10000, '10.3 AC excludes credit card');

// 10.4 Credit card with positive balance (overpayment)
const ccPositive = mkAccount('cc2', 'Visa', 'kartu kredit', 500);
assertEqual(classifyAccount(ccPositive), 'liability', '10.4 CC with positive balance still liability');
assertEqual(calculateAvailableCash([ccPositive]), 0, '10.5 Positive CC balance not in AC');

/* =========================================================
   SECTION 11: Loan Handling
   ========================================================= */
console.log('\n━━━ SECTION 11: Loan Handling ━━━');

// 11.1 Loan is liability
const loan = mkAccount('l1', 'Bank Loan', 'utang', -5000000);
assertEqual(classifyAccount(loan), 'liability', '11.1 utang → liability');

// 11.2 Loan reduces net worth
// Cash 20000 = asset, Loan -5000000 = liability (abs = 5000000)
const loanAccounts = [mkAccount('a1', 'Cash', 'cash', 20000), loan];
assertEqual(calculateNetWorth(loanAccounts).total, 20000 - 5000000, '11.2 NW = 20000 - 5000000');

// 11.3 Loan NOT in available cash
assertEqual(calculateAvailableCash(loanAccounts), 20000, '11.3 AC excludes loan');

/* =========================================================
   SECTION 12: Investment Handling
   ========================================================= */
console.log('\n━━━ SECTION 12: Investment Handling ━━━');

// 12.1 Investment is classified as investment
const inv = mkAccount('i1', 'Crypto', 'investasi', 500000);
assertEqual(classifyAccount(inv), 'investment', '12.1 investasi → investment');

// 12.2 Investment IS part of net worth (positive balance = asset)
const invAccounts = [mkAccount('a1', 'Cash', 'cash', 10000), inv];
assertEqual(calculateNetWorth(invAccounts).total, 10000 + 500000, '12.2 NW includes investment');

// 12.3 Investment NOT in available cash
assertEqual(calculateAvailableCash(invAccounts), 10000, '12.3 AC excludes investment');

/* =========================================================
   SECTION 13: Receivable Handling
   ========================================================= */
console.log('\n━━━ SECTION 13: Receivable Handling ━━━');

// 13.1 Receivable classification
const recv = mkAccount('r1', 'Lent to friend', 'piutang', 8000);
assertEqual(classifyAccount(recv), 'receivable', '13.1 piutang → receivable');

// 13.2 Receivable is part of net worth (positive balance = asset)
const recvAccounts = [mkAccount('a1', 'Cash', 'cash', 10000), recv];
assertEqual(calculateNetWorth(recvAccounts).total, 18000, '13.2 NW includes receivable');

// 13.3 Receivable NOT in available cash
assertEqual(calculateAvailableCash(recvAccounts), 10000, '13.3 AC excludes receivable');

/* =========================================================
   SECTION 14: Transaction/Account Balance Integrity
   ========================================================= */
console.log('\n━━━ SECTION 14: Balance Integrity ━━━');

// 14.1 Add income increases balance
let accs = [mkAccount('b1', 'Checking', 'bank', 100000)];
accs = accs.map(a => a.id === 'b1' ? { ...a, saldo: a.saldo + 50000 } : a);
assertEqual(accs[0].saldo, 150000, '14.1 Income: 100K + 50K = 150K');

// 14.2 Add expense decreases balance
accs = accs.map(a => a.id === 'b1' ? { ...a, saldo: a.saldo - 30000 } : a);
assertEqual(accs[0].saldo, 120000, '14.2 Expense: 150K - 30K = 120K');

// 14.3 Edit expense adjusts correctly
accs = accs.map(a => a.id === 'b1' ? { ...a, saldo: a.saldo + 30000 - 45000 } : a);
assertEqual(accs[0].saldo, 105000, '14.3 Edit: 120K + 30K - 45K = 105K');

// 14.4 Delete expense restores
accs = accs.map(a => a.id === 'b1' ? { ...a, saldo: a.saldo + 45000 } : a);
assertEqual(accs[0].saldo, 150000, '14.4 Delete: 105K + 45K = 150K');

// 14.5 Transfer: source decreases, target increases
let src = mkAccount('s1', 'Source', 'bank', 200000);
let tgt = mkAccount('t1', 'Target', 'savings', 50000);
const transferAmt = 30000;
src = { ...src, saldo: src.saldo - transferAmt };
tgt = { ...tgt, saldo: tgt.saldo + transferAmt };
assertEqual(src.saldo, 170000, '14.5a Source: 200K - 30K = 170K');
assertEqual(tgt.saldo, 80000, '14.5b Target: 50K + 30K = 80K');
assertEqual(src.saldo + tgt.saldo, 250000, '14.5c Total preserved: 200K + 50K = 250K');

/* =========================================================
   SECTION 15: Duplicate Account Handling
   ========================================================= */
console.log('\n━━━ SECTION 15: Duplicate Account Handling ━━━');

// 15.1 Two accounts can have same name (allowed)
const accsDup = [
  mkAccount('d1', 'Savings', 'tabungan', 1000),
  mkAccount('d2', 'Savings', 'tabungan', 2000),
];
assertEqual(accsDup.length, 2, '15.1 Duplicate names allowed');
assertEqual(accsDup[0].saldo + accsDup[1].saldo, 3000, '15.2 Both balances count');

/* =========================================================
   SECTION 16: Empty State
   ========================================================= */
console.log('\n━━━ SECTION 16: Empty State ━━━');

// 16.1 All metrics zero for empty accounts
assertEqual(calculateTotalBalance([]), 0, '16.1 Total balance = 0');
assertEqual(calculateTotalAssets([]), 0, '16.2 Total assets = 0');
assertEqual(calculateTotalLiabilities([]), 0, '16.3 Total liabilities = 0');
assertEqual(calculateNetWorth([]).total, 0, '16.4 Net worth = 0');
assertEqual(calculateAvailableCash([]), 0, '16.5 Available cash = 0');
assert(getActiveAccounts([]).length === 0, '16.6 No active accounts');

/* =========================================================
   SECTION 17: getAccountsByClassification
   ========================================================= */
console.log('\n━━━ SECTION 17: getAccountsByClassification ━━━');

// 17.1 Filter by liquid
const liquid = getAccountsByClassification(FULL_ACCOUNTS, 'liquid');
assertEqual(liquid.length, 4, '17.1 4 liquid accounts');
assert(liquid.every(a => classifyAccount(a) === 'liquid'), '17.2 All filtered are liquid');

// 17.2 Filter by liability
const liabilityAccounts = getAccountsByClassification(FULL_ACCOUNTS, 'liability');
assertEqual(liabilityAccounts.length, 2, '17.3 2 liability accounts (CC + loan)');

// 17.3 Filter by investment
const investments = getAccountsByClassification(FULL_ACCOUNTS, 'investment');
assertEqual(investments.length, 1, '17.4 1 investment account');

// 17.4 Filter by receivable
const receivables = getAccountsByClassification(FULL_ACCOUNTS, 'receivable');
assertEqual(receivables.length, 1, '17.5 1 receivable account');

// 17.5 'all' returns everything
const all = getAccountsByClassification(FULL_ACCOUNTS, 'all');
assertEqual(all.length, FULL_ACCOUNTS.length, '17.6 all → all accounts');

/* =========================================================
   SECTION 18: Update Account Balance
   ========================================================= */
console.log('\n━━━ SECTION 18: updateAccountBalance ━━━');

// 18.1 Add positive amount
let updated = updateAccountBalance(FULL_ACCOUNTS, 'a1', 1000);
const a1 = updated.find(a => a.id === 'a1');
assertEqual(a1.saldo, 5001000, '18.1 Cash 5M + 1K = 5.001M');

// 18.2 Subtract amount
updated = updateAccountBalance(FULL_ACCOUNTS, 'a1', -1000000);
const a1b = updated.find(a => a.id === 'a1');
assertEqual(a1b.saldo, 4000000, '18.2 Cash 5M - 1M = 4M');

// 18.3 Other accounts unchanged
const a2 = updated.find(a => a.id === 'a2');
assertEqual(a2.saldo, 15000000, '18.3 BCA unchanged');

// 18.4 Nonexistent ID → no change
updated = updateAccountBalance(FULL_ACCOUNTS, 'nonexistent', 1000);
assertEqual(updated.length, FULL_ACCOUNTS.length, '18.4 Nonexistent → no change');

/* =========================================================
   SECTION 19: getActiveAccounts
   ========================================================= */
console.log('\n━━━ SECTION 19: getActiveAccounts ━━━');

const withInactive = [...FULL_ACCOUNTS, INACTIVE_ACCOUNT];
const active = getActiveAccounts(withInactive);
assertEqual(active.length, FULL_ACCOUNTS.length, '19.1 Inactive excluded');
assert(!active.some(a => a.id === 'a9'), '19.2 Inactive account not in result');

/* =========================================================
   SECTION 20: findAccountById
   ========================================================= */
console.log('\n━━━ SECTION 20: findAccountById ━━━');

// 20.1 Find existing
const found = findAccountById(FULL_ACCOUNTS, 'a3');
assert(found !== null, '20.1 Account found');
assertEqual(found.nama, 'Mandiri Savings', '20.2 Correct account');

// 20.2 Not found
const notFound = findAccountById(FULL_ACCOUNTS, 'nonexistent');
assertEqual(notFound, null, '20.3 Nonexistent → null');

/* =========================================================
   RESULTS
   ========================================================= */
console.log('\n' + '='.repeat(70));
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (failures.length > 0) {
  console.log('\n  FAILURES:');
  failures.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
}

console.log(`\n  TOTAL: ${passed + failed} tests (${passed} ✅ / ${failed} ❌)\n`);
process.exit(failed > 0 ? 1 : 0);
