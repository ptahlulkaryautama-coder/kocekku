/**
 * Budget Domain Logic
 * Pure functions for budget calculations - no DOM dependencies
 */

/**
 * Calculate budget usage for a category
 * @param {Object} budget - { kategori, anggaran }
 * @param {number} spent - amount spent in this category
 * @returns {Object}
 */
export function calculateBudgetUsage(budget, spent) {
  if (!budget) return { category: '', limit: 0, used: 0, remaining: 0, percentage: 0, isOverBudget: false, status: 'on-track' };
  const limit = parseFloat(budget.anggaran) || 0;
  const used = parseFloat(spent) || 0;
  const remaining = limit - used;
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const isOverBudget = used > limit && limit > 0;
  
  return {
    category: budget.kategori,
    limit,
    used,
    remaining,
    percentage: Math.min(percentage, 999), // Cap for display
    isOverBudget,
    status: isOverBudget ? 'over' : percentage >= 90 ? 'warning' : 'on-track'
  };
}

/**
 * Calculate all budget usages for a period
 * @param {Array} budgets - array of { kategori, anggaran }
 * @param {Array} transactions
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Array}
 */
export function calculateAllBudgetUsages(budgets, transactions, year, month) {
  // Get expenses for this period grouped by category
  const expensesByCategory = {};
  
  transactions
    .filter(t => {
      const d = new Date(t.tanggal);
      return t.tipe === 'keluar' && d.getFullYear() === year && d.getMonth() === month;
    })
    .forEach(t => {
      const cat = t.kategori || 'Lainnya';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (parseFloat(t.jumlah) || 0);
    });
  
  return budgets.map(budget => 
    calculateBudgetUsage(budget, expensesByCategory[budget.kategori] || 0)
  );
}

/**
 * Get budget summary
 * @param {Array} budgetUsages - from calculateAllBudgetUsages
 * @returns {Object}
 */
export function getBudgetSummary(budgetUsages) {
  const totalLimit = budgetUsages.reduce((sum, b) => sum + b.limit, 0);
  const totalUsed = budgetUsages.reduce((sum, b) => sum + b.used, 0);
  const totalRemaining = totalLimit - totalUsed;
  const overallPercentage = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
  const overBudgetCount = budgetUsages.filter(b => b.isOverBudget).length;
  
  return {
    totalLimit,
    totalUsed,
    totalRemaining,
    overallPercentage,
    overBudgetCount,
    categoryCount: budgetUsages.length
  };
}

/**
 * Create a new budget object
 * @param {Object} data
 * @returns {Object}
 */
export function createBudget(data) {
  return {
    id: data.id || `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    kategori: data.kategori || '',
    anggaran: parseFloat(data.anggaran) || 0,
    period: data.period || 'monthly',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * Validate budget data
 * @param {Object} budget
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateBudget(budget) {
  const errors = [];
  
  if (!budget.kategori || budget.kategori.trim() === '') {
    errors.push('Category is required');
  }
  
  if (!budget.anggaran || parseFloat(budget.anggaran) <= 0) {
    errors.push('Budget amount must be greater than 0');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
