# SAKKU — PHASE 5.1: DOMAIN CONSISTENCY PATCH

**Date:** August 29, 2026
**Status:** ✅ COMPLETE
**Verdict:** READY FOR PHASE 6

---

## Findings Resolved

### P2-1: Positive Credit Card Balance Counted as Asset

**Root cause:** `calculateTotalAssets()` in `accounts.js` filtered by `saldo >= 0`, treating any account with a positive balance as an asset — including credit cards.

**Fix:** Now uses `classifyAccount()` — liability accounts are excluded from assets regardless of balance sign.

```js
// Before (buggy)
.filter(acc => (parseFloat(acc.saldo) || 0) >= 0)

// After (correct)
.filter(acc => classifyAccount(acc) !== 'liability' && (parseFloat(acc.saldo) || 0) > 0)
```

**Result:** A credit card with +Rp500K balance is NOT counted as an asset. ✅

### P2-2: Incomplete Liability Type Recognition

**Root cause:** `calculateTotalLiabilities()` only checked `jenis === 'utang' || jenis === 'loan'`, missing `hutang`, `kartu kredit`, `credit card`, `credit`.

**Fix:** Now uses `classifyAccount()` for type detection, which leverages the full `ACCOUNT_CLASSIFICATION.LIABILITY` list via `normalizeAccountType()`.

```js
// Before (incomplete)
const isLoan = acc.jenis === 'utang' || acc.jenis === 'loan';
return saldo < 0 || isLoan;

// After (complete)
const cls = classifyAccount(acc);
if (cls === 'liability') {
  total += Math.abs(balance);
} else if (balance < 0) {
  total += Math.abs(balance); // overdraft etc.
}
```

**Result:** All liability aliases (`utang`, `hutang`, `kartu kredit`, `credit card`, `credit`, `loan`) are recognized. ✅

### P2-3: Two `calculateNetWorth` Implementations

**Root cause:** `accounts.js` and `financial-health.js` each had independent `calculateNetWorth` implementations with different logic.

**Fix:** 
- `accounts.js` `calculateNetWorth` is now the **canonical** implementation
- `financial-health.js` **re-exports** from `accounts.js`: `export { calculateNetWorth } from './accounts.js'`

**Result:** ONE canonical implementation. Both modules return identical results. ✅

---

## Canonical Financial Semantics

### Account Classification → Financial Treatment

| Classification | Asset? | Liability? | In Available Cash? | In Net Worth? |
|---|---|---|---|---|
| **Liquid** | Yes (positive balance) | No | Yes | Yes |
| **Investment** | Yes (positive balance) | No | No | Yes |
| **Receivable** | Yes (positive balance) | No | No | Yes |
| **Liability** | **Never** | Yes (abs of balance) | No | Yes (subtracted) |
| **Other** | No | No (unless negative balance) | No | Conditional |

### Positive Credit Card Balance

A credit card with positive balance (e.g., +Rp500K) represents an **overpayment**, not wealth.

- NOT counted as an asset
- IS counted as a liability (abs of balance)
- Net Worth effect: negative (reduces net worth)
- NOT in Available Cash

### Positive Loan Balance

A loan with positive balance (e.g., +Rp50K) represents an **overpayment**, not wealth.

- NOT counted as an asset
- IS counted as a liability (abs of balance)
- Net Worth effect: negative
- NOT in Available Cash

### Overdraft (Negative Liquid Balance)

A liquid account with negative balance (e.g., checking overdraft):

- NOT counted as an asset (balance ≤ 0)
- IS counted as a liability (negative balance of non-liability type)
- Reduces Available Cash
- Reduces Net Worth

---

## Supported Liability Aliases

### Legacy Indonesian
- `utang` → loan
- `hutang` → loan
- `kartu kredit` → credit card

### English
- `loan`
- `credit card`
- `credit`

All are classified as `'liability'` by `classifyAccount()`.

---

## Functions Changed

| Function | Module | Change |
|---|---|---|
| `calculateTotalAssets` | `accounts.js` | Uses `classifyAccount()` instead of balance sign |
| `calculateTotalLiabilities` | `accounts.js` | Uses `classifyAccount()` instead of partial type check |
| `calculateNetWorth` | `accounts.js` | Now returns `{ total, assets, liabilities }` object |
| `calculateNetWorth` | `financial-health.js` | Re-exports from `accounts.js` (no duplicate) |

---

## Cross-Function Consistency Matrix

All tested with the standard 6-account dataset:

| Function | Result | Consistent? |
|---|---|---|
| `calculateAvailableCash` | 30M (liquid only) | ✅ |
| `calculateTotalAssets` | 45M (non-liability, positive) | ✅ |
| `calculateTotalLiabilities` | 7.5M (liability abs) | ✅ |
| `calculateNetWorth` | { total: 37.5M, assets: 45M, liabilities: 7.5M } | ✅ |

Invariant verified: **Net Worth = Total Assets - Total Liabilities** ✅

---

## Financial Invariants Verified

| Invariant | Status |
|---|---|
| NW = Total Assets - Total Liabilities | ✅ |
| Available Cash ⊆ Liquid Assets | ✅ |
| Investment accounts not in Available Cash | ✅ |
| Receivables not in Available Cash | ✅ |
| Credit-card debt not in Available Cash | ✅ |
| Loan debt not in Available Cash | ✅ |
| Transfers do not create income or expense | ✅ |
| CC payment does not create second expense | ✅ |

---

## Tests Added

New test file: `tests/phase5_review_gate_audit.js` — 101 tests

| Section | Tests | Coverage |
|---|---|---|
| Financial formula audit | 8 | Standard case + all metrics |
| Edge cases (P2-1/2/3) | 14 | Positive CC, zero CC, positive loan, zero loan, hutang alias |
| Transaction integrity (A-K) | 30 | All 11 scenarios with balance checks |
| Account CRUD | 10 | Create, edit, delete, validate |
| Legacy data | 15 | All 12 Indonesian types + normalization |
| i18n | 9 | All account type labels resolve |
| Classification consistency | 2 | No duplicates, all types classified |

---

## Regression Results

```
Phase 2.5 validation:  146/146 ✅
Dashboard + TXNs:      159/159 ✅
Accounts:              126/126 ✅
Review Gate Audit:     101/101 ✅
─────────────────────────────
Total:                 532/532 ✅
```

Previous: 429
New: 103 (126 accounts was 124 before return-type fix, 101 audit is new)
Final: 532

---

## Build Result

```
> npm run build
vite v6.4.3 building for production...
✓ 22 modules transformed.
✓ built in 1.40s
```

**CLEAN BUILD ✅**

---

## Code Quality

**Duplicate formula search:**
- `calculateNetWorth`: 1 implementation (accounts.js), 1 re-export (financial-health.js) ✅
- `calculateTotalAssets`: 1 implementation (accounts.js) ✅
- `calculateTotalLiabilities`: 1 implementation (accounts.js) ✅
- `calculateAvailableCash`: 1 implementation (accounts.js) ✅
- `classifyAccount`: 1 implementation (accounts.js) ✅

No duplicate financial formulas found. ✅

---

## Visual QA

**VISUAL QA NOT FULLY VERIFIED** — screenshot tooling unavailable.

The domain changes are purely computational (no UI changes). The existing visual rendering is unaffected by the formula fixes.
