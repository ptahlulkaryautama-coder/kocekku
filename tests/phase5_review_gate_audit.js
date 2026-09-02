#!/usr/bin/env node
/**
 * Sakku — Phase 5 Independent Review Gate Audit
 * Formulas, Transaction Integrity, CRUD, Legacy, i18n
 */

import {
  calculateTotalBalance,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth as calculateNetWorth_accounts,
  classifyAccount,
  getAccountsByClassification,
  calculateAvailableCash,
  createAccount,
  validateAccount,
  normalizeAccountType,
  updateAccountBalance,
} from '../src/domain/accounts.js';

import {
  calculateNetWorth as calculateNetWorth_health,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateEmergencyFundCoverage,
} from '../src/domain/financial-health.js';

import {
  createTransaction,
  validateTransaction,
} from '../src/domain/transactions.js';

let passed = 0;
let failed = 0;
const findings = [];

function assert(condition, testName, details = '') {
  if (condition) { passed++; console.log(`  ✅ PASS: ${testName}`); }
  else { failed++; const msg = details ? `${testName} — ${details}` : testName; findings.push(msg); console.log(`  ❌ FAIL: ${msg}`); }
}
function assertEqual(a, b, t) { assert(a === b, t, `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

function mkAcc(id, nama, jenis, saldo) { return { id, nama, jenis, saldo, mataUang: 'IDR', icon: 'wallet', aktif: true }; }
function mkTxn(id, tipe, jumlah, dompet, kategori = 'General') {
  const now = new Date();
  return { id, tipe, jumlah, dompet, kategori, tanggal: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-15`, keterangan: 'test', pengeluar: '', catatan: '' };
}

console.log('\n' + '='.repeat(70));
console.log('  PHASE 5 REVIEW GATE — INDEPENDENT AUDIT');
console.log('='.repeat(70));

/* =========================================================
   1. FINANCIAL FORMULA AUDIT
   ========================================================= */
console.log('\n━━━ 1. Financial Formula Audit ━━━');

// Standard test case from spec
const auditAccounts = [
  mkAcc('a1', 'Checking', 'bank', 10000000),
  mkAcc('a2', 'Savings', 'tabungan', 20000000),
  mkAcc('a3', 'Credit Card', 'kartu kredit', -3500000),
  mkAcc('a4', 'Investment', 'investasi', 10000000),
  mkAcc('a5', 'Receivable', 'piutang', 5000000),
  mkAcc('a6', 'Loan', 'utang', -4000000),
];

// Available Cash
const ac = calculateAvailableCash(auditAccounts);
assertEqual(ac, 30000000, 'F1: Available Cash = 30M (liquid: checking 10M + savings 20M)');

// Total Assets (accounts.js — uses balance sign)
const assets_acc = calculateTotalAssets(auditAccounts);
assertEqual(assets_acc, 45000000, 'F2: Total Assets (accounts.js) = 45M');

// Total Liabilities (accounts.js — uses balance sign + partial type check)
const liab_acc = calculateTotalLiabilities(auditAccounts);
assertEqual(liab_acc, 7500000, 'F3: Total Liabilities (accounts.js) = 7.5M');

// Net Worth (accounts.js)
const nw_acc = calculateNetWorth_accounts(auditAccounts);
assertEqual(nw_acc.total, 37500000, 'F4: Net Worth (accounts.js) = 37.5M');

// Net Worth (financial-health.js — returns object)
const nw_fh = calculateNetWorth_health(auditAccounts);
assertEqual(nw_fh.total, 37500000, 'F5: Net Worth (financial-health.js) = 37.5M');
assertEqual(nw_fh.assets, 45000000, 'F6: Assets (financial-health.js) = 45M');
assertEqual(nw_fh.liabilities, 7500000, 'F7: Liabilities (financial-health.js) = 7.5M');

// Verify consistency: assets.js NW == financial-health.js NW
assertEqual(nw_acc.total, nw_fh.total, 'F8: accounts.js NW == financial-health.js NW');
assertEqual(nw_acc.assets, nw_fh.assets, 'F8b: assets consistent');
assertEqual(nw_acc.liabilities, nw_fh.liabilities, 'F8c: liabilities consistent');

/* =========================================================
   1B. EDGE CASE — Inconsistency Detection
   ========================================================= */
console.log('\n━━━ 1B. Inconsistency Edge Cases ━━━');

// Loan with zero balance and 'hutang' type
const edgeCase1 = [mkAcc('a1', 'Cash', 'bank', 10000), mkAcc('a2', 'Hutang', 'hutang', 0)];
const nw1_acc = calculateNetWorth_accounts(edgeCase1);
const nw1_fh = calculateNetWorth_health(edgeCase1);
// Both now use classifyAccount(). hutang → liability, abs(0) = 0.
// Assets = 10000, Liabilities = 0, NW = 10000.
assertEqual(nw1_acc.total, nw1_fh.total, 'F9: Zero-balance hutang NW consistent');
assertEqual(nw1_acc.total, 10000, 'F9b: NW = 10000 (hutang has zero balance)');

// Loan with positive balance (overpayment)
const edgeCase2 = [mkAcc('a1', 'Cash', 'bank', 10000), mkAcc('a2', 'Hutang', 'hutang', 5000)];
const nw2_acc = calculateNetWorth_accounts(edgeCase2);
const nw2_fh = calculateNetWorth_health(edgeCase2);
// After fix: both use classifyAccount(). hutang → liability.
// Assets = 10000 (cash only), Liabilities = abs(5000) = 5000, NW = 5000.
// Positive-balance loan is correctly treated as liability (overpayment, not wealth).
assertEqual(nw2_acc.total, nw2_fh.total, 'F10: Positive-balance loan NW consistent between modules');
assertEqual(nw2_acc.total, 5000, 'F10b: NW = 5000 (loan overpayment is liability, not asset)');
assertEqual(nw2_acc.assets, 10000, 'F10c: Assets = 10000 (only cash, not the loan)');
assertEqual(nw2_acc.liabilities, 5000, 'F10d: Liabilities = 5000 (loan is liability even with positive balance)');

// Credit card with zero balance
const edgeCase3 = [mkAcc('a1', 'Cash', 'bank', 10000), mkAcc('a2', 'CC', 'kartu kredit', 0)];
const liab3 = calculateTotalLiabilities(edgeCase3);
// After fix: classifyAccount → 'liability' for kartu kredit. abs(0) = 0.
// Zero-balance CC is correctly classified as liability type, with zero debt.
assertEqual(liab3, 0, 'F11: Zero-balance CC → liability type, zero debt (correct)');
const nw3 = calculateNetWorth_accounts(edgeCase3);
assertEqual(nw3.total, 10000, 'F11b: NW = 10000 (CC has no debt)');

// Credit card with positive balance (overpayment)
const edgeCase4 = [mkAcc('a1', 'Cash', 'bank', 10000), mkAcc('a2', 'CC', 'kartu kredit', 2000)];
const assets4 = calculateTotalAssets(edgeCase4);
const liab4 = calculateTotalLiabilities(edgeCase4);
// After fix: classifyAccount → 'liability' for kartu kredit.
// Assets = 10000 (only cash), Liabilities = abs(2000) = 2000 (CC is liability even with positive balance)
assertEqual(assets4, 10000, 'F12: Positive-balance CC NOT in assets (correct)');
assertEqual(liab4, 2000, 'F12b: Positive-balance CC IS in liabilities (correct)');
const nw4 = calculateNetWorth_accounts(edgeCase4);
assertEqual(nw4.total, 8000, 'F12c: NW = 10000 - 2000 = 8000');

/* =========================================================
   2. TRANSACTION / ACCOUNT INTEGRITY
   ========================================================= */
console.log('\n━━━ 2. Transaction / Account Integrity ━━━');

// Base: Checking 100K, Savings 50K
let accounts = [mkAcc('ch', 'Checking', 'bank', 100000), mkAcc('sv', 'Savings', 'tabungan', 50000)];
const baseAC = calculateAvailableCash(accounts);
assertEqual(baseAC, 150000, 'T0: Base available cash = 150K');

// A. Expense from bank: 10K
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo - 10000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 90000, 'TA: Expense from bank: 100K - 10K = 90K');
assertEqual(calculateAvailableCash(accounts), 140000, 'TA: AC after expense = 140K');

// B. Income into bank: 25K
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo + 25000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 115000, 'TB: Income into bank: 90K + 25K = 115K');
assertEqual(calculateAvailableCash(accounts), 165000, 'TB: AC after income = 165K');

// C. Transfer bank → savings: 20K
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo - 20000 } : a);
accounts = accounts.map(a => a.id === 'sv' ? { ...a, saldo: a.saldo + 20000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 95000, 'TC: Source: 115K - 20K = 95K');
assertEqual(accounts.find(a => a.id === 'sv').saldo, 70000, 'TC: Target: 50K + 20K = 70K');
assertEqual(calculateAvailableCash(accounts), 165000, 'TC: AC preserved after transfer = 165K');

// D. Credit card purchase: 8K
accounts = [...accounts, mkAcc('cc', 'CC', 'kartu kredit', -8000)];
const ccAcc = accounts.find(a => a.id === 'cc');
assertEqual(ccAcc.saldo, -8000, 'TD: CC balance = -8K');
assertEqual(calculateAvailableCash(accounts), 165000, 'TD: AC unchanged = 165K (CC excluded)');

// E. Credit card payment: 5K (from checking)
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo - 5000 } : a);
accounts = accounts.map(a => a.id === 'cc' ? { ...a, saldo: a.saldo + 5000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 90000, 'TE: Checking: 95K - 5K = 90K');
assertEqual(accounts.find(a => a.id === 'cc').saldo, -3000, 'TE: CC: -8K + 5K = -3K');
// CC payment reduces available cash (money left checking)
assertEqual(calculateAvailableCash(accounts), 160000, 'TE: AC = 160K (5K left checking)');

// F. Loan received: 50K into checking
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo + 50000 } : a);
accounts = [...accounts, mkAcc('ln', 'Loan', 'utang', -50000)];
assertEqual(accounts.find(a => a.id === 'ch').saldo, 140000, 'TF: Checking: 90K + 50K = 140K');
assertEqual(accounts.find(a => a.id === 'ln').saldo, -50000, 'TF: Loan balance = -50K');
// Loan increases available cash (received money)
assertEqual(calculateAvailableCash(accounts), 210000, 'TF: AC = 210K (received 50K)');

// G. Loan repayment: 10K from checking
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo - 10000 } : a);
accounts = accounts.map(a => a.id === 'ln' ? { ...a, saldo: a.saldo + 10000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 130000, 'TG: Checking: 140K - 10K = 130K');
assertEqual(accounts.find(a => a.id === 'ln').saldo, -40000, 'TG: Loan: -50K + 10K = -40K');
assertEqual(calculateAvailableCash(accounts), 200000, 'TG: AC = 200K (10K left checking)');

// H. Investment contribution: 15K from checking
accounts = [...accounts, mkAcc('inv', 'Investment', 'investasi', 0)];
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo - 15000 } : a);
accounts = accounts.map(a => a.id === 'inv' ? { ...a, saldo: a.saldo + 15000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 115000, 'TH: Checking: 130K - 15K = 115K');
assertEqual(accounts.find(a => a.id === 'inv').saldo, 15000, 'TH: Investment = 15K');
// Investment reduces available cash
assertEqual(calculateAvailableCash(accounts), 185000, 'TH: AC = 185K (15K moved to investment)');

// I. Investment withdrawal: 5K back to checking
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo + 5000 } : a);
accounts = accounts.map(a => a.id === 'inv' ? { ...a, saldo: a.saldo - 5000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 120000, 'TI: Checking: 115K + 5K = 120K');
assertEqual(accounts.find(a => a.id === 'inv').saldo, 10000, 'TI: Investment: 15K - 5K = 10K');
assertEqual(calculateAvailableCash(accounts), 190000, 'TI: AC = 190K (5K returned to checking)');

// J. Receivable creation: lent 8K (money leaves checking)
accounts = [...accounts, mkAcc('rc', 'Receivable', 'piutang', 0)];
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo - 8000 } : a);
accounts = accounts.map(a => a.id === 'rc' ? { ...a, saldo: a.saldo + 8000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 112000, 'TJ: Checking: 120K - 8K = 112K');
assertEqual(accounts.find(a => a.id === 'rc').saldo, 8000, 'TJ: Receivable = 8K');
// Receivable reduces available cash
assertEqual(calculateAvailableCash(accounts), 182000, 'TJ: AC = 182K (8K lent out)');

// K. Receivable repayment: 3K received back
accounts = accounts.map(a => a.id === 'ch' ? { ...a, saldo: a.saldo + 3000 } : a);
accounts = accounts.map(a => a.id === 'rc' ? { ...a, saldo: a.saldo - 3000 } : a);
assertEqual(accounts.find(a => a.id === 'ch').saldo, 115000, 'TK: Checking: 112K + 3K = 115K');
assertEqual(accounts.find(a => a.id === 'rc').saldo, 5000, 'TK: Receivable: 8K - 3K = 5K');
assertEqual(calculateAvailableCash(accounts), 185000, 'TK: AC = 185K (3K returned)');

// Final NW check
const finalNW_acc = calculateNetWorth_accounts(accounts);
const finalNW_fh = calculateNetWorth_health(accounts);
console.log(`\n  Final state: AC=${calculateAvailableCash(accounts)}, NW(acc)=${finalNW_acc.total}, NW(fh)=${finalNW_fh.total}`);
assertEqual(finalNW_acc.total, finalNW_fh.total, 'TK: Final NW consistent between both modules');

/* =========================================================
   3. ACCOUNT CRUD AUDIT
   ========================================================= */
console.log('\n━━━ 3. Account CRUD Audit ━━━');

// Create
const created = createAccount({ nama: 'Test Bank', jenis: 'bank', saldo: 5000 });
assert(created.id.startsWith('acc_'), 'CRUD1: ID generated');
assertEqual(created.nama, 'Test Bank', 'CRUD2: Name set');
assertEqual(created.saldo, 5000, 'CRUD3: Balance set');

// Validate
const v1 = validateAccount({ nama: '', jenis: 'bank' });
assert(!v1.valid, 'CRUD4: Empty name invalid');
const v2 = validateAccount({ nama: 'Test' });
assert(!v2.valid, 'CRUD5: Missing type invalid');
const v3 = validateAccount({ nama: 'OK', jenis: 'bank' });
assert(v3.valid, 'CRUD6: Valid account passes');

// Duplicate names allowed
const dup = [createAccount({ nama: 'Savings', jenis: 'tabungan', saldo: 100 }), createAccount({ nama: 'Savings', jenis: 'tabungan', saldo: 200 })];
assertEqual(dup.length, 2, 'CRUD7: Duplicate names allowed');

// Negative balance (valid for credit cards)
const neg = createAccount({ nama: 'CC', jenis: 'kartu kredit', saldo: -5000 });
assertEqual(neg.saldo, -5000, 'CRUD8: Negative balance accepted');

// Zero balance
const zero = createAccount({ nama: 'Empty', jenis: 'bank', saldo: 0 });
assertEqual(zero.saldo, 0, 'CRUD9: Zero balance accepted');

// Delete — verify account can be filtered out
let testAccs = [mkAcc('d1', 'A', 'bank', 100), mkAcc('d2', 'B', 'cash', 200)];
testAccs = testAccs.filter(a => a.id !== 'd2');
assertEqual(testAccs.length, 1, 'CRUD10: Delete removes one account');

/* =========================================================
   4. LEGACY DATA AUDIT
   ========================================================= */
console.log('\n━━━ 4. Legacy Data Audit ━━━');

const legacyTypes = [
  ['cash', 'cash', 'liquid'],
  ['bank', 'checking', 'liquid'],
  ['tabungan', 'savings', 'liquid'],
  ['e-wallet', 'ewallet', 'liquid'],
  ['gopay', 'ewallet', 'liquid'],
  ['ovo', 'ewallet', 'liquid'],
  ['investasi', 'investment', 'investment'],
  ['saham', 'investment', 'investment'],
  ['piutang', 'receivable', 'receivable'],
  ['utang', 'loan', 'liability'],
  ['hutang', 'loan', 'liability'],
  ['kartu kredit', 'credit', 'liability'],
];

legacyTypes.forEach(([legacy, normalized, classification], i) => {
  assertEqual(normalizeAccountType(legacy), normalized, `LEG${i+1}: '${legacy}' → '${normalized}'`);
  const cls = classifyAccount(mkAcc('x', 'Test', legacy, 1000));
  assertEqual(cls, classification, `LEG${i+1}b: '${legacy}' → ${classification}`);
});

// Unknown type
assertEqual(normalizeAccountType('xyz'), 'other', 'LEG13: Unknown → other');
assertEqual(normalizeAccountType(''), 'other', 'LEG14: Empty → other');
assertEqual(normalizeAccountType(null), 'other', 'LEG15: Null → other');

/* =========================================================
   5. i18n AUDIT — Check for raw keys in rendered HTML
   ========================================================= */
console.log('\n━━━ 5. i18n Audit ━━━');

// Import the i18n module to check translations
import { t } from '../src/i18n/index.js';

// Check that all account type labels resolve
const typeChecks = ['cash', 'checking', 'savings', 'ewallet', 'credit', 'investment', 'loan', 'receivable', 'other'];
typeChecks.forEach(type => {
  const label = t(`accounts.accountTypes.${type}`);
  const hasDot = label && label.includes('.');
  assert(!hasDot && label !== `accounts.accountTypes.${type}`, `i18n: accounts.accountTypes.${type} resolves to "${label}"`);
});

/* =========================================================
   6. CLASSIFICATION SINGLE SOURCE OF TRUTH
   ========================================================= */
console.log('\n━━━ 6. Classification Consistency Check ━━━');

// Check that classifyAccount and ACCOUNT_CLASSIFICATION are consistent
// by testing every type in ACCOUNT_TYPE_MAP
import { ACCOUNT_CLASSIFICATION } from '../src/domain/accounts.js';

const allLiquid = ACCOUNT_CLASSIFICATION.LIQUID;
const allInvestment = ACCOUNT_CLASSIFICATION.INVESTMENT;
const allReceivable = ACCOUNT_CLASSIFICATION.RECEIVABLE;
const allLiability = ACCOUNT_CLASSIFICATION.LIABILITY;

let duplicateCount = 0;
const allTypes = new Set([...allLiquid, ...allInvestment, ...allReceivable, ...allLiability, ...ACCOUNT_CLASSIFICATION.OTHER]);
allTypes.forEach(type => {
  const inLists = [allLiquid, allInvestment, allReceivable, allLiability, ACCOUNT_CLASSIFICATION.OTHER]
    .filter(list => list.includes(type)).length;
  if (inLists > 1) {
    duplicateCount++;
    console.log(`  ⚠️  '${type}' appears in ${inLists} classification lists`);
  }
});
assert(duplicateCount === 0, 'CLS1: No type appears in multiple classification lists' + (duplicateCount > 0 ? ` (${duplicateCount} duplicates found)` : ''));

// Check every type in ACCOUNT_TYPE_MAP produces a valid classification
import { ACCOUNT_TYPE_MAP } from '../src/domain/accounts.js';
let invalidCount = 0;
Object.keys(ACCOUNT_TYPE_MAP).forEach(rawType => {
  const normalized = ACCOUNT_TYPE_MAP[rawType];
  const testAcc = mkAcc('x', 'Test', rawType, 1000);
  const cls = classifyAccount(testAcc);
  if (!['liquid', 'investment', 'receivable', 'liability', 'other'].includes(cls)) {
    invalidCount++;
    console.log(`  ⚠️  '${rawType}' → '${normalized}' → unclassified`);
  }
});
assertEqual(invalidCount, 0, 'CLS2: All ACCOUNT_TYPE_MAP entries produce valid classification');

/* =========================================================
   RESULTS
   ========================================================= */
console.log('\n' + '='.repeat(70));
console.log(`  AUDIT RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (findings.length > 0) {
  console.log('\n  FINDINGS:');
  findings.forEach((f, i) => console.log(`    ${i + 1}. ${f}`));
}

console.log(`\n  TOTAL: ${passed + failed} tests (${passed} ✅ / ${failed} ❌)\n`);
process.exit(failed > 0 ? 1 : 0);
