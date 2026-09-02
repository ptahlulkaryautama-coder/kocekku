/**
 * Smart Add / Transaction Entry Modal
 * Unified entry point for Expense, Income, and Transfer transactions.
 */

import { t } from '../i18n/index.js';
import { formatCurrency, detectDominantCurrency } from '../formatting/currency.js';
import { formatDate } from '../formatting/dates.js';
import { appState } from '../app/state.js';

/* ─── Expense categories with icons ─────────────────────────────── */
const EXPENSE_CATEGORIES = [
  { key: 'Food & Dining',          icon: 'utensils',           color: 'primary'},
  { key: 'Transportation',         icon: 'car',                color: 'blue'   },
  { key: 'Household',              icon: 'shopping-basket',    color: 'emerald'},
  { key: 'Kids & Education',       icon: 'baby',               color: 'pink'   },
  { key: 'Bills & Utilities',      icon: 'receipt',            color: 'indigo' },
  { key: 'Health',                 icon: 'heart-pulse',        color: 'red'    },
  { key: 'Entertainment',          icon: 'popcorn',            color: 'violet' },
  { key: 'Shopping',               icon: 'shopping-bag',       color: 'fuchsia'},
  { key: 'Insurance',              icon: 'shield',             color: 'cyan'   },
  { key: 'Other',                  icon: 'more-horizontal',    color: 'gray'   },
];

const INCOME_CATEGORIES = [
  { key: 'Salary',           icon: 'wallet',            color: 'emerald' },
  { key: 'Freelance',        icon: 'briefcase',         color: 'blue'    },
  { key: 'Bonus',            icon: 'gift',              color: 'amber'   },
  { key: 'Business',         icon: 'store',             color: 'violet'  },
  { key: 'Commission',       icon: 'hand-coins',        color: 'teal'    },
  { key: 'Investment',       icon: 'trending-up',       color: 'green'   },
  { key: 'Other Income',     icon: 'circle-dollar-sign',color: 'indigo'  },
];

const QUICK_AMOUNTS = {
  IDR: [10000, 25000, 50000, 100000, 250000, 500000, 1000000],
  USD: [1, 5, 10, 20, 50, 100],
  default: [10, 25, 50, 100, 250, 500, 1000],
};

const COLOR_MAP = {
  primary: { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400', ring: 'ring-primary-500' },
  coral:   { bg: 'bg-primary-100 dark:bg-primary-900/30', text: 'text-primary-600 dark:text-primary-400', ring: 'ring-primary-500' },
  blue:    { bg: 'bg-blue-100 dark:bg-blue-900/30',      text: 'text-blue-600 dark:text-blue-400',     ring: 'ring-blue-500'    },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30',text: 'text-emerald-600 dark:text-emerald-400',ring: 'ring-emerald-500' },
  pink:    { bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-600 dark:text-pink-400',     ring: 'ring-pink-500'    },
  indigo:  { bg: 'bg-indigo-100 dark:bg-indigo-900/30',  text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-500'  },
  red:     { bg: 'bg-red-100 dark:bg-red-900/30',        text: 'text-red-600 dark:text-red-400',       ring: 'ring-red-500'     },
  violet:  { bg: 'bg-violet-100 dark:bg-violet-900/30',  text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500'  },
  fuchsia: { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',text: 'text-fuchsia-600 dark:text-fuchsia-400',ring: 'ring-fuchsia-500'},
  cyan:    { bg: 'bg-cyan-100 dark:bg-cyan-900/30',      text: 'text-cyan-600 dark:text-cyan-400',     ring: 'ring-cyan-500'    },
  gray:    { bg: 'bg-gray-100 dark:bg-gray-800',          text: 'text-gray-600 dark:text-gray-400',     ring: 'ring-gray-500'    },
  teal:    { bg: 'bg-teal-100 dark:bg-teal-900/30',      text: 'text-teal-600 dark:text-teal-400',     ring: 'ring-teal-500'    },
  green:   { bg: 'bg-green-100 dark:bg-green-900/30',    text: 'text-green-600 dark:text-green-400',   ring: 'ring-green-500'   },
};

/**
 * Show the Smart Add modal
 * @param {Object} app - the KocekkuApp instance
 */
export function showSmartAddModal(app, initialType) {
  const accounts  = appState.get('accounts') || [];
  const members   = appState.get('familyMembers') || [];
  const currency  = appState.get('currency') || 'IDR';
  const sourceCurrency = detectDominantCurrency(
    accounts.map(a => ({ amount: a.saldo || 0, currency: a.mataUang || currency }))
  );
  const quickAmts = QUICK_AMOUNTS[currency] || QUICK_AMOUNTS.default;

  let currentType = initialType || 'keluar'; // keluar=expense, masuk=income, transfer
  let selectedCategory = '';
  let selectedAccount = accounts.find(a => a.aktif !== false)?.id || '';
  let selectedToAccount = '';
  let selectedMember = '';

  /* ── overlay ───────────────────────────────────────────────────── */
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  /* ── modal ─────────────────────────────────────────────────────── */
  const modal = document.createElement('div');
  modal.className = 'bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl';
  modal.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function render() {
    const cats = currentType === 'masuk' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const isTransfer = currentType === 'transfer';
    const liquidAccounts = accounts.filter(a => a.aktif !== false);
    const fc = (amt) => formatCurrency(amt, currency, { fromCurrency: sourceCurrency });

    modal.innerHTML = `
      <div class="p-5 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">${t('smartAdd.title')}</h2>
          <button id="sa-close" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
          </button>
        </div>

        <!-- Type Tabs -->
        <div class="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          <button data-type="keluar" class="sa-tab flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${currentType === 'keluar' ? 'bg-white dark:bg-gray-700 text-danger-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}">
            <i data-lucide="arrow-up-right" class="w-4 h-4 inline mr-1"></i>${t('smartAdd.expense')}
          </button>
          <button data-type="masuk" class="sa-tab flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${currentType === 'masuk' ? 'bg-white dark:bg-gray-700 text-success-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}">
            <i data-lucide="arrow-down-left" class="w-4 h-4 inline mr-1"></i>${t('smartAdd.income')}
          </button>
          <button data-type="transfer" class="sa-tab flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${currentType === 'transfer' ? 'bg-white dark:bg-gray-700 text-info-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'}">
            <i data-lucide="repeat" class="w-4 h-4 inline mr-1"></i>${t('smartAdd.transfer')}
          </button>
        </div>

        <!-- Amount -->
        <div class="text-center py-2">
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">${t('smartAdd.amount')}</label>
          <div class="flex items-center justify-center gap-1">
            <span class="text-2xl font-bold text-gray-400 dark:text-gray-500">${getCurrencySymbol(currency)}</span>
            <input id="sa-amount" type="number" min="0" step="any" value="" placeholder="0"
              class="w-48 text-center text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-300 dark:placeholder-gray-600"
              inputmode="decimal">
          </div>
        </div>

        <!-- Quick Amounts -->
        <div class="flex flex-wrap justify-center gap-2">
          ${quickAmts.map(amt => `
            <button data-quick="${amt}" class="sa-quick px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              ${fc(amt)}
            </button>
          `).join('')}
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.description')}</label>
          <input id="sa-desc" type="text" placeholder="${t('smartAdd.descriptionPlaceholder')}"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>

        ${isTransfer ? `
        <!-- Transfer: From / To -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.fromAccount')}</label>
            <select id="sa-from" class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              ${liquidAccounts.map(a => `<option value="${a.id}" ${selectedAccount === a.id ? 'selected' : ''}>${a.nama} — ${fc(a.saldo)}</option>`).join('')}
            </select>
          </div>
          <div class="flex justify-center">
            <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <i data-lucide="arrow-down" class="w-4 h-4 text-gray-400"></i>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.toAccount')}</label>
            <select id="sa-to" class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">${t('smartAdd.noAccount')}</option>
              ${liquidAccounts.map(a => `<option value="${a.id}" ${selectedToAccount === a.id ? 'selected' : ''}>${a.nama} — ${fc(a.saldo)}</option>`).join('')}
            </select>
          </div>
        </div>
        ` : `
        <!-- Category Grid -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">${t('smartAdd.category')}</label>
          <div class="grid grid-cols-5 gap-2">
            ${cats.map(c => {
              const cm = COLOR_MAP[c.color] || COLOR_MAP.gray;
              const selected = selectedCategory === c.key;
              return `
                <button data-cat="${c.key}" class="sa-cat flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${selected ? `ring-2 ${cm.ring} ${cm.bg}` : 'hover:bg-gray-50 dark:hover:bg-gray-800'}">
                  <div class="w-9 h-9 rounded-lg ${selected ? cm.bg : 'bg-gray-100 dark:bg-gray-800'} flex items-center justify-center">
                    <i data-lucide="${c.icon}" class="w-4 h-4 ${selected ? cm.text : 'text-gray-500 dark:text-gray-400'}"></i>
                  </div>
                  <span class="text-[10px] leading-tight text-center ${selected ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}">${c.key.split(' ')[0]}</span>
                </button>`;
            }).join('')}
          </div>
        </div>

        <!-- Account -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.account')}</label>
          <select id="sa-account" class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            ${liquidAccounts.map(a => `<option value="${a.id}" ${selectedAccount === a.id ? 'selected' : ''}>${a.nama} — ${fc(a.saldo)}</option>`).join('')}
          </select>
        </div>
        `}

        <!-- Date -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.date')}</label>
          <input id="sa-date" type="date" value="${new Date().toISOString().slice(0, 10)}"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
        </div>

        ${!isTransfer ? `
        <!-- Member (optional) -->
        ${members.length > 0 ? `
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.member')}</label>
          <select id="sa-member" class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">—</option>
            ${members.map(m => `<option value="${m.id}" ${selectedMember === m.id ? 'selected' : ''}>${m.nama}</option>`).join('')}
          </select>
        </div>` : ''}
        ` : ''}

        <!-- Notes (optional) -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.notes')}</label>
          <input id="sa-notes" type="text" placeholder="${t('smartAdd.notesPlaceholder')}"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
        </div>

        <!-- Error -->
        <div id="sa-error" class="hidden text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 rounded-xl p-3"></div>

        <!-- Submit -->
        <button id="sa-submit" class="w-full py-3 rounded-xl font-semibold text-white transition-colors text-sm ${currentType === 'masuk' ? 'bg-success-600 hover:bg-success-700' : currentType === 'transfer' ? 'bg-info-600 hover:bg-info-700' : 'bg-primary-600 hover:bg-primary-700'}">
          ${currentType === 'transfer' ? t('smartAdd.transfer') : t('smartAdd.saveTransaction')}
        </button>
      </div>`;

    /* ── re-create icons ─────────────────────────────────────────── */
    if (window.lucide) window.lucide.createIcons();

    /* ── bind events ─────────────────────────────────────────────── */
    bindEvents();
  }

  function bindEvents() {
    /* close */
    modal.querySelector('#sa-close')?.addEventListener('click', () => overlay.remove());

    /* type tabs */
    modal.querySelectorAll('.sa-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentType = btn.dataset.type;
        selectedCategory = '';
        render();
      });
    });

    /* quick amounts */
    modal.querySelectorAll('.sa-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        const amtInput = modal.querySelector('#sa-amount');
        amtInput.value = btn.dataset.quick;
        amtInput.focus();
      });
    });

    /* category grid */
    modal.querySelectorAll('.sa-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCategory = btn.dataset.cat;
        render();
        // focus amount after category select
        setTimeout(() => modal.querySelector('#sa-amount')?.focus(), 50);
      });
    });

    /* from/to account (transfer) */
    const fromSelect = modal.querySelector('#sa-from');
    if (fromSelect) {
      fromSelect.addEventListener('change', () => { selectedAccount = fromSelect.value; });
    }
    const toSelect = modal.querySelector('#sa-to');
    if (toSelect) {
      toSelect.addEventListener('change', () => { selectedToAccount = toSelect.value; });
    }

    /* account select */
    const accSelect = modal.querySelector('#sa-account');
    if (accSelect) {
      accSelect.addEventListener('change', () => { selectedAccount = accSelect.value; });
    }

    /* member */
    const memSelect = modal.querySelector('#sa-member');
    if (memSelect) {
      memSelect.addEventListener('change', () => { selectedMember = memSelect.value; });
    }

    /* submit */
    modal.querySelector('#sa-submit')?.addEventListener('click', () => handleSubmit());

    /* keyboard: Enter to submit */
    modal.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    });
  }

  function handleSubmit() {
    const amount = parseFloat(modal.querySelector('#sa-amount')?.value) || 0;
    const desc   = modal.querySelector('#sa-desc')?.value?.trim() || '';
    const date   = modal.querySelector('#sa-date')?.value || new Date().toISOString().slice(0, 10);
    const notes  = modal.querySelector('#sa-notes')?.value?.trim() || '';
    const errDiv = modal.querySelector('#sa-error');

    /* validate */
    const errors = [];
    if (amount <= 0) errors.push('Amount must be greater than 0');
    if (!desc) errors.push('Description is required');
    if (currentType !== 'transfer' && !selectedCategory) errors.push('Select a category');
    if (currentType === 'transfer') {
      const fromId = modal.querySelector('#sa-from')?.value;
      const toId   = modal.querySelector('#sa-to')?.value;
      if (!fromId) errors.push('Select source account');
      if (!toId) errors.push('Select destination account');
      if (fromId && toId && fromId === toId) errors.push('Source and destination must be different');
    }

    if (errors.length > 0) {
      errDiv.textContent = errors.join('. ');
      errDiv.classList.remove('hidden');
      return;
    }
    errDiv.classList.add('hidden');

    /* build transaction(s) */
    const txns = [...appState.get('transactions')];
    const accts = [...appState.get('accounts')];

    if (currentType === 'transfer') {
      const fromId = modal.querySelector('#sa-from').value;
      const toId   = modal.querySelector('#sa-to').value;
      const fromAcct = accts.find(a => a.id === fromId);
      const toAcct   = accts.find(a => a.id === toId);

      // Deduct from source
      if (fromAcct) fromAcct.saldo = (parseFloat(fromAcct.saldo) || 0) - amount;
      // Add to destination
      if (toAcct) toAcct.saldo = (parseFloat(toAcct.saldo) || 0) + amount;

      // Create transfer record
      const transferTx = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tanggal: date,
        keterangan: desc,
        jumlah: amount,
        tipe: 'transfer',
        dompet: fromId,
        dompetTujuan: toId,
        kategori: 'Transfer',
        pengeluar: selectedMember || '',
        catatan: notes,
        createdAt: new Date().toISOString()
      };
      txns.push(transferTx);

      appState.set('transactions', txns);
      appState.set('accounts', accts);
      appState.showToast({ type: 'success', message: `Transferred ${fc(amount)} successfully` });
    } else {
      const acct = accts.find(a => a.id === selectedAccount);
      if (!acct) { errDiv.textContent = 'Select an account'; errDiv.classList.remove('hidden'); return; }

      // Adjust balance
      if (currentType === 'masuk') {
        acct.saldo = (parseFloat(acct.saldo) || 0) + amount;
      } else {
        acct.saldo = (parseFloat(acct.saldo) || 0) - amount;
      }

      const txn = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tanggal: date,
        keterangan: desc,
        jumlah: amount,
        tipe: currentType,
        dompet: selectedAccount,
        kategori: selectedCategory,
        pengeluar: selectedMember || '',
        catatan: notes,
        createdAt: new Date().toISOString()
      };
      txns.push(txn);

      appState.set('transactions', txns);
      appState.set('accounts', accts);

      const label = currentType === 'masuk' ? 'Income' : 'Expense';
      appState.showToast({ type: 'success', message: `${label} of ${fc(amount)} saved` });
    }

    overlay.remove();
    app.renderContent();
  }

  /* ── initial render ────────────────────────────────────────────── */
  render();
}

/* ─── Helpers ───────────────────────────────────────────────────── */

function getCurrencySymbol(code) {
  const symbols = { IDR: 'Rp', USD: '$', SGD: 'S$', MYR: 'RM', EUR: '€', GBP: '£', AUD: 'A$', JPY: '¥', AED: 'د.إ', SAR: '﷼' };
  return symbols[code] || code;
}
