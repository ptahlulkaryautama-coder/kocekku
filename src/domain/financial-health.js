/**
 * Kocekku 2.0 — Financial Domain Logic
 * 
 * Pure functions for all financial calculations.
 * These do NOT depend on DOM, Alpine.js, or any UI framework.
 * They receive data and return results.
 * 
 * Uses Indonesian field names to match legacy Kocekku data format:
 * - tipe (type): 'masuk' | 'keluar' | 'transfer'
 * - tanggal (date): ISO date string
 * - jumlah (amount): number
 * - dompet (account): account ID
 * - kategori (category): category name
 * - pengeluar (member): member ID
 * - keterangan (description): string
 * - catatan (notes): string
 */

import { getAccountsByClassification } from './accounts.js';

/**
 * Calculate total monthly income for a given month/year.
 * 
 * @param {Array} transactions - legacy format with 'tipe', 'tanggal', 'jumlah'
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {number}
 */
export function calculateMonthlyIncome(transactions, year, month) {
  let total = 0;
  for (const t of transactions) {
    const d = new Date(t.tanggal);
    if (d.getFullYear() === year && d.getMonth() === month && t.tipe === 'masuk') {
      total += parseFloat(t.jumlah) || 0;
    }
  }
  return total;
}

/**
 * Calculate total monthly expenses for a given month/year.
 * 
 * @param {Array} transactions - legacy format
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {number}
 */
export function calculateMonthlyExpenses(transactions, year, month) {
  let total = 0;
  for (const t of transactions) {
    const d = new Date(t.tanggal);
    if (d.getFullYear() === year && d.getMonth() === month && t.tipe === 'keluar') {
      total += parseFloat(t.jumlah) || 0;
    }
  }
  return total;
}

/**
 * Calculate savings rate as a percentage.
 * 
 * @param {number} income
 * @param {number} expenses
 * @returns {number} 0-100
 */
export function calculateSavingsRate(income, expenses) {
  if (income === 0) return 0;
  const rate = ((income - expenses) / income) * 100;
  return Math.max(0, Math.round(rate));
}

/**
 * Get savings rate assessment text.
 * 
 * @param {number} rate - 0-100
 * @returns {{ status: string, text: string, level: 'healthy' | 'adequate' | 'critical' }}
 */
export function assessSavingsRate(rate) {
  if (rate >= 20) {
    return {
      status: 'HEALTHY',
      level: 'healthy',
      text: 'Excellent! You\'re saving well above the recommended 20% threshold.'
    };
  } else if (rate >= 10) {
    return {
      status: 'ADEQUATE',
      level: 'adequate',
      text: 'Your savings rate is between 10-20%. Consider reducing discretionary spending.'
    };
  } else {
    return {
      status: 'CRITICAL',
      level: 'critical',
      text: 'Savings below 10% of income. Monthly spending nearly exceeds total income.'
    };
  }
}

/**
 * Calculate net worth (assets minus liabilities).
 * 
 * Delegates to the canonical implementation in accounts.js
 * which uses classifyAccount() for consistent behavior.
 * 
 * @param {Array} accounts - legacy format with 'saldo', 'jenis'
 * @returns {{ total: number, assets: number, liabilities: number }}
 */
export { calculateNetWorth } from './accounts.js';

/**
 * Calculate emergency fund coverage in months.
 * 
 * @param {Array} accounts - legacy format with 'saldo', 'jenis'
 * @param {number} monthlyExpenses - Average monthly expenses
 * @returns {{ months: number, status: 'safe' | 'caution' | 'danger', text: string, liquidAssets: number }}
 */
export function calculateEmergencyFundCoverage(accounts, monthlyExpenses) {
  // Use centralized classification — only LIQUID accounts (cash, bank, savings, e-wallet)
  // Investments, receivables, and liabilities are excluded.
  const liquidAccounts = getAccountsByClassification(accounts, 'liquid');
  const liquidAssets = liquidAccounts
    .reduce((sum, a) => sum + Math.max(parseFloat(a.saldo || a.balance) || 0, 0), 0);

  const avgExpense = monthlyExpenses || 1; // Prevent division by zero
  const months = Math.round((liquidAssets / avgExpense) * 10) / 10;

  let status, text;
  if (months >= 6) {
    status = 'safe';
    text = `Liquid assets can cover ${months} months of expenses in case of income interruption.`;
  } else if (months >= 3) {
    status = 'caution';
    text = `Emergency fund covers only ${months} months. Consider building up to 6 months.`;
  } else {
    status = 'danger';
    text = `Very vulnerable. Only ${months} months of liquid coverage. Prioritize building your emergency fund.`;
  }

  return { months, status, text, liquidAssets };
}

/**
 * Calculate debt burden ratio.
 * 
 * @param {Array} transactions - legacy format
 * @param {Array} categories
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} income
 * @returns {{ ratio: number, status: 'safe' | 'caution' | 'danger', text: string }}
 */
export function calculateDebtBurden(transactions, categories, year, month, income) {
  let debtPayments = 0;

  for (const t of transactions) {
    const d = new Date(t.tanggal);
    if (d.getFullYear() === year && d.getMonth() === month && t.tipe === 'keluar') {
      // Check if this is a debt-related category
      const catName = t.kategori;
      if (catName === 'Bayar Utang' || catName === 'Debt Payment') {
        debtPayments += parseFloat(t.jumlah) || 0;
      }
    }
  }

  const effectiveIncome = income || 1;
  const ratio = Math.round((debtPayments / effectiveIncome) * 100);

  let status, text;
  if (ratio > 35) {
    status = 'danger';
    text = `High! Debt payments consume ${ratio}% of income. Limit new debt to improve cash flow.`;
  } else if (ratio > 20) {
    status = 'caution';
    text = `Moderate. Debt burden is ${ratio}%. Try to pay off existing debt before taking new loans.`;
  } else {
    status = 'safe';
    text = `Healthy. Debt burden is only ${ratio}%, well below the 35% safety threshold.`;
  }

  return { ratio, status, text };
}

/**
 * Calculate budget usage for a category.
 * 
 * @param {Array} transactions - legacy format
 * @param {string} categoryName - e.g. 'Makan & Jajan'
 * @param {number} limit
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {{ spent: number, limit: number, percentage: number, remaining: number, isOverBudget: boolean }}
 */
export function calculateBudgetUsage(transactions, categoryName, limit, year, month) {
  let spent = 0;

  for (const t of transactions) {
    const d = new Date(t.tanggal);
    if (d.getFullYear() === year && d.getMonth() === month && 
        t.kategori === categoryName && t.tipe === 'keluar') {
      spent += parseFloat(t.jumlah) || 0;
    }
  }

  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const remaining = limit - spent;

  return {
    spent,
    limit,
    percentage,
    remaining,
    isOverBudget: spent > limit
  };
}

/**
 * Calculate category spending for a given month.
 * 
 * @param {Array} transactions - legacy format
 * @param {string} categoryName
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {number}
 */
export function calculateCategorySpend(transactions, categoryName, year, month) {
  let total = 0;

  for (const t of transactions) {
    const d = new Date(t.tanggal);
    if (d.getFullYear() === year && d.getMonth() === month && 
        t.kategori === categoryName && t.tipe === 'keluar') {
      total += parseFloat(t.jumlah) || 0;
    }
  }

  return total;
}

/**
 * Calculate goal progress.
 * 
 * @param {object} goal - legacy format: { nama, target, terkumpul }
 * @returns {{ percentage: number, remaining: number, isComplete: boolean, name: string }}
 */
export function calculateGoalProgress(goal) {
  const target = parseFloat(goal.target) || 0;
  const current = parseFloat(goal.terkumpul || goal.current) || 0;
  
  if (target <= 0) {
    return { percentage: 0, remaining: 0, isComplete: false, name: goal.nama || goal.name || '' };
  }

  const percentage = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);

  return {
    percentage,
    remaining,
    isComplete: current >= target,
    name: goal.nama || goal.name || '',
    target,
    current
  };
}

/**
 * Calculate monthly savings needed to reach goal by target date.
 * 
 * @param {object} goal - { target, current/terkumpul, targetDate }
 * @param {Date} now
 * @returns {number} Monthly amount needed
 */
export function calculateMonthlyGoalTarget(goal, now = new Date()) {
  if (!goal.targetDate) return 0;

  const parts = goal.targetDate.split('-');
  if (parts.length !== 2) return 0;

  const targetYear = parseInt(parts[0], 10);
  const targetMonth = parseInt(parts[1], 10) - 1;
  const targetD = new Date(targetYear, targetMonth, 1);

  const monthsDiff = (targetD.getFullYear() - now.getFullYear()) * 12 + (targetD.getMonth() - now.getMonth());

  const current = parseFloat(goal.terkumpul || goal.current) || 0;
  const target = parseFloat(goal.target) || 0;
  const remaining = target - current;
  
  if (remaining <= 0) return 0;
  if (monthsDiff <= 0) return remaining;

  return Math.round(remaining / monthsDiff);
}

/**
 * Calculate total bill amounts.
 * 
 * @param {Array} bills - legacy format with 'jumlah', 'aktif'
 * @returns {{ total: number, paid: number, unpaid: number }}
 */
export function calculateBillSummary(bills) {
  let total = 0;
  let paid = 0;

  for (const b of bills) {
    if (b.aktif !== false) {
      const amount = parseFloat(b.jumlah || b.amount) || 0;
      total += amount;
      if (b.paidThisMonth) paid += amount;
    }
  }

  return { total, paid, unpaid: total - paid };
}

/**
 * Calculate spending breakdown by category for a month.
 * 
 * @param {Array} transactions - legacy format
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Array<{ category: string, amount: number }>}
 */
export function calculateSpendingByCategory(transactions, year, month) {
  const spending = {};

  for (const t of transactions) {
    const d = new Date(t.tanggal);
    if (d.getFullYear() === year && d.getMonth() === month && t.tipe === 'keluar') {
      const cat = t.kategori || 'Lainnya';
      spending[cat] = (spending[cat] || 0) + (parseFloat(t.jumlah) || 0);
    }
  }

  return Object.entries(spending)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate spending by family member for a month.
 * 
 * @param {Array} transactions - legacy format with 'pengeluar'
 * @param {Array} members - legacy format with 'nama'
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Array<{ memberId: string, name: string, amount: number }>}
 */
export function calculateSpendingByMember(transactions, members, year, month) {
  const spending = {};

  for (const t of transactions) {
    const d = new Date(t.tanggal);
    if (d.getFullYear() === year && d.getMonth() === month && t.tipe === 'keluar') {
      const memberId = t.pengeluar || 'unassigned';
      spending[memberId] = (spending[memberId] || 0) + (parseFloat(t.jumlah) || 0);
    }
  }

  return members.map(m => ({
    memberId: m.id,
    name: m.nama || m.name || 'Unknown',
    amount: spending[m.id] || 0
  }));
}

/**
 * Calculate 6-month cash flow history.
 * 
 * @param {Array} transactions - legacy format
 * @param {number} currentYear
 * @param {number} currentMonth - 0-indexed
 * @returns {Array<{ label: string, year: number, month: number, income: number, expense: number }>}
 */
export function calculateCashFlowHistory(transactions, currentYear, currentMonth) {
  const history = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth, 1);
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();

    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      const txDate = new Date(t.tanggal);
      if (txDate.getFullYear() === year && txDate.getMonth() === month) {
        if (t.tipe === 'masuk') income += parseFloat(t.jumlah) || 0;
        else if (t.tipe === 'keluar') expense += parseFloat(t.jumlah) || 0;
      }
    }

    history.push({
      label: monthNames[month],
      year,
      month,
      income,
      expense
    });
  }

  return history;
}

/**
 * Generate next best actions based on actual financial data.
 * 
 * @param {object} healthData - { savingsRate, emergencyFund, debtBurden, budgetOverruns }
 * @returns {Array<{ priority: 'high' | 'medium' | 'low', message: string, icon: string }>}
 */
export function generateNextBestActions(healthData) {
  const actions = [];

  if (healthData.emergencyFund && healthData.emergencyFund.months < 3) {
    actions.push({
      priority: 'high',
      message: 'Build your emergency fund — currently below 3 months of expenses',
      icon: 'shield-alert'
    });
  }

  if (healthData.savingsRate !== undefined && healthData.savingsRate < 10) {
    actions.push({
      priority: 'high',
      message: 'Increase your savings rate — currently below 10% of income',
      icon: 'piggy-bank'
    });
  }

  if (healthData.debtBurden && healthData.debtBurden.ratio > 35) {
    actions.push({
      priority: 'high',
      message: 'Reduce debt burden — payments exceed 35% of income',
      icon: 'credit-card'
    });
  }

  if (healthData.budgetOverruns && healthData.budgetOverruns.length > 0) {
    for (const overrun of healthData.budgetOverruns.slice(0, 2)) {
      actions.push({
        priority: 'medium',
        message: `Review ${overrun.categoryName} budget — over by ${overrun.overagePercent}%`,
        icon: 'alert-triangle'
      });
    }
  }

  if (healthData.savingsRate >= 20 && healthData.emergencyFund && healthData.emergencyFund.months >= 6) {
    actions.push({
      priority: 'low',
      message: 'Great financial health! Consider investing your surplus wisely',
      icon: 'trending-up'
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return actions.slice(0, 4); // Max 4 actions
}
