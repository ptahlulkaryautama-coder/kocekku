/**
 * Account Domain Logic
 * Pure functions for account calculations - no DOM dependencies
 */

/**
 * Calculate total balance across all accounts
 * @param {Array} accounts
 * @returns {number}
 */
export function calculateTotalBalance(accounts) {
  return accounts.reduce((sum, acc) => sum + (parseFloat(acc.saldo) || 0), 0);
}

/**
 * Calculate total assets.
 * 
 * Assets = positive balances of non-liability accounts.
 * Liability accounts (credit cards, loans) are NEVER assets,
 * even if they have a positive balance (overpayment).
 * 
 * @param {Array} accounts - legacy format with 'jenis', 'saldo'
 * @returns {number}
 */
export function calculateTotalAssets(accounts) {
  return accounts
    .filter(acc => classifyAccount(acc) !== 'liability' && (parseFloat(acc.saldo) || 0) > 0)
    .reduce((sum, acc) => sum + (parseFloat(acc.saldo) || 0), 0);
}

/**
 * Calculate total liabilities.
 * 
 * Liabilities = abs(balance) of all liability-typed accounts
 * PLUS abs(balance) of any non-liability account with negative balance (e.g. overdraft).
 * 
 * A credit card with positive balance (overpayment) is still a liability —
 * the positive balance represents overpaid debt, not new wealth.
 * 
 * @param {Array} accounts - legacy format with 'jenis', 'saldo'
 * @returns {number}
 */
export function calculateTotalLiabilities(accounts) {
  let total = 0;
  for (const acc of accounts) {
    const cls = classifyAccount(acc);
    const balance = parseFloat(acc.saldo) || 0;
    if (cls === 'liability') {
      // All liability accounts contribute to liabilities (abs of balance)
      total += Math.abs(balance);
    } else if (balance < 0) {
      // Non-liability accounts with negative balance (e.g. overdraft) also count
      total += Math.abs(balance);
    }
  }
  return total;
}

/**
 * Calculate net worth.
 * 
 * Net Worth = Total Assets - Total Liabilities.
 * This is the canonical implementation using classifyAccount().
 * 
 * @param {Array} accounts - legacy format
 * @returns {{ total: number, assets: number, liabilities: number }}
 */
export function calculateNetWorth(accounts) {
  const assets = calculateTotalAssets(accounts);
  const liabilities = calculateTotalLiabilities(accounts);
  return { total: assets - liabilities, assets, liabilities };
}

/**
 * Get accounts by type
 * @param {Array} accounts
 * @param {string} type
 * @returns {Array}
 */
export function getAccountsByType(accounts, type) {
  if (!type || type === 'all') return accounts;
  return accounts.filter(acc => acc.jenis === type);
}

/**
 * Get active accounts only
 * @param {Array} accounts
 * @returns {Array}
 */
export function getActiveAccounts(accounts) {
  return accounts.filter(acc => acc.aktif !== false);
}

/**
 * Find account by ID
 * @param {Array} accounts
 * @param {string} id
 * @returns {Object|null}
 */
export function findAccountById(accounts, id) {
  return accounts.find(acc => acc.id === id) || null;
}

/**
 * Update account balance
 * @param {Array} accounts
 * @param {string} accountId
 * @param {number} amount - positive to add, negative to subtract
 * @returns {Array}
 */
export function updateAccountBalance(accounts, accountId, amount) {
  return accounts.map(acc => {
    if (acc.id === accountId) {
      return {
        ...acc,
        saldo: (parseFloat(acc.saldo) || 0) + amount
      };
    }
    return acc;
  });
}

/**
 * Create a new account object
 * @param {Object} data
 * @returns {Object}
 */
export function createAccount(data) {
  return {
    id: data.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nama: data.nama || '',
    jenis: data.jenis || 'lainnya',
    saldo: parseFloat(data.saldo) || 0,
    mataUang: data.mataUang || 'IDR',
    icon: data.icon || 'wallet',
    aktif: data.aktif !== false,
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * Account Classification
 * 
 * Centralized classification of account types into financial categories.
 * This drives Available Cash, Net Worth, Emergency Fund, and other metrics.
 */
export const ACCOUNT_CLASSIFICATION = {
  // LIQUID ASSETS — cash you can spend immediately
  LIQUID: ['cash', 'dompet', 'checking', 'bank', 'rekening', 'savings', 'tabungan', 'ewallet', 'e-wallet', 'gopay', 'ovo', 'dana', 'shopeepay'],
  
  // INVESTMENTS — wealth stored but not immediately spendable
  INVESTMENT: ['investment', 'investasi', 'saham', 'crypto'],
  
  // RECEIVABLES — money owed to you
  RECEIVABLE: ['piutang', 'receivable'],
  
  // LIABILITIES — money you owe
  LIABILITY: ['utang', 'hutang', 'loan', 'kartu kredit', 'credit card', 'credit'],
  
  // OTHER — unclassified
  OTHER: ['lainnya', 'other']
};

/**
 * Classify an account into a financial category.
 * @param {Object} account - legacy format with 'jenis'
 * @returns {'liquid'|'investment'|'receivable'|'liability'|'other'}
 */
export function classifyAccount(account) {
  // Prefer pre-normalized type if available, otherwise normalize from legacy fields
  const type = account.normalizedType || normalizeAccountType(account.jenis || account.type);
  
  if (ACCOUNT_CLASSIFICATION.LIQUID.includes(type))   return 'liquid';
  if (ACCOUNT_CLASSIFICATION.INVESTMENT.includes(type)) return 'investment';
  if (ACCOUNT_CLASSIFICATION.RECEIVABLE.includes(type)) return 'receivable';
  if (ACCOUNT_CLASSIFICATION.LIABILITY.includes(type))  return 'liability';
  return 'other';
}

/**
 * Get accounts filtered by financial classification.
 * @param {Array} accounts
 * @param {'liquid'|'investment'|'receivable'|'liability'|'other'|'all'} classification
 * @returns {Array}
 */
export function getAccountsByClassification(accounts, classification) {
  if (!classification || classification === 'all') return accounts;
  return accounts.filter(a => classifyAccount(a) === classification);
}

/**
 * Calculate Available Cash.
 * 
 * Available Cash = sum of balances of LIQUID accounts only.
 * Excludes: investments, receivables, loans, credit cards, other liabilities.
 * 
 * @param {Array} accounts - legacy format
 * @returns {number}
 */
export function calculateAvailableCash(accounts) {
  return getAccountsByClassification(accounts, 'liquid')
    .reduce((sum, a) => sum + (parseFloat(a.saldo) || 0), 0);
}

/**
 * Account type mapping for legacy data
 */
export const ACCOUNT_TYPE_MAP = {
  // Legacy Indonesian types
  'cash': 'cash',
  'dompet': 'cash',
  'bank': 'checking',
  'rekening': 'checking',
  'tabungan': 'savings',
  'kartu kredit': 'credit',
  'credit card': 'credit',
  'e-wallet': 'ewallet',
  'ewallet': 'ewallet',
  'gopay': 'ewallet',
  'ovo': 'ewallet',
  'dana': 'ewallet',
  'shopeepay': 'ewallet',
  'investasi': 'investment',
  'investment': 'investment',
  'saham': 'investment',
  'crypto': 'investment',
  'utang': 'loan',
  'hutang': 'loan',
  'piutang': 'receivable',
  'loan': 'loan',
  'receivable': 'receivable',
  'lainnya': 'other',
  'other': 'other'
};

/**
 * Normalize account type from legacy format
 * @param {string} legacyType
 * @returns {string}
 */
export function normalizeAccountType(legacyType) {
  const lower = (legacyType || '').toLowerCase().trim();
  return ACCOUNT_TYPE_MAP[lower] || 'other';
}

/**
 * Validate account data
 * @param {Object} account
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateAccount(account) {
  const errors = [];
  
  if (!account.nama || account.nama.trim() === '') {
    errors.push('Account name is required');
  }
  
  if (!account.jenis) {
    errors.push('Account type is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
