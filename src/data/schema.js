/**
 * Kocekku 2.0 — Data Schema Definition
 * 
 * Defines the canonical data structures for all entities.
 * Used for validation and migration.
 * 
 * Validators accept BOTH Indonesian and English field names
 * for backward compatibility with legacy data.
 */

export const SCHEMA_VERSION = 2;
export const DATA_VERSION = 1;

/**
 * Account types (normalized)
 * Legacy Indonesian types are mapped to these canonical types.
 */
export const ACCOUNT_TYPES = {
  CASH: 'cash',
  CHECKING: 'checking',
  SAVINGS: 'savings',
  EWALLET: 'ewallet',
  INVESTMENT: 'investment',
  LOAN: 'loan',
  RECEIVABLE: 'receivable',
  OTHER: 'other'
};

/**
 * Legacy account type mapping (Indonesian → English)
 */
export const LEGACY_ACCOUNT_TYPE_MAP = {
  'cash': 'cash',
  'bank': 'checking',
  'bank-digital': 'savings',
  'tabungan': 'savings',
  'ewallet': 'ewallet',
  'e-wallet': 'ewallet',
  'kartu kredit': 'credit',
  'investasi': 'investment',
  'utang': 'loan',
  'piutang': 'receivable',
  'lainnya': 'other'
};

/**
 * Default currency per locale (for new users)
 */
export const DEFAULT_CURRENCY = 'IDR';

/**
 * Default locale
 */
export const DEFAULT_LOCALE = 'en-US';

/**
 * Member role mapping (Indonesian → English)
 */
export const LEGACY_ROLE_MAP = {
  'Admin': 'Admin',
  'Anggota': 'Member',
  'Pasangan': 'Partner',
  'Anak': 'Child',
  'ayah': 'Father',
  'ibu': 'Mother',
  'suami': 'Husband',
  'istri': 'Wife',
  'saudara': 'Sibling'
};

/**
 * Category name mapping (Indonesian → English)
 */
export const LEGACY_CATEGORY_NAME_MAP = {
  'Makan & Jajan': 'Food & Dining',
  'Transportasi': 'Transportation',
  'Belanja Rumah': 'Household',
  'Anak & Sekolah': 'Kids & Education',
  'Tagihan & Listrik': 'Bills & Utilities',
  'Kesehatan': 'Health',
  'Hiburan': 'Entertainment',
  'Gaji': 'Salary',
  'Bonus & THR': 'Bonus',
  'Jualan / Usaha': 'Business',
  'Fee & Komisi': 'Commission',
  'Pemasukan Lainnya': 'Other Income',
  'Pinjam Uang': 'Loan Received',
  'Bayar Utang': 'Debt Payment',
  'Kasih Pinjaman': 'Loan Given',
  'Terima Bayar Piutang': 'Receivable Payment'
};

/**
 * Validate a member object (accepts both Indonesian and English fields)
 */
export function validateMember(m) {
  if (!m) return false;
  // Accept either nama (Indonesian) or name (English)
  const hasId = typeof m.id === 'string';
  const hasName = (typeof m.nama === 'string' && m.nama.length > 0) || 
                  (typeof m.name === 'string' && m.name.length > 0);
  return hasId && hasName;
}

/**
 * Validate a category object (accepts both formats)
 */
export function validateCategory(c) {
  if (!c) return false;
  const hasId = typeof c.id === 'string';
  const hasName = (typeof c.name === 'string' && c.name.length > 0) ||
                  (typeof c.nama === 'string' && c.nama.length > 0);
  const hasKind = c.kind === 'income' || c.kind === 'expense' || 
                  c.tipe === 'masuk' || c.tipe === 'keluar';
  return hasId && hasName && hasKind;
}

/**
 * Validate an account object (accepts both Indonesian and English fields)
 */
export function validateAccount(a) {
  if (!a) return false;
  const hasId = typeof a.id === 'string';
  const hasName = (typeof a.name === 'string' && a.name.length > 0) ||
                  (typeof a.nama === 'string' && a.nama.length > 0);
  const hasBalance = typeof (a.balance || a.saldo) === 'number' || 
                     !isNaN(parseFloat(a.balance || a.saldo));
  const hasType = typeof (a.type || a.jenis) === 'string';
  return hasId && hasName && hasBalance && hasType;
}

/**
 * Validate a transaction object (accepts both Indonesian and English fields)
 */
export function validateTransaction(t) {
  if (!t) return false;
  const hasId = typeof t.id === 'string';
  const hasDate = typeof (t.date || t.tanggal) === 'string';
  const amount = parseFloat(t.amount || t.jumlah) || 0;
  const hasAmount = amount >= 0;
  const type = t.type || t.tipe;
  const hasType = type === 'income' || type === 'expense' || 
                  type === 'masuk' || type === 'keluar' || type === 'transfer';
  
  // Account can be accountId (English) or dompet (Indonesian)
  const hasAccount = typeof (t.accountId || t.dompet) === 'string';
  
  return hasId && hasDate && hasAmount && hasType && hasAccount;
}

/**
 * Validate a goal object (accepts both formats)
 */
export function validateGoal(g) {
  if (!g) return false;
  const hasId = typeof g.id === 'string';
  const hasName = (typeof g.name === 'string' && g.name.length > 0) ||
                  (typeof g.nama === 'string' && g.nama.length > 0);
  const target = parseFloat(g.target) || 0;
  const current = parseFloat(g.current || g.terkumpul) || 0;
  return hasId && hasName && target >= 0;
}

/**
 * Validate an envelope (budget) object (accepts both formats)
 */
export function validateEnvelope(e) {
  if (!e) return false;
  const hasId = typeof e.id === 'string';
  const hasCategory = typeof (e.categoryId || e.kategori) === 'string';
  const limit = parseFloat(e.limit || e.anggaran) || 0;
  return hasId && hasCategory && limit >= 0;
}

/**
 * Validate a bill object (accepts both formats)
 */
export function validateBill(b) {
  if (!b) return false;
  const hasId = typeof b.id === 'string';
  const hasName = (typeof b.name === 'string' && b.name.length > 0) ||
                  (typeof b.nama === 'string' && b.nama.length > 0);
  const amount = parseFloat(b.amount || b.jumlah) || 0;
  const dueDate = parseInt(b.dueDate || b.tanggalJatuhTempo) || 0;
  return hasId && hasName && amount >= 0 && dueDate >= 1;
}

/**
 * Validate the full data structure (accepts both formats)
 */
export function validateFullDataset(data) {
  const errors = [];

  if (!data.members || !Array.isArray(data.members)) {
    errors.push('Missing or invalid members array');
  } else {
    data.members.forEach((m, i) => {
      if (!validateMember(m)) errors.push(`Invalid member at index ${i}`);
    });
  }

  if (!data.categories || !Array.isArray(data.categories)) {
    // Categories may not exist in legacy data — that's ok
  } else {
    data.categories.forEach((c, i) => {
      if (!validateCategory(c)) errors.push(`Invalid category at index ${i}`);
    });
  }

  if (!data.accounts || !Array.isArray(data.accounts)) {
    errors.push('Missing or invalid accounts array');
  } else {
    data.accounts.forEach((a, i) => {
      if (!validateAccount(a)) errors.push(`Invalid account at index ${i}`);
    });
  }

  if (!data.transactions || !Array.isArray(data.transactions)) {
    errors.push('Missing or invalid transactions array');
  } else {
    data.transactions.forEach((t, i) => {
      if (!validateTransaction(t)) errors.push(`Invalid transaction at index ${i}`);
    });
  }

  if (data.goals && Array.isArray(data.goals)) {
    data.goals.forEach((g, i) => {
      if (!validateGoal(g)) errors.push(`Invalid goal at index ${i}`);
    });
  }

  if (data.envelopes && Array.isArray(data.envelopes)) {
    data.envelopes.forEach((e, i) => {
      if (!validateEnvelope(e)) errors.push(`Invalid envelope at index ${i}`);
    });
  }

  if (data.bills && Array.isArray(data.bills)) {
    data.bills.forEach((b, i) => {
      if (!validateBill(b)) errors.push(`Invalid bill at index ${i}`);
    });
  }

  return { valid: errors.length === 0, errors };
}
