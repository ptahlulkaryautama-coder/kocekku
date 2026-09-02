/**
 * Legacy Data Adapter
 * Handles reading and writing legacy Sakku data format
 */

/**
 * Legacy storage keys used by the original Kocekku
 */
export const LEGACY_KEYS = {
  DOMPET: 'kocekku_dompet',
  TRANSAKSI: 'kocekku_transaksi',
  ANGGARAN: 'kocekku_anggaran',
  TABUNGAN: 'kocekku_tabungan',
  TAGIHAN: 'kocekku_tagihan',
  KELUARGA: 'kocekku_keluarga',
  USER: 'kocekku_user',
  THEME: 'kocekku_theme',
  LANGUAGE: 'kocekku_language'
};

/**
 * New storage keys for Sakku
 */
export const NEW_KEYS = {
  SCHEMA_VERSION: 'kocekku_schema_version',
  ACCOUNTS: 'kocekku_accounts',
  TRANSACTIONS: 'kocekku_transactions',
  BUDGETS: 'kocekku_budgets',
  GOALS: 'kocekku_goals',
  BILLS: 'kocekku_bills',
  FAMILY_MEMBERS: 'kocekku_family_members',
  USER: 'kocekku_user',
  SETTINGS: 'kocekku_settings'
};

/**
 * Read legacy data from localStorage
 * @returns {Object}
 */
export function readLegacyData() {
  const data = {
    accounts: [],
    transactions: [],
    budgets: [],
    goals: [],
    bills: [],
    familyMembers: [],
    user: {}
  };
  
  try {
    // Accounts (Wallets/Dompet)
    const dompet = localStorage.getItem(LEGACY_KEYS.DOMPET);
    if (dompet) {
      data.accounts = JSON.parse(dompet);
    }
    
    // Transactions
    const transaksi = localStorage.getItem(LEGACY_KEYS.TRANSAKSI);
    if (transaksi) {
      data.transactions = JSON.parse(transaksi);
    }
    
    // Budgets
    const anggaran = localStorage.getItem(LEGACY_KEYS.ANGGARAN);
    if (anggaran) {
      data.budgets = JSON.parse(anggaran);
    }
    
    // Savings Goals
    const tabungan = localStorage.getItem(LEGACY_KEYS.TABUNGAN);
    if (tabungan) {
      data.goals = JSON.parse(tabungan);
    }
    
    // Bills
    const tagihan = localStorage.getItem(LEGACY_KEYS.TAGIHAN);
    if (tagihan) {
      data.bills = JSON.parse(tagihan);
    }
    
    // Family Members
    const keluarga = localStorage.getItem(LEGACY_KEYS.KELUARGA);
    if (keluarga) {
      data.familyMembers = JSON.parse(keluarga);
    }
    
    // User
    const user = localStorage.getItem(LEGACY_KEYS.USER);
    if (user) {
      data.user = JSON.parse(user);
    }
    
    console.log('[Legacy Adapter] Read legacy data:', {
      accounts: data.accounts.length,
      transactions: data.transactions.length,
      budgets: data.budgets.length,
      goals: data.goals.length,
      bills: data.bills.length,
      familyMembers: data.familyMembers.length
    });
  } catch (error) {
    console.error('[Legacy Adapter] Error reading legacy data:', error);
  }
  
  return data;
}

/**
 * Migrate legacy account data to new format
 * @param {Object} account - Legacy account object
 * @returns {Object}
 */
export function migrateAccount(account) {
  return {
    id: account.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nama: account.nama || account.name || '',
    jenis: normalizeAccountType(account.jenis || account.type || 'lainnya'),
    saldo: parseFloat(account.saldo || account.balance) || 0,
    mataUang: account.mataUang || account.currency || 'IDR',
    icon: account.icon || getDefaultAccountIcon(account.jenis || account.type),
    aktif: account.aktif !== false,
    createdAt: account.createdAt || new Date().toISOString()
  };
}

/**
 * Migrate legacy transaction data to new format
 * @param {Object} transaction - Legacy transaction object
 * @returns {Object}
 */
export function migrateTransaction(transaction) {
  return {
    id: transaction.id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tanggal: transaction.tanggal || transaction.date || new Date().toISOString().split('T')[0],
    keterangan: transaction.keterangan || transaction.description || '',
    jumlah: parseFloat(transaction.jumlah || transaction.amount) || 0,
    tipe: transaction.tipe || transaction.type || 'keluar',
    dompet: transaction.dompet || transaction.account || '',
    kategori: transaction.kategori || transaction.category || '',
    pengeluar: transaction.pengeluar || transaction.member || '',
    catatan: transaction.catatan || transaction.notes || '',
    recurring: transaction.recurring || null,
    createdAt: transaction.createdAt || new Date().toISOString()
  };
}

/**
 * Migrate legacy budget data to new format
 * @param {Object} budget - Legacy budget object
 * @returns {Object}
 */
export function migrateBudget(budget) {
  return {
    id: budget.id || `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    kategori: budget.kategori || budget.category || '',
    anggaran: parseFloat(budget.anggaran || budget.amount) || 0,
    period: budget.period || 'monthly',
    createdAt: budget.createdAt || new Date().toISOString()
  };
}

/**
 * Migrate legacy goal data to new format
 * @param {Object} goal - Legacy goal object
 * @returns {Object}
 */
export function migrateGoal(goal) {
  return {
    id: goal.id || `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nama: goal.nama || goal.name || '',
    target: parseFloat(goal.target) || 0,
    terkumpul: parseFloat(goal.terkumpul || goal.saved) || 0,
    targetDate: goal.targetDate || null,
    icon: goal.icon || 'target',
    catatan: goal.catatan || goal.notes || '',
    createdAt: goal.createdAt || new Date().toISOString()
  };
}

/**
 * Migrate legacy bill data to new format
 * @param {Object} bill - Legacy bill object
 * @returns {Object}
 */
export function migrateBill(bill) {
  return {
    id: bill.id || `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nama: bill.nama || bill.name || '',
    jumlah: parseFloat(bill.jumlah || bill.amount) || 0,
    tanggalJatuhTempo: parseInt(bill.tanggalJatuhTempo || bill.dueDate) || 1,
    kategori: bill.kategori || bill.category || '',
    aktif: bill.aktif !== false,
    catatan: bill.catatan || bill.notes || '',
    createdAt: bill.createdAt || new Date().toISOString()
  };
}

/**
 * Migrate legacy family member data to new format
 * @param {Object} member - Legacy family member object
 * @returns {Object}
 */
export function migrateFamilyMember(member) {
  return {
    id: member.id || `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nama: member.nama || member.name || '',
    hubungan: normalizeRelationship(member.hubungan || member.relationship || ''),
    avatar: member.avatar || '',
    color: member.color || '#6B7280',
    createdAt: member.createdAt || new Date().toISOString()
  };
}

/**
 * Normalize account type from legacy format
 */
function normalizeAccountType(type) {
  const typeMap = {
    'cash': 'cash',
    'dompet': 'cash',
    'bank': 'checking',
    'rekening': 'checking',
    'tabungan': 'savings',
    'kartu kredit': 'credit',
    'e-wallet': 'ewallet',
    'investasi': 'investment',
    'utang': 'loan',
    'piutang': 'receivable',
    'lainnya': 'other'
  };
  
  return typeMap[(type || '').toLowerCase()] || 'other';
}

/**
 * Normalize relationship from legacy format
 */
function normalizeRelationship(rel) {
  const relMap = {
    'ayah': 'Father',
    'ibu': 'Mother',
    'anak': 'Child',
    'suami': 'Husband',
    'istri': 'Wife',
    'saudara': 'Sibling',
    'lainnya': 'Other'
  };
  
  return relMap[(rel || '').toLowerCase()] || rel || 'Other';
}

/**
 * Get default icon for account type
 */
function getDefaultAccountIcon(type) {
  const iconMap = {
    'cash': 'banknote',
    'dompet': 'banknote',
    'bank': 'building-2',
    'rekening': 'building-2',
    'tabungan': 'piggy-bank',
    'kartu kredit': 'credit-card',
    'e-wallet': 'smartphone',
    'investasi': 'trending-up',
    'utang': 'file-text',
    'piutang': 'users'
  };
  
  return iconMap[(type || '').toLowerCase()] || 'wallet';
}

/**
 * Check if legacy data exists
 * @returns {boolean}
 */
export function hasLegacyData() {
  return Object.values(LEGACY_KEYS).some(key => {
    const value = localStorage.getItem(key);
    return value !== null && value !== undefined;
  });
}

/**
 * Clear legacy data after successful migration
 */
export function clearLegacyData() {
  Object.values(LEGACY_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('[Legacy Adapter] Legacy data cleared');
}
