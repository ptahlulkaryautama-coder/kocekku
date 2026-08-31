/**
 * Transaction Domain Logic
 * Pure functions for transaction calculations - no DOM dependencies
 */

/**
 * Filter transactions by date range
 * @param {Array} transactions
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Array}
 */
export function filterByDateRange(transactions, startDate, endDate) {
  if (!startDate || !endDate) return transactions;
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return transactions.filter(t => {
    const tDate = new Date(t.tanggal);
    return tDate >= start && tDate <= end;
  });
}

/**
 * Filter transactions by type
 * @param {Array} transactions
 * @param {string} type - 'masuk' | 'keluar' | 'transfer'
 * @returns {Array}
 */
export function filterByType(transactions, type) {
  if (!type || type === 'all') return transactions;
  return transactions.filter(t => t.tipe === type);
}

/**
 * Filter transactions by account
 * @param {Array} transactions
 * @param {string} accountId
 * @returns {Array}
 */
export function filterByAccount(transactions, accountId) {
  if (!accountId || accountId === 'all') return transactions;
  return transactions.filter(t => t.dompet === accountId);
}

/**
 * Filter transactions by category
 * @param {Array} transactions
 * @param {string} category
 * @returns {Array}
 */
export function filterByCategory(transactions, category) {
  if (!category || category === 'all') return transactions;
  return transactions.filter(t => t.kategori === category);
}

/**
 * Filter transactions by family member
 * @param {Array} transactions
 * @param {string} memberId
 * @returns {Array}
 */
export function filterByMember(transactions, memberId) {
  if (!memberId || memberId === 'all') return transactions;
  return transactions.filter(t => t.pengeluar === memberId);
}

/**
 * Search transactions by description
 * @param {Array} transactions
 * @param {string} query
 * @returns {Array}
 */
export function searchTransactions(transactions, query) {
  if (!query) return transactions;
  const lowerQuery = query.toLowerCase();
  return transactions.filter(t => 
    t.keterangan?.toLowerCase().includes(lowerQuery) ||
    t.catatan?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Sort transactions
 * @param {Array} transactions
 * @param {string} field - 'tanggal' | 'jumlah' | 'keterangan'
 * @param {string} direction - 'asc' | 'desc'
 * @returns {Array}
 */
export function sortTransactions(transactions, field = 'tanggal', direction = 'desc') {
  return [...transactions].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];
    
    if (field === 'tanggal') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    } else if (field === 'jumlah') {
      aVal = parseFloat(aVal) || 0;
      bVal = parseFloat(bVal) || 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }
    
    if (direction === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });
}

/**
 * Calculate total income for a period
 * @param {Array} transactions
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {number}
 */
export function calculateMonthlyIncome(transactions, year, month) {
  return transactions
    .filter(t => {
      const d = new Date(t.tanggal);
      return t.tipe === 'masuk' && d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, t) => sum + (parseFloat(t.jumlah) || 0), 0);
}

/**
 * Calculate total expenses for a period
 * @param {Array} transactions
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {number}
 */
export function calculateMonthlyExpenses(transactions, year, month) {
  return transactions
    .filter(t => {
      const d = new Date(t.tanggal);
      return t.tipe === 'keluar' && d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, t) => sum + (parseFloat(t.jumlah) || 0), 0);
}

/**
 * Calculate spending by category for a period
 * @param {Array} transactions
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Object} - { category: amount }
 */
export function spendingByCategory(transactions, year, month) {
  const categories = {};
  
  transactions
    .filter(t => {
      const d = new Date(t.tanggal);
      return t.tipe === 'keluar' && d.getFullYear() === year && d.getMonth() === month;
    })
    .forEach(t => {
      const cat = t.kategori || 'Lainnya';
      categories[cat] = (categories[cat] || 0) + (parseFloat(t.jumlah) || 0);
    });
  
  return categories;
}

/**
 * Calculate income by source for a period
 * @param {Array} transactions
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Object} - { category: amount }
 */
export function incomeBySource(transactions, year, month) {
  const sources = {};
  
  transactions
    .filter(t => {
      const d = new Date(t.tanggal);
      return t.tipe === 'masuk' && d.getFullYear() === year && d.getMonth() === month;
    })
    .forEach(t => {
      const cat = t.kategori || 'Lainnya';
      sources[cat] = (sources[cat] || 0) + (parseFloat(t.jumlah) || 0);
    });
  
  return sources;
}

/**
 * Get transactions for a specific period
 * @param {Array} transactions
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Array}
 */
export function getTransactionsForPeriod(transactions, year, month) {
  return transactions.filter(t => {
    const d = new Date(t.tanggal);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/**
 * Calculate cash flow (income - expenses) for a period
 * @param {Array} transactions
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {number}
 */
export function calculateCashFlow(transactions, year, month) {
  const income = calculateMonthlyIncome(transactions, year, month);
  const expenses = calculateMonthlyExpenses(transactions, year, month);
  return income - expenses;
}

/**
 * Get recent transactions
 * @param {Array} transactions
 * @param {number} limit
 * @returns {Array}
 */
export function getRecentTransactions(transactions, limit = 5) {
  return sortTransactions(transactions, 'tanggal', 'desc').slice(0, limit);
}

/**
 * Create a new transaction object
 * @param {Object} data
 * @returns {Object}
 */
export function createTransaction(data) {
  return {
    id: data.id || `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tanggal: data.tanggal || new Date().toISOString().split('T')[0],
    keterangan: data.keterangan || '',
    jumlah: parseFloat(data.jumlah) || 0,
    tipe: data.tipe || 'keluar',
    dompet: data.dompet || '',
    kategori: data.kategori || '',
    pengeluar: data.pengeluar || '',
    catatan: data.catatan || '',
    recurring: data.recurring || null,
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * Validate transaction data
 * @param {Object} transaction
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateTransaction(transaction) {
  const errors = [];
  
  if (!transaction.tanggal) {
    errors.push('Date is required');
  }
  
  if (!transaction.keterangan || transaction.keterangan.trim() === '') {
    errors.push('Description is required');
  }
  
  if (!transaction.jumlah || parseFloat(transaction.jumlah) <= 0) {
    errors.push('Amount must be greater than 0');
  }
  
  if (!transaction.tipe || !['masuk', 'keluar', 'transfer'].includes(transaction.tipe)) {
    errors.push('Invalid transaction type');
  }
  
  if (!transaction.dompet) {
    errors.push('Account is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
