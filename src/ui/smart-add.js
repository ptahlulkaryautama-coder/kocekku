/**
 * Smart Add / Transaction Entry Modal
 * Unified entry point for Expense, Income, and Transfer transactions.
 * Includes NLP parser for natural language input.
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

/* ─── NLP Parser ────────────────────────────────────────────────── */

/**
 * Parse natural language input into transaction fields.
 * Examples:
 *   "coffee 5 dollars"           → { type: 'expense', amount: 5, description: 'coffee' }
 *   "coffee 5 dollars from cash" → { type: 'expense', amount: 5, description: 'coffee', account: 'cash' }
 *   "salary 10m"                 → { type: 'income', amount: 10000000, description: 'salary' }
 *   "lunch 25000"                → { type: 'expense', amount: 25000, description: 'lunch' }
 *   "transfer 500k from bca to mandiri" → { type: 'transfer', amount: 500000, from: 'bca', to: 'mandiri' }
 *   "uber 15 from gopay"         → { type: 'expense', amount: 15, description: 'uber', account: 'gopay' }
 *   "received 2m from freelance"  → { type: 'income', amount: 2000000, description: 'freelance' }
 */
function parseNLP(text, accounts, userCurrency) {
  if (!text || !text.trim()) return null;

  const lower = text.toLowerCase().trim();
  const result = {
    type: 'expense',
    amount: 0,
    description: '',
    account: '',
    toAccount: '',
  };

  // ── Detect transfer ──
  const isTransfer = /\b(transfer|tf|kirim)\b/.test(lower);
  if (isTransfer) {
    result.type = 'transfer';
  }

  // ── Detect income keywords ──
  const incomeKeywords = /\b(salary|gaji|income|received|masuk|freelance|bonus|bayaran|payment received|earned)\b/;
  if (!isTransfer && incomeKeywords.test(lower)) {
    result.type = 'income';
  }

  // ── Extract amount ──
  // Match patterns: "5 dollars", "$5", "5k", "5m", "5.5k", "25000", "Rp 50000"
  const amountPatterns = [
    // "$5" or "$5.50"
    /\$\s*([\d,.]+)/,
    // "Rp 50000" or "rp50000"
    /(?:rp|idr)\s*([\d,.]+)/i,
    // "5 dollars" or "5 usd" or "5d"
    /([\d,.]+)\s*(?:dollars?|usd|\$)/i,
    // "5k" or "5.5k" (thousands)
    /([\d,.]+)\s*k\b/i,
    // "5m" or "5.5m" (millions)
    /([\d,.]+)\s*m\b/i,
    // "5b" (billions)
    /([\d,.]+)\s*b\b/i,
    // Plain number (last resort, must be > 0)
    /\b([\d,.]+)\b/,
  ];

  for (const pattern of amountPatterns) {
    const match = lower.match(pattern);
    if (match) {
      let num = parseFloat(match[1].replace(/,/g, ''));
      if (isNaN(num) || num <= 0) continue;

      // Apply suffix multipliers
      if (/\d+k\b/.test(match[0])) num *= 1000;
      else if (/\dm\b/.test(match[0])) num *= 1000000;
      else if (/\db\b/.test(match[0])) num *= 1000000000;

      // If currency is IDR and amount looks like USD (small number), convert
      if (userCurrency === 'IDR' && num < 1000 && !/\b(rp|idr|k|m|b)\b/.test(match[0]) && !/\$/.test(match[0])) {
        // Could be USD — leave as is, user can adjust
      }

      result.amount = Math.round(num);
      break;
    }
  }

  // ── Extract account (after "from") ──
  const fromMatch = lower.match(/\b(?:from|dari|pakai|via|with)\s+(\S+)/);
  if (fromMatch) {
    const accountHint = fromMatch[1];
    // Try to match against existing accounts
    const matched = accounts.find(a => {
      const name = (a.nama || '').toLowerCase();
      return name.includes(accountHint) || accountHint.includes(name);
    });
    result.account = matched ? matched.id : accountHint;
  }

  // ── Extract transfer target (after "to") ──
  const toMatch = lower.match(/\b(?:to|ke|untuk)\s+(\S+)/);
  if (toMatch) {
    const accountHint = toMatch[1];
    const matched = accounts.find(a => {
      const name = (a.nama || '').toLowerCase();
      return name.includes(accountHint) || accountHint.includes(name);
    });
    result.toAccount = matched ? matched.id : accountHint;
  }

  // ── Extract description (remaining words) ──
  // Remove amount, account hints, and type keywords
  let desc = text.trim();
  // Remove amount patterns
  desc = desc.replace(/\$[\d,.]+/g, '');
  desc = desc.replace(/(?:rp|idr)\s*[\d,.]+/gi, '');
  desc = desc.replace(/[\d,.]+(?:k|m|b|dollars?|usd)\b/gi, '');
  // Remove "from X", "to X", "via X", "pakai X"
  desc = desc.replace(/\b(?:from|to|dari|ke|pakai|via|with|untuk)\s+\S+/gi, '');
  // Remove type keywords
  desc = desc.replace(/\b(?:transfer|tf|kirim|salary|gaji|income|received|masuk|freelance|bonus|bayaran|payment received|earned)\b/gi, '');
  // Clean up
  desc = desc.replace(/\s+/g, ' ').trim();

  // Capitalize first letter
  if (desc) {
    result.description = desc.charAt(0).toUpperCase() + desc.slice(1);
  }

  return result;
}

/**
 * Auto-detect category from description text
 */
function detectCategory(description, categories) {
  if (!description) return '';
  const lower = description.toLowerCase();

  const categoryKeywords = {
    // Expense categories
    'Food & Dining': ['coffee', 'lunch', 'dinner', 'breakfast', 'food', 'meal', 'restaurant', 'cafe', 'makan', 'kopi', 'nasi', 'bakso', 'mie', 'snack', 'drink', 'Starbucks', 'McDonald', 'KFC'],
    'Transportation': ['uber', 'grab', 'taxi', 'gas', 'fuel', 'parking', 'transport', 'flight', 'train', 'bus', 'ojek', 'bensin', 'toll'],
    'Household': ['groceries', 'grocery', 'market', 'supermarket', 'household', 'cleaning', 'laundry', 'belanja', 'sayur'],
    'Bills & Utilities': ['electric', 'electricity', 'water', 'internet', 'phone', 'bill', 'pln', 'pdam', 'listrik', 'air', 'wifi', 'pulsa'],
    'Health': ['doctor', 'medicine', 'pharmacy', 'hospital', 'health', 'clinic', 'obat', 'dokter', 'rumah sakit'],
    'Entertainment': ['movie', 'cinema', 'game', 'netflix', 'spotify', 'entertainment', 'fun', 'hiburan'],
    'Shopping': ['shopping', 'clothes', 'shoes', 'electronics', 'tokopedia', 'shopee', 'lazada'],
    'Kids & Education': ['school', 'tuition', 'education', 'course', 'book', 'sekolah', 'les', 'kuliah'],
    'Insurance': ['insurance', 'asuransi', 'premium'],
    // Income categories
    'Salary': ['salary', 'gaji', 'paycheck'],
    'Freelance': ['freelance', 'project', 'client', 'contract'],
    'Bonus': ['bonus', 'tip', 'reward'],
    'Business': ['business', 'profit', 'revenue', 'sales'],
    'Commission': ['commission', 'komisi'],
    'Investment': ['dividend', 'interest', 'investment', 'return', 'profit'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lower.includes(kw))) {
      // Check if category exists in the provided list
      if (categories.some(c => c.key === category)) {
        return category;
      }
    }
  }

  return '';
}

/**
 * Show the Smart Add modal
 * @param {Object} app - the SakkuApp instance
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

        <!-- NLP Input + OCR -->
        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <i data-lucide="sparkles" class="w-4 h-4 text-primary-500 flex-shrink-0"></i>
            <input id="sa-nlp" type="text" placeholder='Try: "coffee 5 dollars from cash"'
              class="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
              autocomplete="off">
            <button id="sa-scan" type="button" title="Scan receipt"
              class="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
              <i data-lucide="camera" class="w-4 h-4 text-gray-500 dark:text-gray-400"></i>
            </button>
            <input type="file" id="sa-scan-file" accept="image/*" capture="environment" class="hidden">
          </div>
          <p id="sa-nlp-hint" class="text-[11px] text-gray-400 dark:text-gray-500 mt-1 hidden"></p>
          <!-- OCR progress -->
          <div id="sa-ocr-progress" class="hidden mt-2">
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <i data-lucide="scan" class="w-3 h-3 animate-pulse"></i>
              <span id="sa-ocr-status">Scanning receipt...</span>
            </div>
            <div class="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div id="sa-ocr-bar" class="h-full bg-primary-500 rounded-full transition-all" style="width:0%"></div>
            </div>
          </div>
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
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>

        <!-- Category Grid -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">${t('smartAdd.allCategories')}</label>
          <div class="grid grid-cols-5 gap-2">
            ${cats.map(cat => {
              const cm = COLOR_MAP[cat.color] || COLOR_MAP.gray;
              const isSelected = selectedCategory === cat.key;
              return `
                <button data-cat="${cat.key}" class="sa-cat flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isSelected ? `ring-2 ${cm.ring} ${cm.bg}` : 'hover:bg-gray-100 dark:hover:bg-gray-800'}">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? cm.bg : 'bg-gray-100 dark:bg-gray-800'}">
                    <i data-lucide="${cat.icon}" class="w-4 h-4 ${isSelected ? cm.text : 'text-gray-500 dark:text-gray-400'}"></i>
                  </div>
                  <span class="text-[10px] font-medium ${isSelected ? cm.text : 'text-gray-600 dark:text-gray-400'} leading-tight text-center">${cat.key.split(' ')[0]}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        ${!isTransfer ? `
        <!-- Account -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.fromAccount')}</label>
          <select id="sa-account" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            <option value="">${t('smartAdd.noAccount')}</option>
            ${liquidAccounts.map(a => `
              <option value="${a.id}" ${selectedAccount === a.id ? 'selected' : ''}>${a.nama} — ${fc(a.saldo || 0)}</option>
            `).join('')}
          </select>
        </div>
        ` : `
        <!-- Transfer: From & To -->
        <div class="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.fromAccount')}</label>
            <select id="sa-account" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              ${liquidAccounts.map(a => `
                <option value="${a.id}" ${selectedAccount === a.id ? 'selected' : ''}>${a.nama}</option>
              `).join('')}
            </select>
          </div>
          <div class="pb-2.5">
            <i data-lucide="arrow-right" class="w-5 h-5 text-gray-400"></i>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.toAccount')}</label>
            <select id="sa-to-account" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              ${liquidAccounts.map(a => `
                <option value="${a.id}" ${selectedToAccount === a.id ? 'selected' : ''}>${a.nama}</option>
              `).join('')}
            </select>
          </div>
        </div>
        `}

        <!-- Date & Member -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.date')}</label>
            <input id="sa-date" type="date" value="${new Date().toISOString().split('T')[0]}"
              class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.member')}</label>
            <select id="sa-member" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              <option value="">${t('smartAdd.member')}</option>
              ${members.map(m => `
                <option value="${m.id}" ${selectedMember === m.id ? 'selected' : ''}>${m.nama}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">${t('smartAdd.notes')}</label>
          <textarea id="sa-notes" rows="2" placeholder="${t('smartAdd.notesPlaceholder')}"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"></textarea>
        </div>

        <!-- Save -->
        <button id="sa-save" class="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold transition-colors shadow-sm">
          ${t('smartAdd.saveTransaction')}
        </button>
      </div>
    `;

    // ── Bind events ──
    requestAnimationFrame(() => {
      // Close
      modal.querySelector('#sa-close')?.addEventListener('click', () => overlay.remove());

      // NLP input
      const nlpInput = modal.querySelector('#sa-nlp');
      const nlpHint = modal.querySelector('#sa-nlp-hint');
      if (nlpInput) {
        let nlpTimeout;
        nlpInput.addEventListener('input', (e) => {
          clearTimeout(nlpTimeout);
          nlpTimeout = setTimeout(() => {
            const parsed = parseNLP(e.target.value, accounts, currency);
            if (parsed && parsed.amount > 0) {
              // Auto-fill amount
              const amountInput = modal.querySelector('#sa-amount');
              if (amountInput) amountInput.value = parsed.amount;

              // Auto-fill description
              if (parsed.description) {
                const descInput = modal.querySelector('#sa-desc');
                if (descInput) descInput.value = parsed.description;
              }

              // Auto-set type
              if (parsed.type !== currentType) {
                currentType = parsed.type;
                selectedCategory = '';
                render();
                return; // render() will re-bind
              }

              // Auto-detect category
              if (parsed.description) {
                const detected = detectCategory(parsed.description, cats);
                if (detected) {
                  selectedCategory = detected;
                  // Highlight the category button
                  modal.querySelectorAll('.sa-cat').forEach(btn => {
                    btn.classList.remove('ring-2');
                    if (btn.dataset.cat === detected) {
                      const cm = COLOR_MAP[cats.find(c => c.key === detected)?.color] || COLOR_MAP.gray;
                      btn.classList.add('ring-2', cm.ring);
                    }
                  });
                }
              }

              // Auto-select account
              if (parsed.account) {
                const accInput = modal.querySelector('#sa-account');
                if (accInput) {
                  const match = accounts.find(a => a.id === parsed.account || (a.nama || '').toLowerCase().includes(parsed.account));
                  if (match) {
                    accInput.value = match.id;
                    selectedAccount = match.id;
                  }
                }
              }

              // Auto-select transfer target
              if (parsed.toAccount) {
                const toInput = modal.querySelector('#sa-to-account');
                if (toInput) {
                  const match = accounts.find(a => a.id === parsed.toAccount || (a.nama || '').toLowerCase().includes(parsed.toAccount));
                  if (match) {
                    toInput.value = match.id;
                    selectedToAccount = match.id;
                  }
                }
              }

              // Show hint
              if (nlpHint) {
                nlpHint.classList.remove('hidden');
                const typeLabel = parsed.type === 'transfer' ? 'Transfer' : parsed.type === 'income' ? 'Income' : 'Expense';
                nlpHint.textContent = `Parsed: ${typeLabel} · ${fc(parsed.amount)}${parsed.description ? ' · ' + parsed.description : ''}`;
              }
            } else if (nlpHint) {
              nlpHint.classList.add('hidden');
            }
          }, 300);
        });

        // Enter key to parse
        nlpInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            nlpInput.dispatchEvent(new Event('input'));
          }
        });
      }

      // Type tabs
      modal.querySelectorAll('.sa-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          currentType = tab.dataset.type;
          selectedCategory = '';
          render();
        });
      });

      // Quick amounts
      modal.querySelectorAll('.sa-quick').forEach(btn => {
        btn.addEventListener('click', () => {
          const amountInput = modal.querySelector('#sa-amount');
          if (amountInput) amountInput.value = btn.dataset.quick;
        });
      });

      // Category selection
      modal.querySelectorAll('.sa-cat').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedCategory = btn.dataset.cat;
          modal.querySelectorAll('.sa-cat').forEach(b => b.classList.remove('ring-2'));
          const cm = COLOR_MAP[cats.find(c => c.key === selectedCategory)?.color] || COLOR_MAP.gray;
          btn.classList.add('ring-2', cm.ring);
        });
      });

      // Save
      modal.querySelector('#sa-save')?.addEventListener('click', () => {
        const amount = parseFloat(modal.querySelector('#sa-amount')?.value) || 0;
        const desc = modal.querySelector('#sa-desc')?.value?.trim() || '';
        const date = modal.querySelector('#sa-date')?.value || new Date().toISOString().split('T')[0];
        const notes = modal.querySelector('#sa-notes')?.value?.trim() || '';
        const member = modal.querySelector('#sa-member')?.value || '';
        const account = modal.querySelector('#sa-account')?.value || selectedAccount;
        const toAccount = modal.querySelector('#sa-to-account')?.value || selectedToAccount;

        // Validation
        if (amount <= 0) {
          appState.showToast({ type: 'error', message: 'Please enter an amount.' });
          return;
        }
        if (!selectedCategory && !isTransfer) {
          appState.showToast({ type: 'error', message: 'Please select a category.' });
          return;
        }
        if (!account) {
          appState.showToast({ type: 'error', message: 'Please select an account.' });
          return;
        }
        if (isTransfer && !toAccount) {
          appState.showToast({ type: 'error', message: 'Please select a destination account.' });
          return;
        }
        if (isTransfer && account === toAccount) {
          appState.showToast({ type: 'error', message: 'Source and destination accounts must be different.' });
          return;
        }

        // Create transaction
        const transactions = [...(appState.get('transactions') || [])];
        const newTx = {
          id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tanggal: date,
          keterangan: desc || selectedCategory || (isTransfer ? 'Transfer' : currentType === 'masuk' ? 'Income' : 'Expense'),
          jumlah: amount,
          tipe: currentType,
          dompet: account,
          kategori: isTransfer ? 'Transfer' : selectedCategory,
          pengeluar: member,
          catatan: notes,
          createdAt: new Date().toISOString(),
        };

        transactions.push(newTx);
        appState.set('transactions', transactions);

        // Update account balances
        const allAccounts = [...(appState.get('accounts') || [])];
        if (currentType === 'keluar') {
          const acc = allAccounts.find(a => a.id === account);
          if (acc) acc.saldo = (parseFloat(acc.saldo) || 0) - amount;
        } else if (currentType === 'masuk') {
          const acc = allAccounts.find(a => a.id === account);
          if (acc) acc.saldo = (parseFloat(acc.saldo) || 0) + amount;
        } else if (isTransfer) {
          const fromAcc = allAccounts.find(a => a.id === account);
          const toAcc = allAccounts.find(a => a.id === toAccount);
          if (fromAcc) fromAcc.saldo = (parseFloat(fromAcc.saldo) || 0) - amount;
          if (toAcc) toAcc.saldo = (parseFloat(toAcc.saldo) || 0) + amount;
        }
        appState.set('accounts', allAccounts);

        // Save to localStorage
        import('../app/bootstrap.js').then(({ saveData }) => {
          saveData();
        });

        appState.showToast({ type: 'success', message: `${isTransfer ? 'Transfer' : currentType === 'masuk' ? 'Income' : 'Expense'} recorded: ${fc(amount)}` });
        overlay.remove();

        // Refresh the page
        if (app && app.renderContent) {
          app.renderContent();
        }
      });

      // OCR Scan button
      const scanBtn = modal.querySelector('#sa-scan');
      const scanFile = modal.querySelector('#sa-scan-file');
      const ocrProgress = modal.querySelector('#sa-ocr-progress');
      const ocrStatus = modal.querySelector('#sa-ocr-status');
      const ocrBar = modal.querySelector('#sa-ocr-bar');

      if (scanBtn && scanFile) {
        scanBtn.addEventListener('click', () => scanFile.click());

        scanFile.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          try {
            // Show progress
            if (ocrProgress) ocrProgress.classList.remove('hidden');
            if (ocrStatus) ocrStatus.textContent = 'Loading OCR engine...';
            if (ocrBar) ocrBar.style.width = '10%';

            // Dynamically import OCR module
            const { performOCR, parseReceipt } = await import('../ocr/receipt-parser.js');

            if (ocrStatus) ocrStatus.textContent = 'Scanning receipt...';
            if (ocrBar) ocrBar.style.width = '30%';

            // Perform OCR
            const ocrText = await performOCR(file, (progress) => {
              if (ocrBar) ocrBar.style.width = `${30 + progress * 0.6}%`;
              if (ocrStatus) ocrStatus.textContent = `Scanning... ${progress}%`;
            });

            if (ocrBar) ocrBar.style.width = '95%';
            if (ocrStatus) ocrStatus.textContent = 'Parsing receipt...';

            // Parse receipt
            const parsed = parseReceipt(ocrText, currency);

            if (ocrBar) ocrBar.style.width = '100%';

            if (parsed && parsed.total > 0) {
              // Auto-fill form
              const amountInput = modal.querySelector('#sa-amount');
              if (amountInput) amountInput.value = parsed.total;

              const descInput = modal.querySelector('#sa-desc');
              if (descInput) descInput.value = parsed.store || parsed.description || '';

              // Set date
              if (parsed.date) {
                const dateInput = modal.querySelector('#sa-date');
                if (dateInput) dateInput.value = parsed.date;
              }

              // Auto-detect category
              if (parsed.category) {
                selectedCategory = parsed.category;
                // Highlight category button
                const cats = currentType === 'masuk' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
                modal.querySelectorAll('.sa-cat').forEach(btn => {
                  btn.classList.remove('ring-2');
                  if (btn.dataset.cat === parsed.category) {
                    const cm = COLOR_MAP[cats.find(c => c.key === parsed.category)?.color] || COLOR_MAP.gray;
                    btn.classList.add('ring-2', cm.ring);
                  }
                });
              }

              // Show hint
              if (nlpHint) {
                nlpHint.classList.remove('hidden');
                nlpHint.textContent = `📸 ${parsed.store ? parsed.store + ' · ' : ''}${fc(parsed.total)}${parsed.category ? ' · ' + parsed.category : ''}`;
              }

              appState.showToast({ type: 'success', message: `Receipt scanned: ${parsed.store || 'Unknown'} — ${fc(parsed.total)}` });
            } else {
              // Put raw OCR text in NLP input for manual parsing
              if (nlpInput) nlpInput.value = ocrText.split('\n').slice(0, 3).join(' ');
              appState.showToast({ type: 'warning', message: 'Could not extract amount. Text placed in input for manual editing.' });
            }
          } catch (err) {
            console.error('OCR failed:', err);
            appState.showToast({ type: 'error', message: 'OCR failed. Please try again or enter manually.' });
          } finally {
            if (ocrProgress) ocrProgress.classList.add('hidden');
            if (ocrBar) ocrBar.style.width = '0%';
            scanFile.value = '';
          }
        });
      }

      // Focus NLP input
      setTimeout(() => nlpInput?.focus(), 100);

      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons({ attrs: { class: 'w-4 h-4' }, nameAttr: 'data-lucide' });
      }
    });
  }

  render();
}

/**
 * Get currency symbol
 */
function getCurrencySymbol(code) {
  const symbols = { IDR: 'Rp', USD: '$', SGD: 'S$', MYR: 'RM', EUR: '€', GBP: '£', AUD: 'A$', JPY: '¥', AED: 'د.إ', SAR: 'ر.س' };
  return symbols[code] || code;
}
