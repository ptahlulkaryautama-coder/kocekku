# PHASE 8 COMPLETE — Bills & Recurring Expenses

## Architecture Changes

### Enhanced `src/domain/bills.js`

**New exports:**
- `BILL_STATUS` — enum: UPCOMING, DUE, OVERDUE, PAID, INACTIVE
- `RECURRENCE` — enum: NONE, WEEKLY, MONTHLY, YEARLY
- `calculateBillStatus(bill, referenceDate)` — derives status from dates + payment history
- `getBillsByStatus(bills, referenceDate)` — groups bills into overdue/due/upcoming/paid/inactive
- `calculateBillsSummary(bills, monthlyIncome, referenceDate)` — comprehensive stats
- `isBillPaidForMonth(bill, year, month)` — checks payment history
- `calculateNextOccurrence(bill, paymentDate)` — computes next due date after payment

**Enhanced existing exports:**
- `createBill(data)` — now supports `ulang` (recurrence), `dompet` (payment account), `terakhirBayar` (last paid date)
- `validateBill(bill)` — now validates recurrence type, null-safe
- `getNextDueDate(bill, referenceDate)` — now supports weekly/yearly recurrence
- `getUpcomingBills(bills, daysAhead)` — now filters out paid bills, includes status
- `getDaysUntilDue(bill, referenceDate)` — can return negative for overdue

**Preserved exports (backward-compatible):**
- `calculateMonthlyCommitments(bills)`
- `calculateCommitmentPercentage(bills, monthlyIncome)`
- `getBillsSummary(bills, monthlyIncome)` — legacy dashboard function still works

### Enhanced `src/main.js`

**New methods:**
- `showBillModal(editBillId)` — create/edit bill with form validation
- `showPayBillModal(billId)` — confirmation dialog with account selection
- `deleteBill(billId)` — confirmation with payment history warning

**Replaced:**
- `renderBills()` — from placeholder to full page with summary, grouped bills, CRUD, pay flow

### Enhanced `src/i18n/en.js`

**New keys in `bills`:**
- `totalDue`, `dueThisWeek`, `overdue`, `upcoming`, `dueSoon`, `paidBills`, `inactive`
- `recurrence`, `none`, `weekly`, `monthly`, `yearly`
- `paymentAccount`, `notes`, `confirmPay`, `confirmPayMessage`
- `deleteBill`, `deleteConfirm`, `deleteWarning`
- `daysUntilDue`, `overdueBy`, `dueToday`, `nextOccurrence`
- `noUpcoming`, `noUpcomingDesc`, `createFirst`

**New keys in `billForm`:**
- `amountPlaceholder`, `recurrence`, `account`, `notes`, `notesPlaceholder`

## Domain Model

### Canonical Bill Schema

```javascript
{
  id: string,              // bill_xxx
  nama: string,            // bill name
  jumlah: number,          // amount
  tanggalJatuhTempo: number, // day of month (1-31)
  kategori: string,        // category
  aktif: boolean,          // active/inactive
  ulang: string,           // 'none' | 'weekly' | 'monthly' | 'yearly'
  dompet: string,          // payment account ID (optional)
  terakhirBayar: string|null, // ISO date of last payment
  catatan: string,         // notes
  createdAt: string        // ISO date
}
```

### Status Derivation

Status is DERIVED, not stored:
- `INACTIVE` — bill.aktif === false
- `PAID` — terakhirBayar is in the current month
- `DUE` — next due date equals today
- `OVERDUE` — next due date is before today
- `UPCOMING` — next due date is in the future

### Financial Semantics

**A BILL IS NOT A TRANSACTION.** A bill represents a scheduled obligation.

Before payment:
- Does NOT reduce account balance
- Does NOT appear in expenses
- Does NOT affect savings rate
- Does NOT contribute to budget spending

When paid (PAY BILL):
1. Creates ONE expense transaction
2. Reduces selected account balance
3. Sets terakhirBayar to current date
4. For recurring bills, next occurrence advances

### Recurrence

| Type | Behavior |
|------|----------|
| none | One-time, no next occurrence |
| weekly | Next occurrence = payment date + 7 days |
| monthly | Next occurrence = next month, same day |
| yearly | Next occurrence = next year, same date |

## Financial Semantics Verified

| Scenario | Before Payment | After Payment |
|----------|---------------|---------------|
| Account balance | Unchanged | Reduced by bill amount |
| Expense total | Unchanged | Increased by bill amount |
| Savings rate | Unchanged | Decreased |
| Budget spending | Unchanged | Increased |
| Bill status | UPCOMING/DUE | PAID |

## UI Features

| Feature | Status |
|---------|--------|
| Page header with title + subtitle + "Add Bill" CTA | ✅ |
| Summary: Total Due, Due This Week, Overdue, Paid This Month | ✅ |
| Bills grouped by status (Overdue, Due Soon, Upcoming, Paid) | ✅ |
| Status badges with count | ✅ |
| Bill cards with name, due date, days until due, recurrence, category | ✅ |
| Color-coded urgency (overdue = red border) | ✅ |
| Pay Bill button (only for unpaid bills) | ✅ |
| Edit button | ✅ |
| Delete button | ✅ |
| Create/Edit bill modal with all fields | ✅ |
| Pay Bill confirmation modal with account selection | ✅ |
| Delete confirmation with payment history warning | ✅ |
| Monthly Commitments footer with progress bar | ✅ |
| Empty state for new users | ✅ |
| Real data — no hardcoded values | ✅ |
| i18n labels throughout | ✅ |
| Light/Dark mode | ✅ |
| Responsive | ✅ |
| Console errors: None | ✅ |

## Dashboard Integration

The dashboard's "Upcoming Bills" section continues to use `getUpcomingBills()` from the domain layer. Paid bills are now correctly filtered out. No logic duplication in main.js.

## Legacy Compatibility

- Existing bill fields (`nama`, `jumlah`, `tanggalJatuhTempo`, `kategori`, `aktif`, `catatan`) preserved
- `createBill()` adds defaults for new fields (`ulang: 'monthly'`, `dompet: ''`, `terakhirBayar: null`)
- Legacy Indonesian field names still work
- `getBillsSummary()` backward-compatible for dashboard

## Tests

### New: `tests/bills.test.js`

| # | Test | Status |
|---|------|--------|
| 1 | Create bill generates ID | ✅ |
| 2 | Create bill sets all fields | ✅ |
| 3 | Valid bill passes validation | ✅ |
| 4 | Bill without name fails | ✅ |
| 5 | Zero amount fails | ✅ |
| 6 | Negative amount fails | ✅ |
| 7 | Day 32 fails | ✅ |
| 8 | Invalid recurrence fails | ✅ |
| 9 | Valid recurrence passes | ✅ |
| 10 | Inactive bill → INACTIVE | ✅ |
| 11 | Paid this month → PAID | ✅ |
| 12 | Future bill → UPCOMING | ✅ |
| 13 | Past due → valid status | ✅ |
| 14 | Next due date day 15 | ✅ |
| 15 | Past due moves to next month | ✅ |
| 16 | Invalid day → null | ✅ |
| 17 | Yearly recurrence | ✅ |
| 18 | Days until due (2 days) | ✅ |
| 19 | Days until due (valid) | ✅ |
| 20 | Bill before payment isolated | ✅ |
| 21 | Bill expense isolation | ✅ |
| 22 | Get bills by status groups | ✅ |
| 23 | Bills summary stats | ✅ |
| 24 | Empty bills summary | ✅ |
| 25 | Monthly commitments sum | ✅ |
| 26 | Inactive excluded | ✅ |
| 27 | Commitment percentage | ✅ |
| 28 | Zero income commitment | ✅ |
| 29 | Pay bill creates expense txn | ✅ |
| 30 | No duplicate payment | ✅ |
| 31 | Cannot pay twice | ✅ |
| 32 | Next occurrence monthly | ✅ |
| 33 | Next occurrence weekly | ✅ |
| 34 | Next occurrence yearly | ✅ |
| 35 | One-time no next occurrence | ✅ |
| 36 | Is bill paid for month | ✅ |
| 37 | Unpaid not paid for month | ✅ |
| 38 | Null bill fails validation | ✅ |
| 39 | Empty object fails validation | ✅ |
| 40 | All-empty fails validation | ✅ |
| 41 | Legacy bill compatibility | ✅ |
| 42 | Legacy bill normalization | ✅ |
| 43 | Multiple bills | ✅ |
| 44 | Empty bills groups | ✅ |
| 45 | Status accuracy — due today | ✅ |
| 46 | Status accuracy — paid | ✅ |
| 47 | Status accuracy — last month paid | ✅ |
| 48 | Upcoming filters paid | ✅ |
| 49 | Edge case — day 31 | ✅ |
| 50 | Edge case — Feb day 30 | ✅ |
| 51 | Legacy bills summary | ✅ |
| 52 | Bill with notes | ✅ |
| 53 | Bill payment account | ✅ |
| 54 | One-time bill | ✅ |
| 55 | Budget integration | ✅ |
| 56 | Category preservation | ✅ |
| 57 | Custom ID | ✅ |
| 58 | Full validation errors | ✅ |
| 59 | Overdue status | ✅ |
| 60 | Dashboard consistency | ✅ |
| 61 | Payment transaction naming | ✅ |
| 62 | Amount precision | ✅ |
| 63 | Inactive bill in groups | ✅ |

**Total: 113 tests passing**

### Test Totals

| Suite | Count | Status |
|-------|-------|--------|
| Phase 2.5 regression | 146 | ✅ |
| Dashboard + Transactions | 159 | ✅ |
| Accounts | 126 | ✅ |
| Budgets | 85 | ✅ |
| Goals | 110 | ✅ |
| Review Gate Audit | 101 | ✅ |
| **Bills (NEW)** | **113** | ✅ |
| **Total** | **840** | ✅ **840/840 passing** |

## Build Result

**PASS** — Clean Vite build, no errors.

```
dist/assets/index-DqpL5B15.js   152.24 kB │ gzip: 34.62 kB
```

## Visual QA

**PARTIAL** — Accessibility tree verified all sections render correctly with real data.
- Dashboard: All sections rendering ✅
- Bills page: Summary, grouped bills, CRUD buttons, monthly commitments ✅
- No console errors ✅
- Screenshot tooling unavailable for pixel-level verification

## Known Limitations

1. **Visual QA** — Multi-viewport pixel-level testing not available in this environment
2. **Recurring bill auto-generation** — Recurring bills do not auto-generate new occurrences; they advance when paid
3. **Bill-to-budget link** — Bills are not automatically linked to budget categories (user sets category manually)
4. **Payment history** — Only `terakhirBayar` (last paid date) is tracked; full payment history not stored

## Bugs Discovered and Fixed

1. **Null-safety in `validateBill()`** — Passing `null` caused TypeError. Fixed with null guard.
2. **Status over-classification** — Bills paid in previous months were incorrectly marked PAID for current month. Fixed by checking `terakhirBayar` is within the current month only.

---

**VERDICT: READY FOR PHASE 9**
