/**
 * Reports Page Module
 * Renders the Reports & Export page with custom date ranges and comparisons
 */

import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateCashFlow,
  spendingByCategory,
  incomeBySource,
  getTransactionsForPeriod,
  sortTransactions,
} from '../domain/transactions.js';

import { t } from '../i18n/index.js';
import { formatCurrency, detectDominantCurrency } from '../formatting/currency.js';
import { appState } from '../app/state.js';

function getUserCurrency() {
  return appState.get('currency') || 'IDR';
}

function generateCSV(transactions, accounts) {
  const accountMap = {};
  accounts.forEach(a => { accountMap[a.id] = a.nama; });

  const header = 'Date,Description,Amount,Type,Account,Category,Member,Notes';
  const rows = transactions.map(t => {
    const type = t.tipe === 'masuk' ? 'Income' : t.tipe === 'keluar' ? 'Expense' : 'Transfer';
    const account = accountMap[t.dompet] || t.dompet || '';
    return [
      t.tanggal,
      `"${(t.keterangan || '').replace(/"/g, '""')}"`,
      t.jumlah,
      type,
      `"${account}"`,
      `"${t.kategori || ''}"`,
      `"${t.pengeluar || ''}"`,
      `"${(t.catatan || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatPercent(value, total) {
  if (total <= 0) return '0%';
  return Math.round((value / total) * 100) + '%';
}

/**
 * Get transactions for a custom date range
 */
function getTransactionsForDateRange(txns, startDate, endDate) {
  return txns.filter(tx => {
    if (!tx.tanggal) return false;
    return tx.tanggal >= startDate && tx.tanggal <= endDate;
  });
}

/**
 * Get monthly data for comparison (last N months)
 */
function getMonthlyComparison(txns, year, month) {
  const results = [];
  for (let i = 0; i < 6; i++) {
    let m = month - i;
    let y = year;
    while (m < 0) { m += 12; y--; }
    const income = calculateMonthlyIncome(txns, y, m);
    const expenses = calculateMonthlyExpenses(txns, y, m);
    const date = new Date(y, m);
    results.unshift({
      label: date.toLocaleString('en', { month: 'short', year: 'numeric' }),
      income,
      expenses,
      savings: income - expenses,
      savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
    });
  }
  return results;
}

export function renderReportsPage(year, month) {
  const txns      = appState.get('transactions') || [];
  const accounts  = appState.get('accounts') || [];
  const currency  = getUserCurrency();
  const sourceCurrency = detectDominantCurrency(
    accounts.map(a => ({ amount: a.saldo || 0, currency: a.mataUang || currency }))
  );
  const fc = (amt) => formatCurrency(amt, currency, { fromCurrency: sourceCurrency });

  // ── State for date range ──
  const state = {
    mode: 'month', // 'month' | 'range'
    year,
    month,
    startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    endDate: new Date(year, month + 1, 0).toISOString().slice(0, 10),
  };

  const el = document.createElement('div');
  el.className = 'space-y-6';

  function render() {
    // Get transactions based on mode
    let periodTxns;
    let periodLabel;

    if (state.mode === 'range') {
      periodTxns = getTransactionsForDateRange(txns, state.startDate, state.endDate);
      const start = new Date(state.startDate);
      const end = new Date(state.endDate);
      periodLabel = `${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      periodTxns = getTransactionsForPeriod(txns, state.year, state.month);
      periodLabel = new Date(state.year, state.month).toLocaleString('en', { month: 'long', year: 'numeric' });
    }

    // ── Summary metrics ──
    let monthIncome, monthExpenses;
    if (state.mode === 'range') {
      monthIncome = periodTxns.filter(t => t.tipe === 'masuk').reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);
      monthExpenses = periodTxns.filter(t => t.tipe === 'keluar').reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);
    } else {
      monthIncome = calculateMonthlyIncome(txns, state.year, state.month);
      monthExpenses = calculateMonthlyExpenses(txns, state.year, state.month);
    }
    const cashFlow = monthIncome - monthExpenses;
    const savingsRate = monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0;
    const txnCount = periodTxns.length;

    // ── Category & source breakdown ──
    let categories, sortedCategories, topCategory;
    let sources, sortedSources, topSource;

    if (state.mode === 'range') {
      // Manual breakdown for custom range
      const catMap = {};
      const srcMap = {};
      periodTxns.forEach(tx => {
        if (tx.tipe === 'keluar') {
          const cat = tx.kategori || 'Other';
          catMap[cat] = (catMap[cat] || 0) + (parseFloat(tx.jumlah) || 0);
        }
        if (tx.tipe === 'masuk') {
          const src = tx.kategori || 'Other';
          srcMap[src] = (srcMap[src] || 0) + (parseFloat(tx.jumlah) || 0);
        }
      });
      sortedCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
      sortedSources = Object.entries(srcMap).sort((a, b) => b[1] - a[1]);
    } else {
      categories = spendingByCategory(txns, state.year, state.month);
      sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
      sources = incomeBySource(txns, state.year, state.month);
      sortedSources = Object.entries(sources).sort((a, b) => b[1] - a[1]);
    }
    topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;
    topSource = sortedSources.length > 0 ? sortedSources[0] : null;

    // ── Monthly comparison (only in month mode) ──
    const comparison = state.mode === 'month' ? getMonthlyComparison(txns, state.year, state.month) : null;

    el.innerHTML = `
      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${t('reports.title')}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${t('reports.subtitle')}</p>
        </div>
        <div class="flex gap-2">
          <button id="btn-export-csv" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <i data-lucide="download" class="w-4 h-4"></i>
            ${t('reports.exportCSV')}
          </button>
          <button id="btn-export-json" class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
            <i data-lucide="file-json" class="w-4 h-4"></i>
            ${t('reports.exportJSON')}
          </button>
        </div>
      </div>

      <!-- PERIOD SELECTOR -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex gap-2 flex-wrap">
            <button data-period="month" class="period-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state.mode === 'month' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}">${t('reports.thisMonth')}</button>
            <button data-period="lastMonth" class="period-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">${t('reports.lastMonth')}</button>
            <button data-period="year" class="period-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">${t('reports.thisYear')}</button>
            <button data-period="range" class="period-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state.mode === 'range' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}">${t('reports.dateRange')}</button>
          </div>
          <div class="flex-1 text-right">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${periodLabel}</span>
          </div>
        </div>
        <!-- Custom date range inputs (hidden unless range mode) -->
        <div id="date-range-inputs" class="mt-3 flex gap-3 items-center ${state.mode === 'range' ? '' : 'hidden'}">
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 dark:text-gray-400">${t('reports.startDate')}</label>
            <input type="date" id="start-date" value="${state.startDate}" class="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <span class="text-gray-400">–</span>
          <div class="flex items-center gap-2">
            <label class="text-xs text-gray-500 dark:text-gray-400">${t('reports.endDate')}</label>
            <input type="date" id="end-date" value="${state.endDate}" class="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </div>

      <!-- SUMMARY METRICS -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('reports.totalIncome')}</p>
          <p class="text-xl font-bold text-success-600 dark:text-success-400 mt-1">${fc(monthIncome)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('reports.totalExpenses')}</p>
          <p class="text-xl font-bold text-danger-600 dark:text-danger-400 mt-1">${fc(monthExpenses)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('reports.netCashFlow')}</p>
          <p class="text-xl font-bold ${cashFlow >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'} mt-1">${fc(cashFlow)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('reports.savingsRate')}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">${savingsRate}%</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('reports.transactionCount')}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">${txnCount}</p>
        </div>
      </div>

      ${comparison ? `
      <!-- MONTHLY TREND (6-month comparison) -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">6-Month Trend</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-700">
                <th class="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Month</th>
                <th class="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Income</th>
                <th class="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Expenses</th>
                <th class="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Savings</th>
                <th class="text-right px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Rate</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-700/50">
              ${comparison.map((row, i) => {
                const isCurrent = i === comparison.length - 1;
                return `
                <tr class="${isCurrent ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}">
                  <td class="px-3 py-2 font-medium ${isCurrent ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}">${row.label}</td>
                  <td class="px-3 py-2 text-right text-success-600 dark:text-success-400">${fc(row.income)}</td>
                  <td class="px-3 py-2 text-right text-danger-600 dark:text-danger-400">${fc(row.expenses)}</td>
                  <td class="px-3 py-2 text-right ${row.savings >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}">${fc(row.savings)}</td>
                  <td class="px-3 py-2 text-right font-medium text-gray-900 dark:text-white">${row.savingsRate}%</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- INCOME & EXPENSE BREAKDOWN -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- INCOME BY SOURCE -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${t('reports.incomeReport')}</h2>
            ${topSource ? `<span class="text-xs px-2.5 py-1 rounded-full bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 font-medium">${topSource[0]}</span>` : ''}
          </div>
          ${sortedSources.length === 0 ? `
            <div class="text-center py-8">
              <p class="text-sm text-gray-500 dark:text-gray-400">${t('reports.noData')}</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${sortedSources.slice(0, 8).map(([source, amount]) => {
                const pct = monthIncome > 0 ? Math.round((amount / monthIncome) * 100) : 0;
                return `
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium text-gray-900 dark:text-white">${source}</span>
                      <span class="text-sm font-semibold text-gray-900 dark:text-white">${fc(amount)}</span>
                    </div>
                    <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-success-500 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${pct}%</p>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- EXPENSE BY CATEGORY -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${t('reports.expenseReport')}</h2>
            ${topCategory ? `<span class="text-xs px-2.5 py-1 rounded-full bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 font-medium">${topCategory[0]}</span>` : ''}
          </div>
          ${sortedCategories.length === 0 ? `
            <div class="text-center py-8">
              <p class="text-sm text-gray-500 dark:text-gray-400">${t('reports.noData')}</p>
            </div>
          ` : `
            <div class="space-y-3">
              ${sortedCategories.slice(0, 8).map(([cat, amount]) => {
                const pct = monthExpenses > 0 ? Math.round((amount / monthExpenses) * 100) : 0;
                return `
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium text-gray-900 dark:text-white">${cat}</span>
                      <span class="text-sm font-semibold text-gray-900 dark:text-white">${fc(amount)}</span>
                    </div>
                    <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-danger-500 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${pct}%</p>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- TRANSACTIONS TABLE -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
        <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${t('reports.allTransactions')}</h2>
        </div>
        ${periodTxns.length === 0 ? `
          <div class="text-center py-12">
            <p class="text-sm text-gray-500 dark:text-gray-400">${t('reports.noDataDesc')}</p>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-gray-100 dark:border-gray-700">
                  <th class="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('reports.period')}</th>
                  <th class="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('transactions.description')}</th>
                  <th class="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('reports.category')}</th>
                  <th class="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('transactions.amount')}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50 dark:divide-gray-700/50">
                ${sortTransactions(periodTxns, 'tanggal', 'desc').slice(0, 50).map(tx => {
                  const isIncome = tx.tipe === 'masuk';
                  const isTransfer = tx.tipe === 'transfer';
                  const amountColor = isIncome ? 'text-success-600 dark:text-success-400' : isTransfer ? 'text-info-600 dark:text-info-400' : 'text-danger-600 dark:text-danger-400';
                  const prefix = isIncome ? '+' : isTransfer ? '' : '-';
                  return `
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td class="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">${tx.tanggal}</td>
                    <td class="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">${tx.keterangan || '—'}</td>
                    <td class="px-5 py-3 text-sm text-gray-600 dark:text-gray-400">${tx.kategori || '—'}</td>
                    <td class="px-5 py-3 text-sm font-semibold text-right ${amountColor}">${prefix}${fc(tx.jumlah)}</td>
                  </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          ${periodTxns.length > 50 ? `
            <div class="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-center">
              <p class="text-xs text-gray-500 dark:text-gray-400">Showing 50 of ${periodTxns.length} transactions</p>
            </div>
          ` : ''}
        `}
      </div>
    `;

    // ── Bind event handlers ──
    requestAnimationFrame(() => {
      // Period buttons
      el.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const period = btn.dataset.period;
          const now = new Date();

          if (period === 'month') {
            state.mode = 'month';
            state.year = now.getFullYear();
            state.month = now.getMonth();
          } else if (period === 'lastMonth') {
            state.mode = 'month';
            let m = now.getMonth() - 1;
            let y = now.getFullYear();
            if (m < 0) { m = 11; y--; }
            state.year = y;
            state.month = m;
          } else if (period === 'year') {
            state.mode = 'range';
            state.startDate = `${now.getFullYear()}-01-01`;
            state.endDate = `${now.getFullYear()}-12-31`;
          } else if (period === 'range') {
            state.mode = 'range';
            // Keep current dates or set defaults
            if (!state.startDate) state.startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            if (!state.endDate) state.endDate = now.toISOString().slice(0, 10);
          }

          render();
        });
      });

      // Date range inputs
      const startInput = el.querySelector('#start-date');
      const endInput = el.querySelector('#end-date');
      if (startInput) {
        startInput.addEventListener('change', (e) => {
          state.startDate = e.target.value;
          render();
        });
      }
      if (endInput) {
        endInput.addEventListener('change', (e) => {
          state.endDate = e.target.value;
          render();
        });
      }

      // Export CSV
      const csvBtn = el.querySelector('#btn-export-csv');
      if (csvBtn) {
        csvBtn.addEventListener('click', () => {
          const csv = generateCSV(periodTxns, accounts);
          const rangeStr = state.mode === 'range' ? `${state.startDate}-to-${state.endDate}` : `${state.year}-${String(state.month + 1).padStart(2, '0')}`;
          downloadFile(csv, `sakku-report-${rangeStr}.csv`, 'text/csv');
          appState.showToast({ type: 'success', message: t('reports.csvSuccess') });
        });
      }

      // Export JSON
      const jsonBtn = el.querySelector('#btn-export-json');
      if (jsonBtn) {
        jsonBtn.addEventListener('click', () => {
          const data = {
            version: '2.0.0',
            exportDate: new Date().toISOString(),
            period: state.mode === 'range' ? { start: state.startDate, end: state.endDate } : { year: state.year, month: state.month },
            data: {
              accounts: appState.get('accounts'),
              transactions: appState.get('transactions'),
              budgets: appState.get('budgets'),
              goals: appState.get('goals'),
              bills: appState.get('bills'),
              members: appState.get('familyMembers'),
            }
          };
          const json = JSON.stringify(data, null, 2);
          downloadFile(json, `sakku-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
          appState.showToast({ type: 'success', message: t('reports.jsonSuccess') });
        });
      }

      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ attrs: { class: 'w-4 h-4' }, nameAttr: 'data-lucide' });
      }
    });
  }

  render();
  return el;
}
