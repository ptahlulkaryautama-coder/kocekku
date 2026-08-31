/**
 * Bills & Subscriptions Domain Logic
 * Pure functions for bill calculations - no DOM dependencies
 */

/**
 * Bill statuses (derived, not stored)
 */
export const BILL_STATUS = {
  UPCOMING: 'upcoming',
  DUE: 'due',
  OVERDUE: 'overdue',
  PAID: 'paid',
  INACTIVE: 'inactive'
};

/**
 * Valid recurrence types
 */
export const RECURRENCE = {
  NONE: 'none',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
};

/**
 * Determine the current period's due date for a bill.
 * Supports monthly (day-of-month), weekly, and yearly recurrence.
 * 
 * @param {Object} bill - { tanggalJatuhTempo, ulang, createdAt }
 * @param {Date} [referenceDate] - date to calculate from (default: now)
 * @returns {Date|null}
 */
export function getNextDueDate(bill, referenceDate) {
  const now = referenceDate || new Date();
  const recurrence = bill.ulang || RECURRENCE.MONTHLY;
  const dayOfMonth = parseInt(bill.tanggalJatuhTempo);
  
  if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null;
  
  if (recurrence === RECURRENCE.WEEKLY) {
    // Find next occurrence of this day-of-week from bill creation
    const createdDate = bill.createdAt ? new Date(bill.createdAt) : now;
    const targetDayOfWeek = createdDate.getDay();
    const next = new Date(now);
    next.setHours(0, 0, 0, 0);
    while (next.getDay() !== targetDayOfWeek) {
      next.setDate(next.getDate() + 1);
    }
    // If that's today and it's already past, move to next week
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }
    return next;
  }
  
  if (recurrence === RECURRENCE.YEARLY) {
    let dueDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (dueDate < now) {
      dueDate = new Date(now.getFullYear() + 1, now.getMonth(), dayOfMonth);
    }
    return dueDate;
  }
  
  // Default: monthly (day of month)
  let dueDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (dueDate < now) {
    dueDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  }
  
  return dueDate;
}

/**
 * Get the due date for a specific past month.
 * Used for checking if a bill was already paid this cycle.
 * 
 * @param {Object} bill
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Date|null}
 */
export function getDueDateForMonth(bill, year, month) {
  const dayOfMonth = parseInt(bill.tanggalJatuhTempo);
  if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null;
  return new Date(year, month, dayOfMonth);
}

/**
 * Calculate bill status based on dates and payment history.
 * 
 * @param {Object} bill
 * @param {Date} [referenceDate]
 * @returns {string} BILL_STATUS value
 */
export function calculateBillStatus(bill, referenceDate) {
  const now = referenceDate || new Date();
  now.setHours(0, 0, 0, 0);
  
  if (bill.aktif === false) return BILL_STATUS.INACTIVE;
  
  // Check if already paid this cycle (current month)
  if (bill.terakhirBayar) {
    const paidDate = new Date(bill.terakhirBayar);
    paidDate.setHours(0, 0, 0, 0);
    
    // A bill is PAID only if terakhirBayar is in the current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    if (paidDate >= currentMonthStart && paidDate <= currentMonthEnd) {
      return BILL_STATUS.PAID;
    }
  }
  
  const dueDate = getNextDueDate(bill, referenceDate);
  if (!dueDate) return BILL_STATUS.UPCOMING;
  
  dueDate.setHours(0, 0, 0, 0);
  
  // Due today
  if (dueDate.getTime() === now.getTime()) {
    return BILL_STATUS.DUE;
  }
  
  // Overdue (due date was before today)
  if (dueDate < now) {
    return BILL_STATUS.OVERDUE;
  }
  
  return BILL_STATUS.UPCOMING;
}

/**
 * Get days until bill is due (or negative if overdue).
 * 
 * @param {Object} bill
 * @param {Date} [referenceDate]
 * @returns {number}
 */
export function getDaysUntilDue(bill, referenceDate) {
  const dueDate = getNextDueDate(bill, referenceDate);
  if (!dueDate) return Infinity;
  
  const now = referenceDate || new Date();
  const nowCopy = new Date(now);
  nowCopy.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  return Math.ceil((dueDate - nowCopy) / (1000 * 60 * 60 * 24));
}

/**
 * Get upcoming bills (within X days).
 * 
 * @param {Array} bills
 * @param {number} daysAhead
 * @returns {Array}
 */
export function getUpcomingBills(bills, daysAhead = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return bills
    .filter(bill => {
      if (bill.aktif === false) return false;
      const status = calculateBillStatus(bill, now);
      if (status === BILL_STATUS.PAID) return false;
      const dueDate = getNextDueDate(bill, now);
      return dueDate && dueDate >= now && dueDate <= futureDate;
    })
    .map(bill => ({
      ...bill,
      nextDueDate: getNextDueDate(bill, now),
      daysUntilDue: getDaysUntilDue(bill, now),
      status: calculateBillStatus(bill, now)
    }))
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Get bills grouped by status.
 * 
 * @param {Array} bills
 * @param {Date} [referenceDate]
 * @returns {Object} { overdue: [], due: [], upcoming: [], paid: [], inactive: [] }
 */
export function getBillsByStatus(bills, referenceDate) {
  const groups = {
    overdue: [],
    due: [],
    upcoming: [],
    paid: [],
    inactive: []
  };
  
  bills.forEach(bill => {
    const status = calculateBillStatus(bill, referenceDate);
    const enriched = {
      ...bill,
      status,
      nextDueDate: getNextDueDate(bill, referenceDate),
      daysUntilDue: getDaysUntilDue(bill, referenceDate)
    };
    groups[status].push(enriched);
  });
  
  // Sort each group
  groups.overdue.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  groups.due.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  groups.upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  
  return groups;
}

/**
 * Calculate comprehensive bills summary.
 * 
 * @param {Array} bills
 * @param {number} monthlyIncome
 * @param {Date} [referenceDate]
 * @returns {Object}
 */
export function calculateBillsSummary(bills, monthlyIncome = 0, referenceDate) {
  const now = referenceDate || new Date();
  const groups = getBillsByStatus(bills, now);
  
  const totalDue = [...groups.overdue, ...groups.due, ...groups.upcoming]
    .reduce((sum, b) => sum + (parseFloat(b.jumlah) || 0), 0);
  
  const totalDueThisWeek = [...groups.overdue, ...groups.due, ...groups.upcoming]
    .filter(b => {
      const days = b.daysUntilDue;
      return days <= 7;
    })
    .reduce((sum, b) => sum + (parseFloat(b.jumlah) || 0), 0);
  
  const totalOverdue = groups.overdue
    .reduce((sum, b) => sum + (parseFloat(b.jumlah) || 0), 0);
  
  const totalPaid = groups.paid
    .reduce((sum, b) => sum + (parseFloat(b.jumlah) || 0), 0);
  
  const monthlyCommitments = bills
    .filter(b => b.aktif !== false && calculateBillStatus(b, now) !== BILL_STATUS.PAID)
    .reduce((sum, b) => sum + (parseFloat(b.jumlah) || 0), 0);
  
  return {
    totalDue,
    totalDueThisWeek,
    totalOverdue,
    totalPaid,
    monthlyCommitments,
    overdueCount: groups.overdue.length,
    dueCount: groups.due.length,
    upcomingCount: groups.upcoming.length,
    paidCount: groups.paid.length,
    totalCount: bills.filter(b => b.aktif !== false).length
  };
}

/**
 * Calculate monthly commitments (legacy-compatible).
 * 
 * @param {Array} bills
 * @returns {number}
 */
export function calculateMonthlyCommitments(bills) {
  return bills
    .filter(bill => bill.aktif !== false)
    .reduce((sum, bill) => sum + (parseFloat(bill.jumlah) || 0), 0);
}

/**
 * Calculate commitment percentage of income.
 * 
 * @param {Array} bills
 * @param {number} monthlyIncome
 * @returns {number}
 */
export function calculateCommitmentPercentage(bills, monthlyIncome) {
  const commitments = calculateMonthlyCommitments(bills);
  if (monthlyIncome <= 0) return 0;
  return Math.round((commitments / monthlyIncome) * 100);
}

/**
 * Get bills summary (legacy-compatible, used by dashboard).
 * 
 * @param {Array} bills
 * @param {number} monthlyIncome
 * @returns {Object}
 */
export function getBillsSummary(bills, monthlyIncome = 0) {
  const activeBills = bills.filter(b => b.aktif !== false);
  const monthlyCommitments = calculateMonthlyCommitments(activeBills);
  const commitmentPercentage = calculateCommitmentPercentage(activeBills, monthlyIncome);
  const upcomingCount = getUpcomingBills(activeBills, 7).length;
  
  return {
    totalCount: activeBills.length,
    monthlyCommitments,
    commitmentPercentage,
    upcomingCount,
    remainingIncome: monthlyIncome - monthlyCommitments
  };
}

/**
 * Create a new bill object.
 * 
 * @param {Object} data
 * @returns {Object}
 */
export function createBill(data) {
  return {
    id: data.id || `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nama: data.nama || '',
    jumlah: parseFloat(data.jumlah) || 0,
    tanggalJatuhTempo: parseInt(data.tanggalJatuhTempo) || 1,
    kategori: data.kategori || '',
    aktif: data.aktif !== false,
    ulang: data.ulang || RECURRENCE.MONTHLY,
    dompet: data.dompet || '',
    terakhirBayar: data.terakhirBayar || null,
    catatan: data.catatan || '',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * Validate bill data.
 * 
 * @param {Object} bill
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateBill(bill) {
  if (!bill) return { valid: false, errors: ['Bill data is required'] };
  const errors = [];
  
  if (!bill.nama || bill.nama.trim() === '') {
    errors.push('Bill name is required');
  }
  
  if (!bill.jumlah || parseFloat(bill.jumlah) <= 0) {
    errors.push('Amount must be greater than 0');
  }
  
  if (!bill.tanggalJatuhTempo || bill.tanggalJatuhTempo < 1 || bill.tanggalJatuhTempo > 31) {
    errors.push('Due date must be between 1 and 31');
  }
  
  if (bill.ulang && !Object.values(RECURRENCE).includes(bill.ulang)) {
    errors.push('Invalid recurrence type');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if a bill has been paid for a given month.
 * 
 * @param {Object} bill
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {boolean}
 */
export function isBillPaidForMonth(bill, year, month) {
  if (!bill.terakhirBayar) return false;
  const paidDate = new Date(bill.terakhirBayar);
  return paidDate.getFullYear() === year && paidDate.getMonth() === month;
}

/**
 * Calculate next occurrence date after payment.
 * 
 * @param {Object} bill
 * @param {Date} paymentDate
 * @returns {Date|null}
 */
export function calculateNextOccurrence(bill, paymentDate) {
  const recurrence = bill.ulang || RECURRENCE.MONTHLY;
  const dayOfMonth = parseInt(bill.tanggalJatuhTempo);
  
  if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) return null;
  
  const paid = paymentDate || new Date();
  
  switch (recurrence) {
    case RECURRENCE.NONE:
      return null; // One-time bill, no next occurrence
    case RECURRENCE.WEEKLY: {
      const next = new Date(paid);
      next.setDate(next.getDate() + 7);
      return next;
    }
    case RECURRENCE.YEARLY: {
      return new Date(paid.getFullYear() + 1, paid.getMonth(), dayOfMonth);
    }
    case RECURRENCE.MONTHLY:
    default: {
      const nextMonth = paid.getMonth() + 1;
      return new Date(paid.getFullYear(), nextMonth, dayOfMonth);
    }
  }
}
