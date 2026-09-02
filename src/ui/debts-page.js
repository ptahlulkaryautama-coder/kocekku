/**
 * Debts & Lending Page Module
 * Track money lent to others and borrowed from others.
 * Supports QR code sharing and overdue notifications.
 */

import { t } from '../i18n/index.js';
import { formatCurrency, detectDominantCurrency } from '../formatting/currency.js';
import { formatDate } from '../formatting/dates.js';
import { appState } from '../app/state.js';
import { saveData } from '../app/bootstrap.js';

function getUserCurrency() {
  return appState.get('currency') || 'IDR';
}

/**
 * Get debts from app state
 */
function getDebts() {
  return appState.get('debts') || [];
}

/**
 * Save debts to app state
 */
function saveDebts(debts) {
  appState.set('debts', debts);
  saveData();
}

/**
 * Calculate days until due date
 */
function daysUntilDue(dueDate) {
  if (!dueDate) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

/**
 * Get status color class
 */
function getStatusColor(status, daysLeft) {
  if (status === 'settled') return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' };
  if (daysLeft < 0) return { bg: 'bg-danger-50 dark:bg-danger-900/20', text: 'text-danger-600 dark:text-danger-400', dot: 'bg-danger-500' };
  if (daysLeft <= 3) return { bg: 'bg-warning-50 dark:bg-warning-900/20', text: 'text-warning-600 dark:text-warning-400', dot: 'bg-warning-500' };
  return { bg: 'bg-success-50 dark:bg-success-900/20', text: 'text-success-600 dark:text-success-400', dot: 'bg-success-500' };
}

/**
 * Render the Debts page
 */
export function renderDebtsPage() {
  const debts = getDebts();
  const accounts = appState.get('accounts') || [];
  const currency = getUserCurrency();
  const sourceCurrency = detectDominantCurrency(
    accounts.map(a => ({ amount: a.saldo || 0, currency: a.mataUang || currency }))
  );
  const fc = (amt) => formatCurrency(amt, currency, { fromCurrency: sourceCurrency });

  // Filter states
  let filter = 'all'; // all, lent, borrowed, overdue, settled
  let showAddModal = false;

  const el = document.createElement('div');
  el.className = 'space-y-6';

  function render() {
    // Filter debts
    let filtered = debts;
    if (filter === 'lent') filtered = debts.filter(d => d.type === 'lent');
    else if (filter === 'borrowed') filtered = debts.filter(d => d.type === 'borrowed');
    else if (filter === 'overdue') filtered = debts.filter(d => d.status !== 'settled' && daysUntilDue(d.dueDate) < 0);
    else if (filter === 'settled') filtered = debts.filter(d => d.status === 'settled');
    else filtered = debts.filter(d => d.status !== 'settled'); // 'all' shows active by default

    // Sort: overdue first, then by due date
    filtered.sort((a, b) => {
      if (a.status === 'settled' && b.status !== 'settled') return 1;
      if (a.status !== 'settled' && b.status === 'settled') return -1;
      const daysA = daysUntilDue(a.dueDate);
      const daysB = daysUntilDue(b.dueDate);
      return daysA - daysB;
    });

    // Summary stats
    const activeDebts = debts.filter(d => d.status !== 'settled');
    const totalLent = activeDebts.filter(d => d.type === 'lent').reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
    const totalBorrowed = activeDebts.filter(d => d.type === 'borrowed').reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
    const totalOverdue = activeDebts.filter(d => daysUntilDue(d.dueDate) < 0).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

    el.innerHTML = `
      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${t('debts.title')}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${t('debts.subtitle')}</p>
        </div>
        <div class="flex gap-2">
          <button id="debts-add" class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
            <i data-lucide="plus" class="w-4 h-4"></i>
            ${t('debts.addDebt')}
          </button>
        </div>
      </div>

      <!-- SUMMARY CARDS -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('debts.totalLent')}</p>
          <p class="text-xl font-bold text-success-600 dark:text-success-400 mt-1">${fc(totalLent)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('debts.totalBorrowed')}</p>
          <p class="text-xl font-bold text-danger-600 dark:text-danger-400 mt-1">${fc(totalBorrowed)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('debts.active')}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">${activeDebts.length}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${t('debts.overdue')}</p>
          <p class="text-xl font-bold ${totalOverdue > 0 ? 'text-danger-600 dark:text-danger-400' : 'text-gray-900 dark:text-white'} mt-1">${fc(totalOverdue)}</p>
        </div>
      </div>

      <!-- FILTER TABS -->
      <div class="flex gap-2 flex-wrap">
        ${['all', 'lent', 'borrowed', 'overdue', 'settled'].map(f => `
          <button data-filter="${f}" class="debt-filter px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}">
            ${t('debts.' + f)}
          </button>
        `).join('')}
      </div>

      <!-- DEBT LIST -->
      ${filtered.length === 0 ? `
        <div class="text-center py-16">
          <i data-lucide="hand-coins" class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"></i>
          <p class="text-gray-500 dark:text-gray-400">${t('debts.noDebts')}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${t('debts.noDebtsDesc')}</p>
        </div>
      ` : `
        <div class="space-y-3">
          ${filtered.map(debt => {
            const daysLeft = daysUntilDue(debt.dueDate);
            const colors = getStatusColor(debt.status, daysLeft);
            const isSettled = debt.status === 'settled';
            const isLent = debt.type === 'lent';

            let statusText = '';
            if (isSettled) statusText = t('debts.settled');
            else if (daysLeft < 0) statusText = t('debts.daysOverdue', { days: Math.abs(daysLeft) });
            else if (daysLeft === 0) statusText = t('debts.dueToday');
            else statusText = t('debts.daysUntilDue', { days: daysLeft });

            return `
              <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 ${isSettled ? 'opacity-60' : ''}">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <div class="w-8 h-8 rounded-full ${isLent ? 'bg-success-100 dark:bg-success-900/30' : 'bg-danger-100 dark:bg-danger-900/30'} flex items-center justify-center flex-shrink-0">
                        <i data-lucide="${isLent ? 'arrow-up-right' : 'arrow-down-left'}" class="w-4 h-4 ${isLent ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}"></i>
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${debt.person || 'Unknown'}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${debt.description || (isLent ? t('debts.lent') : t('debts.borrowed'))}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 mt-2">
                      <span class="text-lg font-bold ${isLent ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}">
                        ${isLent ? '+' : '-'}${fc(debt.amount)}
                      </span>
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${colors.bg} ${colors.text}">
                        <span class="w-1.5 h-1.5 rounded-full ${colors.dot}"></span>
                        ${statusText}
                      </span>
                    </div>
                    ${debt.notes ? `<p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5 italic">${debt.notes}</p>` : ''}
                    <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">${t('debts.createdAt')}: ${debt.createdAt ? new Date(debt.createdAt).toLocaleDateString() : '—'}</p>
                  </div>
                  <div class="flex flex-col gap-1.5 flex-shrink-0">
                    ${!isSettled ? `
                      <button data-settle="${debt.id}" class="px-3 py-1.5 bg-success-600 text-white text-xs font-medium rounded-lg hover:bg-success-700 transition-colors">
                        ${t('debts.markSettled')}
                      </button>
                      <button data-delete="${debt.id}" class="px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        ${t('debts.delete')}
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;

    // ── Bind events ──
    requestAnimationFrame(() => {
      // Filter tabs
      el.querySelectorAll('.debt-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          filter = btn.dataset.filter;
          render();
        });
      });

      // Add debt button
      el.querySelector('#debts-add')?.addEventListener('click', () => showAddDebtModal());

      // Settle buttons
      el.querySelectorAll('[data-settle]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.settle;
          const debt = debts.find(d => d.id === id);
          if (debt) {
            debt.status = 'settled';
            debt.settledAt = new Date().toISOString();
            saveDebts(debts);
            appState.showToast({ type: 'success', message: t('debts.debtPaid') });
            render();
          }
        });
      });

      // Delete buttons
      el.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.delete;
          const confirmed = await appState.confirm({
            title: t('debts.delete'),
            message: t('debts.confirmDelete'),
            type: 'danger',
          });
          if (confirmed) {
            const idx = debts.findIndex(d => d.id === id);
            if (idx !== -1) {
              debts.splice(idx, 1);
              saveDebts(debts);
              appState.showToast({ type: 'success', message: t('debts.debtDeleted') });
              render();
            }
          }
        });
      });

      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ attrs: { class: 'w-4 h-4' }, nameAttr: 'data-lucide' });
      }
    });
  }

  function showAddDebtModal() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.innerHTML = `
      <div class="p-5 sm:p-6 space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">${t('debts.addDebt')}</h2>
          <button class="debt-close p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
          </button>
        </div>

        <!-- Type Selection -->
        <div class="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          <button data-type="lent" class="debt-type flex-1 py-2.5 rounded-lg text-sm font-medium transition-all bg-white dark:bg-gray-700 text-success-600 shadow-sm">
            <i data-lucide="arrow-up-right" class="w-4 h-4 inline mr-1"></i>${t('debts.lent')}
          </button>
          <button data-type="borrowed" class="debt-type flex-1 py-2.5 rounded-lg text-sm font-medium transition-all text-gray-500 dark:text-gray-400">
            <i data-lucide="arrow-down-left" class="w-4 h-4 inline mr-1"></i>${t('debts.borrowed')}
          </button>
        </div>

        <!-- Person -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.person')}</label>
          <input id="debt-person" type="text" placeholder="${t('debts.personPlaceholder')}"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.amount')}</label>
          <div class="flex items-center gap-2">
            <span class="text-lg font-bold text-gray-400 dark:text-gray-500">${getCurrencySymbol(currency)}</span>
            <input id="debt-amount" type="number" min="0" step="any" placeholder="0"
              class="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-bold text-gray-900 dark:text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              inputmode="decimal">
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.description')}</label>
          <input id="debt-desc" type="text" placeholder="${t('debts.descriptionPlaceholder')}"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>

        <!-- Due Date -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.dueDate')}</label>
          <input id="debt-due" type="date" value="${getDefaultDueDate()}"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.notes')}</label>
          <textarea id="debt-notes" rows="2" placeholder="${t('debts.notesPlaceholder')}"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"></textarea>
        </div>

        <!-- Save -->
        <button id="debt-save" class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors shadow-sm">
          ${t('debts.addDebt')}
        </button>
      </div>
    `;

    // Bind events
    let selectedType = 'lent';

    modal.querySelector('.debt-close')?.addEventListener('click', () => overlay.remove());

    modal.querySelectorAll('.debt-type').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedType = btn.dataset.type;
        modal.querySelectorAll('.debt-type').forEach(b => {
          b.classList.remove('bg-white', 'dark:bg-gray-700', 'shadow-sm');
          if (b.dataset.type === 'lent') b.classList.remove('text-success-600');
          if (b.dataset.type === 'borrowed') b.classList.remove('text-danger-600');
        });
        btn.classList.add('bg-white', 'dark:bg-gray-700', 'shadow-sm');
        if (selectedType === 'lent') btn.classList.add('text-success-600');
        if (selectedType === 'borrowed') btn.classList.add('text-danger-600');
      });
    });

    modal.querySelector('#debt-save')?.addEventListener('click', () => {
      const person = modal.querySelector('#debt-person')?.value?.trim();
      const amount = parseFloat(modal.querySelector('#debt-amount')?.value) || 0;
      const description = modal.querySelector('#debt-desc')?.value?.trim();
      const dueDate = modal.querySelector('#debt-due')?.value;
      const notes = modal.querySelector('#debt-notes')?.value?.trim();

      if (!person) {
        appState.showToast({ type: 'error', message: 'Please enter a name.' });
        return;
      }
      if (amount <= 0) {
        appState.showToast({ type: 'error', message: 'Please enter an amount.' });
        return;
      }

      const newDebt = {
        id: `debt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: selectedType,
        person,
        amount,
        description: description || (selectedType === 'lent' ? 'Lent' : 'Borrowed'),
        dueDate: dueDate || null,
        notes: notes || '',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      debts.push(newDebt);
      saveDebts(debts);
      appState.showToast({ type: 'success', message: t('debts.addDebt') });
      overlay.remove();
      render();
    });

    setTimeout(() => modal.querySelector('#debt-person')?.focus(), 100);

    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ attrs: { class: 'w-4 h-4' }, nameAttr: 'data-lucide' });
    }
  }

  render();
  return el;
}

function getDefaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30); // Default: 30 days from now
  return d.toISOString().split('T')[0];
}

function getCurrencySymbol(code) {
  const symbols = { IDR: 'Rp', USD: '$', SGD: 'S$', MYR: 'RM', EUR: '€', GBP: '£', AUD: 'A$', JPY: '¥', AED: 'د.إ', SAR: 'ر.س' };
  return symbols[code] || code;
}
