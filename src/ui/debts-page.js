/**
 * Debts & Lending Page Module
 * Track money lent to others and borrowed from others.
 * Supports installment plans, partial payments, and payment schedules.
 */

import { t } from '../i18n/index.js';
import { formatCurrency, detectDominantCurrency } from '../formatting/currency.js';
import { formatDate } from '../formatting/dates.js';
import { appState } from '../app/state.js';
import { saveData } from '../app/bootstrap.js';

function getUserCurrency() {
  return appState.get('currency') || 'IDR';
}

function getCurrencySymbol(code) {
  const symbols = { IDR: 'Rp', USD: '$', SGD: 'S$', MYR: 'RM', EUR: '€', GBP: '£', AUD: 'A$', JPY: '¥', AED: 'د.إ', SAR: 'ر.س' };
  return symbols[code] || code;
}

/** Get debts from app state */
function getDebts() {
  return appState.get('debts') || [];
}

/** Save debts to app state */
function saveDebts(debts) {
  appState.set('debts', debts);
  saveData();
}

/** Calculate days until due date */
function daysUntilDue(dueDate) {
  if (!dueDate) return Infinity;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

/** Get status color class */
function getStatusColor(status, daysLeft) {
  if (status === 'settled') return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400' };
  if (daysLeft < 0) return { bg: 'bg-danger-50 dark:bg-danger-900/20', text: 'text-danger-600 dark:text-danger-400', dot: 'bg-danger-500' };
  if (daysLeft <= 3) return { bg: 'bg-warning-50 dark:bg-warning-900/20', text: 'text-warning-600 dark:text-warning-400', dot: 'bg-warning-500' };
  return { bg: 'bg-success-50 dark:bg-success-900/20', text: 'text-success-600 dark:text-success-400', dot: 'bg-success-500' };
}

/** Calculate installment plan defaults */
function calculateInstallmentDefaults(totalAmount, frequency, numPayments) {
  if (!numPayments || numPayments <= 0) return null;
  const perPayment = Math.ceil(totalAmount / numPayments);
  const payments = [];

  for (let i = 0; i < numPayments; i++) {
    const dueDate = new Date();
    if (frequency === 'weekly') dueDate.setDate(dueDate.getDate() + (i + 1) * 7);
    else if (frequency === 'biweekly') dueDate.setDate(dueDate.getDate() + (i + 1) * 14);
    else dueDate.setMonth(dueDate.getMonth() + i + 1);

    payments.push({
      id: `inst_${Date.now()}_${i}`,
      number: i + 1,
      amount: perPayment,
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'pending',
      paidDate: null,
      paidAmount: null,
      note: '',
    });
  }

  return {
    total: totalAmount,
    perPayment,
    frequency,
    numPayments,
    payments,
  };
}

/** Calculate total paid and remaining for a debt */
function getDebtProgress(debt) {
  if (!debt.installmentPlan) {
    return {
      total: debt.amount,
      paid: debt.status === 'settled' ? debt.amount : 0,
      remaining: debt.status === 'settled' ? 0 : debt.amount,
      percentage: debt.status === 'settled' ? 100 : 0,
      isFullyPaid: debt.status === 'settled',
      paidCount: debt.status === 'settled' ? 1 : 0,
      totalCount: 1,
      nextDueDate: debt.dueDate,
    };
  }

  const plan = debt.installmentPlan;
  const paidPayments = plan.payments.filter(p => p.status === 'paid');
  const totalPaid = paidPayments.reduce((sum, p) => sum + (p.paidAmount || p.amount), 0);
  const remaining = Math.max(0, plan.total - totalPaid);
  const percentage = Math.min(100, Math.round((totalPaid / plan.total) * 100));
  const isFullyPaid = remaining <= 0;

  // Find next pending payment
  const nextPending = plan.payments.find(p => p.status === 'pending');

  return {
    total: plan.total,
    paid: totalPaid,
    remaining,
    percentage,
    isFullyPaid,
    paidCount: paidPayments.length,
    totalCount: plan.payments.length,
    nextDueDate: nextPending?.dueDate || null,
  };
}

/** Update debt status based on installment progress */
function updateDebtStatus(debt) {
  const progress = getDebtProgress(debt);
  if (progress.isFullyPaid) {
    debt.status = 'settled';
    debt.settledAt = new Date().toISOString();
  } else {
    debt.status = 'active';
  }
}

/** Render the Debts page */
export function renderDebtsPage() {
  const debts = getDebts();
  const accounts = appState.get('accounts') || [];
  const currency = getUserCurrency();
  const sourceCurrency = detectDominantCurrency(
    accounts.map(a => ({ amount: a.saldo || 0, currency: a.mataUang || currency }))
  );
  const fc = (amt) => formatCurrency(amt, currency, { fromCurrency: sourceCurrency });

  let filter = 'all';
  let expandedDebt = null; // track which debt card is expanded for payment history
  let debtTab = 'schedule'; // schedule or history (for expanded debt)

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
    const totalLent = activeDebts.filter(d => d.type === 'lent').reduce((s, d) => {
      const progress = getDebtProgress(d);
      return s + progress.remaining;
    }, 0);
    const totalBorrowed = activeDebts.filter(d => d.type === 'borrowed').reduce((s, d) => {
      const progress = getDebtProgress(d);
      return s + progress.remaining;
    }, 0);
    const totalOverdue = activeDebts.filter(d => daysUntilDue(d.dueDate) < 0).reduce((s, d) => {
      const progress = getDebtProgress(d);
      return s + progress.remaining;
    }, 0);

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
            const progress = getDebtProgress(debt);
            const hasInstallments = !!debt.installmentPlan;
            const isExpanded = expandedDebt === debt.id;

            let statusText = '';
            if (isSettled) statusText = t('debts.fullyPaid');
            else if (progress.isFullyPaid) statusText = t('debts.fullyPaid');
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

                    ${hasInstallments ? `
                      <!-- Progress Bar -->
                      <div class="mt-3">
                        <div class="flex items-center justify-between mb-1.5">
                          <span class="text-lg font-bold ${isLent ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}">
                            ${fc(progress.remaining)}
                          </span>
                          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                            ${progress.paidCount}/${progress.totalCount} ${t('debts.paid').toLowerCase()}
                          </span>
                        </div>
                        <div class="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-500 ${progress.percentage >= 100 ? 'bg-success-500' : progress.percentage > 50 ? 'bg-primary-500' : 'bg-warning-500'}" style="width: ${progress.percentage}%"></div>
                        </div>
                        <div class="flex items-center justify-between mt-1">
                          <span class="text-[11px] text-gray-400 dark:text-gray-500">${fc(progress.paid)} ${t('debts.paid').toLowerCase()}</span>
                          <span class="text-[11px] text-gray-400 dark:text-gray-500">${progress.percentage}%</span>
                        </div>
                      </div>

                      <!-- Next Due Date -->
                      ${progress.nextDueDate && !progress.isFullyPaid ? `
                        <div class="flex items-center gap-1.5 mt-2">
                          <i data-lucide="calendar" class="w-3 h-3 text-gray-400"></i>
                          <span class="text-[11px] text-gray-500 dark:text-gray-400">${t('debts.nextDueDate')}: ${new Date(progress.nextDueDate).toLocaleDateString()}</span>
                        </div>
                      ` : ''}
                    ` : `
                      <!-- Simple Debt (no installments) -->
                      <div class="flex items-center gap-3 mt-2">
                        <span class="text-lg font-bold ${isLent ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}">
                          ${isLent ? '+' : '-'}${fc(debt.amount)}
                        </span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${colors.bg} ${colors.text}">
                          <span class="w-1.5 h-1.5 rounded-full ${colors.dot}"></span>
                          ${statusText}
                        </span>
                      </div>
                    `}

                    ${debt.notes ? `<p class="text-xs text-gray-400 dark:text-gray-500 mt-1.5 italic">${debt.notes}</p>` : ''}
                    <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">${t('debts.createdAt')}: ${debt.createdAt ? new Date(debt.createdAt).toLocaleDateString() : '—'}</p>
                  </div>
                  <div class="flex flex-col gap-1.5 flex-shrink-0">
                    ${!isSettled && !progress.isFullyPaid ? `
                      <button data-record-payment="${debt.id}" class="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors">
                        ${t('debts.recordPayment')}
                      </button>
                      ${hasInstallments ? `
                        <button data-expand="${debt.id}" class="px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          ${isExpanded ? t('common.close') : t('debts.schedule')}
                        </button>
                      ` : ''}
                    ` : ''}
                    ${!isSettled && !hasInstallments ? `
                      <button data-settle="${debt.id}" class="px-3 py-1.5 bg-success-600 text-white text-xs font-medium rounded-lg hover:bg-success-700 transition-colors">
                        ${t('debts.markSettled')}
                      </button>
                    ` : ''}
                    <button data-delete="${debt.id}" class="px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      ${t('debts.delete')}
                    </button>
                  </div>
                </div>

                ${hasInstallments && isExpanded ? `
                  <!-- Expanded: Payment Schedule / History -->
                  <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div class="flex gap-2 mb-3">
                      <button data-debt-tab="schedule" data-debt-id="${debt.id}" class="debt-tab px-3 py-1 rounded-lg text-xs font-medium transition-colors ${debtTab === 'schedule' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}">
                        ${t('debts.schedule')}
                      </button>
                      <button data-debt-tab="history" data-debt-id="${debt.id}" class="debt-tab px-3 py-1 rounded-lg text-xs font-medium transition-colors ${debtTab === 'history' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}">
                        ${t('debts.history')}
                      </button>
                    </div>

                    ${debtTab === 'schedule' ? `
                      <!-- Payment Schedule -->
                      <div class="space-y-2">
                        ${debt.installmentPlan.payments.map(p => {
                          const pDaysLeft = daysUntilDue(p.dueDate);
                          const isPaid = p.status === 'paid';
                          const isOverdue = !isPaid && pDaysLeft < 0;
                          const isDueSoon = !isPaid && pDaysLeft >= 0 && pDaysLeft <= 3;

                          return `
                            <div class="flex items-center gap-3 p-2 rounded-xl ${isPaid ? 'bg-success-50 dark:bg-success-900/10' : isOverdue ? 'bg-danger-50 dark:bg-danger-900/10' : isDueSoon ? 'bg-warning-50 dark:bg-warning-900/10' : 'bg-gray-50 dark:bg-gray-800'}">
                              <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isPaid ? 'bg-success-100 dark:bg-success-900/30' : isOverdue ? 'bg-danger-100 dark:bg-danger-900/30' : 'bg-gray-100 dark:bg-gray-700'}">
                                ${isPaid ? '<i data-lucide="check" class="w-3.5 h-3.5 text-success-600 dark:text-success-400"></i>' : `<span class="text-xs font-bold ${isOverdue ? 'text-danger-600 dark:text-danger-400' : 'text-gray-500 dark:text-gray-400'}">${p.number}</span>`}
                              </div>
                              <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium ${isPaid ? 'text-success-700 dark:text-success-300' : 'text-gray-900 dark:text-white'}">
                                  ${t('debts.installment')} #${p.number} — ${fc(p.paidAmount || p.amount)}
                                </p>
                                <p class="text-[11px] ${isPaid ? 'text-success-500 dark:text-success-400' : isOverdue ? 'text-danger-500 dark:text-danger-400' : 'text-gray-400 dark:text-gray-500'}">
                                  ${isPaid ? `${t('debts.paid')} ${new Date(p.paidDate).toLocaleDateString()}` : `${t('debts.dueDate')}: ${new Date(p.dueDate).toLocaleDateString()}${isOverdue ? ' — ' + t('debts.daysOverdue', { days: Math.abs(pDaysLeft) }) : ''}`}
                                </p>
                              </div>
                              ${!isPaid ? `
                                <button data-pay-installment="${debt.id}" data-payment-id="${p.id}" class="px-2 py-1 bg-primary-600 text-white text-[11px] font-medium rounded-lg hover:bg-primary-700 transition-colors">
                                  ${t('debts.recordPayment')}
                                </button>
                              ` : ''}
                            </div>
                          `;
                        }).join('')}
                      </div>
                    ` : `
                      <!-- Payment History -->
                      <div class="space-y-2">
                        ${debt.installmentPlan.payments.filter(p => p.status === 'paid').length === 0 ? `
                          <p class="text-xs text-gray-400 dark:text-gray-500 text-center py-4">${t('debts.noPayments')}</p>
                        ` : debt.installmentPlan.payments.filter(p => p.status === 'paid').map(p => `
                          <div class="flex items-center gap-3 p-2 rounded-xl bg-success-50 dark:bg-success-900/10">
                            <div class="w-7 h-7 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center flex-shrink-0">
                              <i data-lucide="check" class="w-3.5 h-3.5 text-success-600 dark:text-success-400"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-xs font-medium text-success-700 dark:text-success-300">
                                ${t('debts.installment')} #${p.number} — ${fc(p.paidAmount || p.amount)}
                              </p>
                              <p class="text-[11px] text-success-500 dark:text-success-400">
                                ${t('debts.paid')} ${new Date(p.paidDate).toLocaleDateString()}${p.note ? ` — ${p.note}` : ''}
                              </p>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    `}
                  </div>
                ` : ''}
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

      // Expand/collapse
      el.querySelectorAll('[data-expand]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.expand;
          expandedDebt = expandedDebt === id ? null : id;
          debtTab = 'schedule';
          render();
        });
      });

      // Debt tabs (schedule/history)
      el.querySelectorAll('[data-debt-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          debtTab = btn.dataset.debtTab;
          render();
        });
      });

      // Record payment (simple debt or installment)
      el.querySelectorAll('[data-record-payment]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.recordPayment;
          const debt = debts.find(d => d.id === id);
          if (debt) showRecordPaymentModal(debt, null);
        });
      });

      // Pay specific installment
      el.querySelectorAll('[data-pay-installment]').forEach(btn => {
        btn.addEventListener('click', () => {
          const debtId = btn.dataset.payInstallment;
          const paymentId = btn.dataset.paymentId;
          const debt = debts.find(d => d.id === debtId);
          if (debt) showRecordPaymentModal(debt, paymentId);
        });
      });

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
              expandedDebt = null;
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

  /** Show Add Debt Modal */
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

        <!-- Installment Toggle -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <label class="flex items-center gap-3 cursor-pointer">
            <input id="debt-installment-toggle" type="checkbox" class="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">${t('debts.enableInstallments')}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Split into multiple payments</p>
            </div>
          </label>

          <!-- Installment Options (hidden by default) -->
          <div id="debt-installment-options" class="hidden mt-4 space-y-4">
            <!-- Frequency -->
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.frequency')}</label>
              <select id="debt-frequency"
                class="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="monthly">${t('debts.monthly')}</option>
                <option value="biweekly">${t('debts.biweekly')}</option>
                <option value="weekly">${t('debts.weekly')}</option>
              </select>
            </div>

            <!-- Number of Payments -->
            <div>
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.numberOfPayments')}</label>
              <input id="debt-num-payments" type="number" min="2" max="60" value="6"
                class="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            </div>

            <!-- Preview -->
            <div id="debt-installment-preview" class="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <!-- Filled dynamically -->
            </div>
          </div>
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

    // Installment toggle
    const installmentToggle = modal.querySelector('#debt-installment-toggle');
    const installmentOptions = modal.querySelector('#debt-installment-options');
    const installmentPreview = modal.querySelector('#debt-installment-preview');
    const numPaymentsInput = modal.querySelector('#debt-num-payments');
    const frequencySelect = modal.querySelector('#debt-frequency');
    const amountInput = modal.querySelector('#debt-amount');

    function updateInstallmentPreview() {
      const amount = parseFloat(amountInput?.value) || 0;
      const numPayments = parseInt(numPaymentsInput?.value) || 6;
      const frequency = frequencySelect?.value || 'monthly';

      if (amount <= 0 || numPayments < 2) {
        installmentPreview.innerHTML = '<span class="text-gray-400">Enter amount and number of payments to see preview</span>';
        return;
      }

      const perPayment = Math.ceil(amount / numPayments);
      const freqLabel = frequency === 'weekly' ? 'week' : frequency === 'biweekly' ? '2 weeks' : 'month';

      installmentPreview.innerHTML = `
        <div class="space-y-1">
          <p><strong>${t('debts.totalAmount')}:</strong> ${fc(amount)}</p>
          <p><strong>${t('debts.perPayment')}:</strong> ${fc(perPayment)} × ${numPayments} ${freqLabel}s</p>
          <p><strong>${t('debts.numberOfPayments')}:</strong> ${numPayments}</p>
        </div>
      `;
    }

    installmentToggle?.addEventListener('change', () => {
      installmentOptions?.classList.toggle('hidden', !installmentToggle.checked);
      if (installmentToggle.checked) updateInstallmentPreview();
    });

    numPaymentsInput?.addEventListener('input', updateInstallmentPreview);
    frequencySelect?.addEventListener('change', updateInstallmentPreview);
    amountInput?.addEventListener('input', updateInstallmentPreview);

    modal.querySelector('#debt-save')?.addEventListener('click', () => {
      const person = modal.querySelector('#debt-person')?.value?.trim();
      const amount = parseFloat(modal.querySelector('#debt-amount')?.value) || 0;
      const description = modal.querySelector('#debt-desc')?.value?.trim();
      const dueDate = modal.querySelector('#debt-due')?.value;
      const notes = modal.querySelector('#debt-notes')?.value?.trim();
      const useInstallments = installmentToggle?.checked;
      const frequency = frequencySelect?.value || 'monthly';
      const numPayments = parseInt(numPaymentsInput?.value) || 6;

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

      if (useInstallments && numPayments >= 2) {
        newDebt.installmentPlan = calculateInstallmentDefaults(amount, frequency, numPayments);
        // Update the debt's main dueDate to the last installment
        const lastPayment = newDebt.installmentPlan.payments[newDebt.installmentPlan.payments.length - 1];
        if (lastPayment) newDebt.dueDate = lastPayment.dueDate;
      }

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

  /** Show Record Payment Modal */
  function showRecordPaymentModal(debt, paymentId) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const progress = getDebtProgress(debt);
    const isInstallment = !!debt.installmentPlan;
    const payment = isInstallment ? debt.installmentPlan.payments.find(p => p.id === paymentId) : null;
    const defaultAmount = payment ? (payment.amount - (payment.paidAmount || 0)) : progress.remaining;
    const defaultDate = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
      <div class="p-5 sm:p-6 space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">${t('debts.recordPayment')}</h2>
          <button class="payment-close p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
          </button>
        </div>

        <!-- Debt Info -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">${debt.person}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${debt.description || ''}</p>
            </div>
            <div class="text-right">
              ${isInstallment ? `
                <p class="text-xs text-gray-500 dark:text-gray-400">${payment ? `${t('debts.installment')} #${payment.number}` : t('debts.partialPayment')}</p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">${fc(defaultAmount)}</p>
              ` : `
                <p class="text-xs text-gray-500 dark:text-gray-400">${t('debts.remaining')}</p>
                <p class="text-sm font-bold text-gray-900 dark:text-white">${fc(progress.remaining)}</p>
              `}
            </div>
          </div>
          ${isInstallment ? `
            <div class="mt-2">
              <div class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-primary-500 rounded-full" style="width: ${progress.percentage}%"></div>
              </div>
              <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">${t('debts.paidCount', { paid: progress.paidCount, total: progress.totalCount })}</p>
            </div>
          ` : ''}
        </div>

        <!-- Payment Amount -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.paymentAmount')}</label>
          <div class="flex items-center gap-2">
            <span class="text-lg font-bold text-gray-400 dark:text-gray-500">${getCurrencySymbol(currency)}</span>
            <input id="payment-amount" type="number" min="0" step="any" value="${defaultAmount}"
              class="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              inputmode="decimal">
          </div>
          ${isInstallment ? `
            <div class="flex gap-2 mt-2">
              <button data-quick-amount="${defaultAmount}" class="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-[11px] font-medium rounded-lg">${t('debts.perPayment')}</button>
              <button data-quick-amount="${progress.remaining}" class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[11px] font-medium rounded-lg">${t('debts.remaining')}</button>
              <button data-quick-amount="${progress.total}" class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[11px] font-medium rounded-lg">${t('debts.totalAmount')}</button>
            </div>
          ` : ''}
        </div>

        <!-- Payment Date -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.paymentDate')}</label>
          <input id="payment-date" type="date" value="${defaultDate}"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>

        <!-- Note -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('debts.paymentNote')}</label>
          <input id="payment-note" type="text" placeholder="${t('debts.paymentNotePlaceholder')}"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>

        <!-- Save -->
        <button id="payment-save" class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors shadow-sm">
          ${t('debts.recordPayment')}
        </button>
      </div>
    `;

    // Bind events
    modal.querySelector('.payment-close')?.addEventListener('click', () => overlay.remove());

    // Quick amount buttons
    modal.querySelectorAll('[data-quick-amount]').forEach(btn => {
      btn.addEventListener('click', () => {
        const amountInput = modal.querySelector('#payment-amount');
        if (amountInput) amountInput.value = btn.dataset.quickAmount;
      });
    });

    modal.querySelector('#payment-save')?.addEventListener('click', () => {
      const amount = parseFloat(modal.querySelector('#payment-amount')?.value) || 0;
      const paymentDate = modal.querySelector('#payment-date')?.value;
      const note = modal.querySelector('#payment-note')?.value?.trim();

      if (amount <= 0) {
        appState.showToast({ type: 'error', message: 'Please enter a payment amount.' });
        return;
      }

      if (isInstallment && payment) {
        // Record payment for specific installment
        payment.status = 'paid';
        payment.paidAmount = amount;
        payment.paidDate = paymentDate || new Date().toISOString();
        payment.note = note || '';

        // Update debt status
        updateDebtStatus(debt);
        saveDebts(debts);
        appState.showToast({ type: 'success', message: t('debts.paymentRecorded') });
      } else if (isInstallment) {
        // Record payment for next pending installment
        const nextPending = debt.installmentPlan.payments.find(p => p.status === 'pending');
        if (nextPending) {
          nextPending.status = 'paid';
          nextPending.paidAmount = amount;
          nextPending.paidDate = paymentDate || new Date().toISOString();
          nextPending.note = note || '';

          updateDebtStatus(debt);
          saveDebts(debts);
          appState.showToast({ type: 'success', message: t('debts.paymentRecorded') });
        }
      } else {
        // Simple debt — mark as settled
        debt.status = 'settled';
        debt.settledAt = paymentDate || new Date().toISOString();
        saveDebts(debts);
        appState.showToast({ type: 'success', message: t('debts.debtPaid') });
      }

      overlay.remove();
      render();
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ attrs: { class: 'w-4 h-4' }, nameAttr: 'data-lucide' });
    }
  }

  render();
  return el;
}

function getDefaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}
