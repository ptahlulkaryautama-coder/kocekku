# Exchange Rate Conversion Feature

## Overview

Currency switching is now **functional** — changing the display currency automatically converts all financial amounts using live exchange rates.

## How It Works

```
Account stored as: Rp 15,000,000 (IDR)
Display currency:  USD

Result:           $937.50
```

## Architecture

### Exchange Rate Service (`src/data/exchange-rates.js`)

- **Primary API**: [frankfurter.app](https://frankfurter.app) — free, no API key required
- **Fallback**: Hardcoded approximate rates (for offline/edge cases)
- **Cache**: localStorage with 24-hour TTL
- **Supported currencies**: USD, IDR, SGD, MYR, EUR, GBP, AUD, JPY, AED, SAR

### Flow

```
App startup
    ↓
initExchangeRates()
    ↓
Fetch live rates from frankfurter.app (background)
    ↓
Cache in localStorage (24h TTL)
    ↓
All formatCurrency() calls use cached rates
```

### Conversion Logic

```javascript
// In formatCurrency(amount, displayCurrency, { fromCurrency })
if (fromCurrency !== displayCurrency) {
  amount = convertCurrency(amount, fromCurrency, displayCurrency);
}
// Convert: source → USD → target
const inUSD = amount / rates[from];
return inUSD * rates[to];
```

### Source Currency Detection

Each module detects the **dominant source currency** from the user's accounts:

```javascript
const sourceCurrency = detectDominantCurrency(
  accounts.map(a => ({ amount: a.saldo || 0, currency: a.mataUang }))
);
```

This means if a user has:
- BCA: Rp 27,700,000 (IDR)
- Savings: Rp 25,000,000 (IDR)
- GoPay: Rp 2,075,000 (IDR)

The source currency is **IDR** (largest total balance).

## Pages Using Conversion

| Page | Status | Method |
|------|--------|--------|
| Dashboard | ✅ | `this.fmt()` → `formatCurrency(amt, display, { fromCurrency })` |
| Smart Add | ✅ | `fc()` → same pattern |
| Transactions | ✅ | `this.fmt()` |
| Accounts | ✅ | `this.fmt()` |
| Budgets | ✅ | `this.fmt()` |
| Goals | ✅ | `this.fmt()` |
| Bills | ✅ | `this.fmt()` |
| Financial Health | ✅ | `this.fmt()` |
| Family | ✅ | `this.fmt()` |
| Reports | ✅ | `fc()` → same pattern |
| Settings | ⚠️ | Preview only (intentionally shows static amount) |

## Behavior

- **Storage**: Amounts always stored in original currency (IDR, etc.)
- **Display**: Converted on-the-fly using live rates
- **No cross-currency mixing**: Each account has its own `mataUang`
- **Fallback**: If API fails, uses cached or hardcoded rates
- **No silent conversion**: If rates unavailable, shows original amount with no conversion

## Edge Cases

- Same currency → no conversion (identity)
- Unknown currency → returns original amount
- Zero amount → returns 0
- API failure → uses fallback rates

## Tests

All 986 existing tests pass without modification (conversion is opt-in via `fromCurrency` option).

## Files Changed

| File | Change |
|------|--------|
| `src/data/exchange-rates.js` | **NEW** — Exchange rate service |
| `src/formatting/currency.js` | Added `fromCurrency` option to `formatCurrency()`, added `detectDominantCurrency()` |
| `src/main.js` | Added `this.fmt()` helper, `_sourceCurrency` detection, updated all card builders |
| `src/ui/smart-add.js` | Added `fc()` helper with source currency detection |
| `src/ui/reports-page.js` | Added `fc()` helper with source currency detection |

## Known Limitations

1. **Rate freshness**: Rates cached for 24 hours — not real-time
2. **Mixed-currency accounts**: If user has both IDR and USD accounts, conversion uses the dominant currency
3. **Settings preview**: Shows static 1,000,000 in selected currency (no conversion, intentional)
4. **Offline**: Falls back to hardcoded approximate rates

## Future Enhancements

- Manual rate override (for users who want fixed rates)
- Per-account display currency
- Historical rate comparison
- Rate refresh indicator
