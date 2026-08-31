/**
 * Reports Page Module
 * Renders the Reports & Export page using existing domain functions
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

export function renderReportsPage(year, month) {
  const txns      = appState.get('transactions') || [];
  const accounts  = appState.get('accounts') || [];
  const budgets   = appState.get('budgets') || [];
  const currency  = getUserCurrency();
  const sourceCurrency = detectDominantCurrency(
    accounts.map(a => ({ amount: a.saldo || 0, currency: a.mataUang || currency }))
  );
  const fc = (amt) => formatCurrency(amt, currency, { fromCurrency: sourceCurrency });

  const periodTxns = getTransactionsForPeriod(txns, year, month);

  // ── Summary metrics ──
  const monthIncome  = calculateMonthlyIncome(txns, year, month);
  const monthExpenses = calculateMonthlyExpenses(txns, year, month);
  const cashFlow     = monthIncome - monthExpenses;
  const savingsRate  = monthIncome > 0 ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100) : 0;
  const txnCount     = periodTxns.length;

  // ── Income by source ──
  const sources = incomeBySource(txns, year, month);
  const sortedSources = Object.entries(sources).sort((a, b) => b[1] - a[1]);
  const topSource = sortedSources.length > 0 ? sortedSources[0] : null;

  // ── Spending by category ──
  const categories = spendingByCategory(txns, year, month);
  const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

  const el = document.createElement('div');
  el.className = 'space-y-6';

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
            ${sortedSources.map(([source, amount]) => {
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
            ${sortedCategories.map(([cat, amount]) => {
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

    <!-- RECENT TRANSACTIONS TABLE -->
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
              ${sortTransactions(periodTxns, 'tanggal', 'desc').slice(0, 20).map(tx => {
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
        ${periodTxns.length > 20 ? `
          <div class="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-center">
            <p class="text-xs text-gray-500 dark:text-gray-400">Showing 20 of ${periodTxns.length} transactions</p>
          </div>
        ` : ''}
      `}
    </div>
  `;

  // ── Bind export buttons ──
  requestAnimationFrame(() => {
    const csvBtn = el.querySelector('#btn-export-csv');
    const jsonBtn = el.querySelector('#btn-export-json');

    if (csvBtn) {
      csvBtn.addEventListener('click', () => {
        const csv = generateCSV(periodTxns, accounts);
        const monthName = new Date(year, month).toLocaleString('en', { month: 'long', year: 'numeric' });
        downloadFile(csv, `kocekku-report-${monthName.replace(' ', '-')}.csv`, 'text/csv');
        appState.showToast({ type: 'success', message: t('reports.csvSuccess') });
      });
    }

    if (jsonBtn) {
      jsonBtn.addEventListener('click', () => {
        const data = {
          version: '2.0.0',
          exportDate: new Date().toISOString(),
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
        downloadFile(json, `kocekku-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        appState.showToast({ type: 'success', message: t('reports.jsonSuccess') });
      });
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ attrs: { class: 'w-4 h-4' }, nameAttr: 'data-lucide' });
    }
  });

  return el;
}
