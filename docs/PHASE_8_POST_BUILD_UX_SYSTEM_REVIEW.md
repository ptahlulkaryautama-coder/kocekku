# SAKKU — PHASE 8 POST-BUILD UX & SYSTEM REVIEW

## 1. Executive Summary

Sakku has completed 8 development phases (2.5 through 8), delivering: Dashboard, Transactions, Accounts, Budgets, Goals, Bills & Recurring Expenses, and foundational domain architecture. The application has **840 passing tests** across 7 test suites and a clean production build.

**Overall assessment: CONDITIONALLY READY for Phase 9.**

All P1 issues resolved. P1-1 + P1-2 (goal contribution transaction types) resolved 2026-08-30. P1-3 (emergency fund investment exclusion) resolved 2026-08-30. Two P2 consistency issues remain (P2-1 duplicate calculateGoalProgress, P2-2 hardcoded emergency fund types — now fixed). Only P2-1 (duplicate calculateGoalProgress) remains as a cleanup item.

---

## 2. User Mental Model

### Module Mental Models

| Module | Concept | User Expectation | Communication Clear? |
|--------|---------|------------------|---------------------|
| **Dashboard** | Financial overview | "Show me my financial picture at a glance" | ✅ Yes — Net Worth, Income, Expenses, Savings Rate are clear |
| **Accounts** | Where money lives | "Show me my bank accounts and balances" | ✅ Yes — grouped by Liquid/Investment/Liability |
| **Transactions** | Money movement history | "Show me what I spent and earned" | ✅ Yes — table with search/filter |
| **Budgets** | Spending limits | "Am I staying within my budget?" | ✅ Yes — progress bars, status badges |
| **Goals** | Savings targets | "How close am I to my goal?" | ✅ Yes — progress bars, target dates |
| **Bills** | Recurring obligations | "What bills are coming due?" | ✅ Yes — grouped by status, pay flow |
| **Smart Add** | Quick transaction entry | "Type naturally to add a transaction" | ⚠️ Placeholder only |

### Conceptual Ambiguities Identified

| Confusion | Severity | Details |
|-----------|----------|---------|
| **Goal deposits appear as expenses** | **P1** | When user deposits Rp500K to a goal, a `keluar` (expense) transaction is created. This inflates the expense total and reduces savings rate. A user saving money is not "spending" it. |
| **Goal withdrawals appear as income** | **P1** | When user withdraws from a goal, a `masuk` (income) transaction is created. This inflates income and artificially boosts savings rate. |
| **Transfers page = Transactions page** | P3 | Both `transfers` and `transactions` cases call `renderTransactionsPage()`. Transfers have no dedicated UI. |
| **"Available Cash" meaning** | P2 | Users may not understand why credit cards and investments are excluded. No tooltip or explanation provided. |

---

## 3. Money Flow Audit

### Scenario 1: Goal Deposit

**Setup:** BCA = Rp15M, Emergency Fund Goal = Rp0

**Action:** Deposit Rp500K to Emergency Fund from BCA

**Code path:** `showGoalContributionModal(goal, 'deposit')`

**Result:**
- BCA = Rp14.5M ✅
- Emergency Fund = Rp500K ✅
- Transaction created: `tipe: 'keluar', jumlah: 500000, kategori: 'Emergency Fund'` ⚠️

**Problem:** The deposit creates an expense transaction. This means:
- Monthly expenses increase by Rp500K ❌
- Savings rate decreases ❌
- Budget category "Emergency Fund" shows Rp500K spending ❌
- Spending breakdown shows "Emergency Fund" as a spending category ❌

**Expected behavior:** Goal allocation should be modeled as a transfer (account → goal), NOT as an expense. The money is still the user's — it's been reallocated, not spent.

**Current behavior:** Preserved from original Sakku. The Phase 7 report explicitly documented this: *"Goal contributions ARE recorded as ordinary transactions — this is the existing behavior preserved for audit trail."*

**Verdict:** Documented but NOT acceptable for an international finance product. This is a P1 semantic issue.

### Scenario 2: Bill Payment

**Setup:** Internet Bill = Rp350K, Account = BCA

**Action:** Pay Bill

**Code path:** `showPayBillModal(billId)`

**Result:**
- BCA decreases Rp350K ✅
- Transaction created: `tipe: 'keluar', keterangan: 'Bill: Internet'` ✅
- Bill `terakhirBayar` set to now ✅
- No duplicate expense ✅

**Verdict:** Correct behavior.

### Scenario 3: Ordinary Expense

**Setup:** Buy Nasi Padang = Rp50K

**Result:**
- Account decreases Rp50K ✅
- Transaction = Expense ✅
- Budget category spending increases ✅
- Goal balance unchanged ✅
- Bill status unchanged ✅

**Verdict:** Correct behavior.

### Scenario 4: Transfer

**Setup:** BCA → Cash = Rp1M

**Code path:** Transaction with `tipe: 'transfer'`

**Result:**
- BCA decreases Rp1M ✅
- Cash increases Rp1M ✅
- Transaction type = `transfer` (not counted as income or expense by `calculateMonthlyIncome`/`calculateMonthlyExpenses`) ✅
- Net Worth unchanged ✅
- Available Cash unchanged ✅

**Verdict:** Correct behavior.

### Scenario 5: Goal Withdrawal

**Setup:** Emergency Fund = Rp2M, Withdraw Rp500K to BCA

**Code path:** `showGoalContributionModal(goal, 'withdraw')`

**Result:**
- Goal balance = Rp1.5M ✅
- BCA increases Rp500K ✅
- Transaction: `tipe: 'masuk', keterangan: 'Goal: Emergency Fund - Withdrawal'` ⚠️
- Income increases by Rp500K ❌
- Savings rate increases ❌

**Problem:** The withdrawal creates an income transaction. The user is not earning money — they're releasing saved funds back to their account.

**Verdict:** Same semantic issue as deposits. P1.

---

## 4. Cross-Module Consistency

### Verification Matrix

| Flow | Correct? | Issue |
|------|----------|-------|
| Transaction → Account balance | ✅ | Balance updates correctly on add/edit/delete |
| Transaction → Budget spending | ✅ | `keluar` transactions contribute to category spending |
| Bill → Transaction (when paid) | ✅ | Expense created, account reduced, bill marked paid |
| Goal → Account (deposit) | ⚠️ | Account reduces correctly, but transaction type is wrong |
| Goal → Account (withdraw) | ⚠️ | Account increases correctly, but transaction type is wrong |
| Financial Health → Canonical functions | ✅ | Uses `calculateNetWorth` from accounts.js |
| Dashboard → Domain functions | ✅ | All metrics from domain layer |

### Duplicate Formulas Found

| Function | Location 1 | Location 2 | Issue |
|----------|-----------|-----------|-------|
| `calculateGoalProgress` | `goals.js` (canonical) | `financial-health.js` (duplicate) | Different return shapes. Dashboard uses `financial-health.js` version; Goals page uses `goals.js` version. |

### Emergency Fund Classification Inconsistency

| Function | Uses | Includes Investment? |
|----------|------|---------------------|
| `calculateAvailableCash()` | `ACCOUNT_CLASSIFICATION` from `accounts.js` | ❌ No (correct) |
| `calculateEmergencyFundCoverage()` | Inline hardcoded list | ✅ Yes (incorrect) |

The emergency fund function uses `['cash', 'checking', 'savings', 'tabungan', 'bank', 'investment', 'investasi']` — including investment accounts. Emergency funds should only include truly liquid assets. This also doesn't use the centralized `ACCOUNT_CLASSIFICATION`.

---

## 5. Terminology Audit

| Term | Current Usage | International Standard | Recommendation |
|------|--------------|----------------------|----------------|
| **Account** | ✅ Correct | "Account" is standard | Keep |
| **Available Cash** | ✅ Mostly correct | "Cash" or "Liquid Assets" | Consider "Liquid Assets" for clarity |
| **Net Worth** | ✅ Correct | "Net Worth" is standard | Keep |
| **Income** | ✅ Correct | "Income" is standard | Keep |
| **Expense** | ✅ Correct | "Expense" is standard | Keep |
| **Transfer** | ✅ Correct | "Transfer" is standard | Keep |
| **Budget** | ✅ Correct | "Budget" is standard | Keep |
| **Goal** | ✅ Correct | "Goal" or "Savings Goal" | Keep |
| **Add Money** | ⚠️ Ambiguous | "Allocate to Goal" or "Deposit" | Change to "Allocate" |
| **Withdraw** | ⚠️ Ambiguous | "Release from Goal" or "Withdraw" | Keep "Withdraw" (standard) |
| **Bill** | ✅ Correct | "Bill" is standard | Keep |
| **Pay Bill** | ✅ Correct | "Pay" is standard | Keep |
| **Recurring Expense** | ⚠️ Misleading | Bills are not expenses until paid | Use "Recurring Bill" or "Subscription" |
| **Remaining** | ✅ Correct | "Remaining" is standard | Keep |
| **Total Due** | ✅ Correct | "Total Due" is standard | Keep |
| **Financial Health** | ✅ Correct | "Financial Health" is standard | Keep |
| **Monthly Commitments** | ✅ Good | "Monthly Obligations" also works | Keep |
| **Smart Add** | ✅ Good product term | — | Keep |

### Indonesian Field Names in Domain Layer

These remain in the domain layer and must be preserved for backward compatibility:

| Field | English Equivalent | Used In |
|-------|-------------------|---------|
| `terkumpul` | `saved` / `current` | Goals |
| `tanggalJatuhTempo` | `dueDay` | Bills |
| `jumlah` | `amount` | Bills, Transactions |
| `kategori` | `category` | Transactions, Bills, Budgets |
| `nama` | `name` | All entities |
| `jenis` | `type` | Accounts |
| `saldo` | `balance` | Accounts |
| `aktif` | `active` | All entities |
| `tipe` | `type` | Transactions |
| `tanggal` | `date` | Transactions |
| `dompet` | `account` | Transactions |
| `keterangan` | `description` | Transactions |
| `pengeluar` | `member` | Transactions |
| `catatan` | `notes` | All entities |
| `hubungan` | `relationship` | Family |

---

## 6. Information Architecture

### Current Navigation Structure

```
Home
Money
  ├── Accounts
  ├── Transactions
  └── Transfers  ← (renders same page as Transactions)
Plan
  ├── Budgets
  ├── Goals
  └── Bills & Subscriptions
Insights
  ├── Cash Flow     ← (not implemented)
  ├── Spending      ← (not implemented)
  ├── Net Worth     ← (not implemented)
  └── Financial Health ← (placeholder)
Family
  ├── Members       ← (not implemented)
  └── Contributions ← (not implemented)
Reports             ← (placeholder)
Settings            ← (placeholder)
```

### Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Transfers = Transactions** | P3 | `case 'transfers'` calls `renderTransactionsPage()`. No dedicated transfer UI. |
| **Bills under "Plan"** | P2 | Bills are reactive (paying obligations), not planning. Better under "Money" or as a top-level item. |
| **Insights children are placeholders** | P3 | 4 placeholder pages under Insights. Consider hiding until implemented. |
| **Family children are placeholders** | P3 | 2 placeholder pages under Family. |

### Recommended IA (for future consideration)

```
Home
Money
  ├── Accounts
  ├── Transactions
  └── Transfers (dedicated)
Planning
  ├── Budgets
  └── Goals
Bills & Subscriptions (top-level)
Insights
  └── Financial Health
Family
Settings
```

---

## 7. UI/UX Consistency Audit

### Page Headers

| Page | Has Title | Has Subtitle | Has CTA | Consistent? |
|------|-----------|-------------|---------|-------------|
| Dashboard | ✅ Greeting | ✅ Period | ✅ Add Transaction | ✅ |
| Accounts | ✅ | ✅ | ✅ Add Account | ✅ |
| Transactions | ✅ | ✅ | ✅ New Transaction | ✅ |
| Budgets | ✅ | ✅ | ✅ Set Budget Limit | ✅ |
| Goals | ✅ | ✅ | ✅ New Goal | ✅ |
| Bills | ✅ | ✅ | ✅ Add Bill | ✅ |

### Modal Patterns

| Pattern | Consistent? | Notes |
|---------|-------------|-------|
| Overlay click to close | ✅ | All modals |
| Cancel + Save buttons | ✅ | All forms |
| Error display | ✅ | All forms show validation errors |
| Confirmation dialogs | ✅ | Delete operations use `appState.confirm()` |
| Toast notifications | ✅ | Success/error toasts |

### Inconsistencies Found

| Issue | Severity | Details |
|-------|----------|---------|
| **Goal contribution modal uses hardcoded strings** | P3 | "Please enter a valid amount." and "Please select an account." are not i18n'd |
| **Goal delete uses hardcoded string** | P3 | "Goal deleted." is not i18n'd |
| **Bill pay modal category label** | P3 | Uses `.replace('Amount', 'Category')` hack instead of proper i18n key |
| **Empty states inconsistent** | P3 | Some use icons + text + CTA, others just text |

### Progress Bar Patterns

| Page | Has Progress | Color-coded | Status Badge |
|------|-------------|-------------|-------------|
| Budgets | ✅ | ✅ On Track/Approaching/Over | ✅ |
| Goals | ✅ | ✅ By percentage | ✅ |
| Bills | ✅ (commitments only) | ❌ | ✅ Status badges |

---

## 8. Mobile UX Audit

**Visual QA limitation: screenshot/pixel-level verification unavailable.**

Conceptual audit based on code inspection:

| Concern | Status | Notes |
|---------|--------|-------|
| Bottom navigation | ✅ | 5 items: Home, Money, +, Insights, More |
| Mobile submenu | ✅ | Money and Insights show bottom sheet submenu |
| Modals | ⚠️ | `max-w-md` (448px) may be tight on 375px screens |
| Tables | ⚠️ | Transactions table may overflow on small screens — no card fallback implemented |
| Card density | ✅ | Cards stack vertically on mobile |
| Typography | ✅ | Responsive text sizes used |
| Financial numbers | ✅ | `formatCurrency` handles formatting |
| CTA visibility | ✅ | FAB (+) button prominently placed |
| Horizontal overflow | ⚠️ | No explicit `overflow-x: hidden` on main content area |

---

## 9. Edge Cases

| Case | Handled? | Notes |
|------|----------|-------|
| Credit card positive balance | ✅ | Classified as liability even when positive |
| Credit card negative balance | ✅ | Standard liability behavior |
| Loan | ✅ | Classified as liability |
| Receivable | ✅ | Classified as asset, excluded from Available Cash |
| Investment | ✅ | Classified as asset, excluded from Available Cash |
| Overdraft | ✅ | Non-liability accounts with negative balance counted as liability |
| Zero balance | ✅ | Handled gracefully |
| Completed goal (100%+) | ✅ | Percentage capped at 100%, status = "complete" |
| Goal over target | ✅ | `terkumpul` can exceed `target` |
| Goal withdrawal exceeding balance | ✅ | Validation prevents |
| Bill overdue | ✅ | Status derived correctly |
| Bill paid | ✅ | Marked paid, excluded from upcoming |
| Recurring bill | ✅ | Next occurrence calculated after payment |
| Inactive bill | ✅ | Excluded from all active groups |
| Refund | ⚠️ | No explicit refund flow — user would create income transaction |
| Deleted transaction | ✅ | Account balance restored |
| Deleted account with transactions | ⚠️ | Warning shown but transactions remain orphaned |
| Deleted budget | ✅ | Transactions unaffected |
| Deleted goal | ✅ | Transactions unaffected |

---

## 10. Test Coverage

### Actual Test Counts (Verified)

| Suite | Count | Status |
|-------|-------|--------|
| Phase 2.5 regression | 146 | ✅ All pass |
| Dashboard + Transactions | 159 | ✅ All pass |
| Accounts | 126 | ✅ All pass |
| Budgets | 85 | ✅ All pass |
| Goals | 110 | ✅ All pass |
| Review Gate Audit | 101 | ✅ All pass |
| Bills | 113 | ✅ All pass |
| **Total** | **840** | ✅ **840/840 passing** |

### Coverage Gaps

| Gap | Severity | Details |
|-----|----------|---------|
| **No cross-module integration tests** | P2 | No test verifies: create transaction → budget updates → dashboard reflects |
| **No goal contribution financial invariant tests** | P1 | No test verifies that goal deposit doesn't inflate expenses |
| **No bill payment end-to-end test** | P2 | No test verifies: pay bill → transaction created → account reduced → bill marked paid |
| **No UI rendering tests** | P3 | All tests are domain-only; no DOM/rendering verification |
| **No mobile navigation tests** | P3 | Bottom nav, submenu behavior untested |
| **No dark mode tests** | P3 | Theme switching untested |
| **No responsive layout tests** | P3 | Breakpoint behavior untested |

---

## 11. Prioritized Findings

### P1 — Financial Semantic Issues

| ID | Module | Problem | Why It Matters | Current Behavior | Recommended Fix |
|----|--------|---------|----------------|------------------|-----------------|
| **P1-1** ✅ RESOLVED | Goals | ~~Goal deposits create expense transactions~~ | ~~Inflates expenses, deflates savings rate~~ | Changed `tipe: 'keluar'` → `tipe: 'transfer'` in `showGoalContributionModal()` | ✅ Fixed 2026-08-30 |
| **P1-2** ✅ RESOLVED | Goals | ~~Goal withdrawals create income transactions~~ | ~~Inflates income, boosts savings rate~~ | Changed `tipe: 'masuk'` → `tipe: 'transfer'` in `showGoalContributionModal()` | ✅ Fixed 2026-08-30 |
| **P1-3** ✅ RESOLVED | Financial Health | ~~`calculateEmergencyFundCoverage` includes investments~~ | ~~Emergency fund should only include truly liquid assets~~ | Refactored to use `getAccountsByClassification(accounts, 'liquid')` from centralized ACCOUNT_CLASSIFICATION | ✅ Fixed 2026-08-30 |

### P2 — Important Consistency Issues

| ID | Module | Problem | Why It Matters | Recommended Fix |
|----|--------|---------|----------------|-----------------|
| **P2-1** | Domain | Duplicate `calculateGoalProgress` in `goals.js` and `financial-health.js` | Different return shapes; potential for divergent behavior | Consolidate to single source in `goals.js`; re-export from `financial-health.js` |
| **P2-2** ✅ RESOLVED | Domain | ~~`calculateEmergencyFundCoverage` uses hardcoded type list~~ | ~~Classification can drift from the canonical source~~ | Refactored to use `getAccountsByClassification(accounts, 'liquid')` ✅ 2026-08-30 |
| **P2-3** | Navigation | "Bills" is under "Plan" but bills are reactive obligations, not planning | Conceptual mismatch | Consider moving to top-level or under "Money" |
| **P2-4** | Dashboard | No explanation of "Available Cash" excludes credit cards/investments | Users may be confused | Add tooltip or subtle explanation |

### P3 — Polish / Enhancement

| ID | Module | Problem | Recommended Fix |
|----|--------|---------|-----------------|
| P3-1 | Goals | Hardcoded English strings in contribution modal | Move to i18n |
| P3-2 | Bills | Category label uses `.replace()` hack | Add proper i18n key |
| P3-3 | Navigation | Transfers page renders same as Transactions | Create dedicated transfer UI or remove from nav |
| P3-4 | UI | Empty states inconsistent across modules | Standardize pattern |
| P3-5 | UI | No horizontal overflow protection on main content | Add `overflow-x-hidden` |
| P3-6 | Transactions | No card layout fallback for mobile | Add responsive card view |

---

## 12. Recommended Fix Order

### Before Phase 9

1. **P1-1 + P1-2** ✅ RESOLVED (2026-08-30): Changed goal contribution transactions from `tipe: 'keluar'`/`'masuk'` to `tipe: 'transfer'`. All transfers are excluded from income/expense calculations by default across all domain functions. Updated `projectCompletionDate` to match. Added 37 cross-module invariant tests. Also fixed `classifyAccount()` to respect `normalizedType` field.

2. **P1-3** ✅ RESOLVED (2026-08-30): Refactored `calculateEmergencyFundCoverage` to use `getAccountsByClassification(accounts, 'liquid')` from centralized `ACCOUNT_CLASSIFICATION`. Removed hardcoded type list. Added 3 emergency-fund-specific invariant tests.

3. **P2-1**: Consolidate `calculateGoalProgress`:
   - Keep canonical version in `goals.js`
   - Re-export from `financial-health.js`
   - Verify dashboard uses the re-exported version

4. **P2-2**: Refactor emergency fund to use centralized classification

### After Phase 9

5. P2-3: Navigation restructuring
6. P2-4: Dashboard tooltip for Available Cash
7. P3-*: All polish items

---

## 13. Phase 9 Readiness Gate

**CONDITIONALLY READY**

Phase 9 (Financial Health redesign) can proceed IF:

- [x] P1-1 and P1-2 are resolved (goal contribution semantic fix) ✅ 2026-08-30
- [x] P1-3 is resolved (emergency fund investment exclusion) ✅ 2026-08-30
- [ ] P2-1 is resolved (duplicate calculateGoalProgress consolidated)

These are targeted fixes, not module rewrites. They can be completed in a focused remediation pass before Phase 9 begins.

---

## Appendix: File Inventory

### Modified Files (Phases 2.5–8)

| File | Phases | Purpose |
|------|--------|---------|
| `src/main.js` | 3–8 | Application shell, page renderers, modals |
| `src/domain/accounts.js` | 5, 5.1 | Account domain, classification, net worth |
| `src/domain/transactions.js` | 2.5 | Transaction domain functions |
| `src/domain/budgets.js` | 6 | Budget domain functions |
| `src/domain/goals.js` | 7 | Goal domain functions |
| `src/domain/bills.js` | 8 | Bill domain functions |
| `src/domain/financial-health.js` | 3, 5.1 | Financial health calculations |
| `src/app/state.js` | 2 | Application state management |
| `src/app/navigation.js` | 2 | Navigation configuration |
| `src/app/bootstrap.js` | 2 | App initialization |
| `src/data/storage.js` | 2 | localStorage persistence |
| `src/data/schema.js` | 2 | Data schema validation |
| `src/data/migration.js` | 2 | Data migration |
| `src/data/legacy-adapter.js` | 2 | Legacy data reader |
| `src/i18n/en.js` | 2–8 | English translations |
| `src/formatting/currency.js` | 2 | Currency formatting |
| `src/formatting/dates.js` | 2 | Date formatting |
| `src/ui/components/toast.js` | 2 | Toast notifications |
| `src/ui/design-tokens.css` | 2 | CSS design tokens |
| `index.html` | 2–3 | HTML shell |

### Test Files

| File | Tests | Purpose |
|------|-------|---------|
| `tests/phase2_5_validation.js` | 146 | Core regression |
| `tests/dashboard_and_transactions.test.js` | 159 | Dashboard + Transaction CRUD |
| `tests/accounts.test.js` | 126 | Account domain |
| `tests/budgets.test.js` | 85 | Budget domain |
| `tests/goals.test.js` | 110 | Goal domain |
| `tests/phase5_review_gate_audit.js` | 101 | Financial consistency |
| `tests/bills.test.js` | 113 | Bill domain |
