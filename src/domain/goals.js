/**
 * Savings Goals Domain Logic
 * Pure functions for goal calculations - no DOM dependencies
 */

/**
 * Calculate goal progress
 * @param {Object} goal - { nama, target, terkumpul, targetDate }
 * @returns {Object}
 */
export function calculateGoalProgress(goal) {
  if (!goal) return { name: '', target: 0, current: 0, remaining: 0, percentage: 0, isComplete: false, status: 'in-progress' };
  const target = parseFloat(goal.target) || 0;
  const current = parseFloat(goal.terkumpul) || 0;
  const remaining = Math.max(target - current, 0);
  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;
  const isComplete = current >= target && target > 0;
  
  return {
    name: goal.nama,
    target,
    current,
    remaining,
    percentage: Math.max(0, Math.min(percentage, 100)),
    isComplete,
    status: isComplete ? 'complete' : percentage >= 75 ? 'near-complete' : percentage >= 50 ? 'on-track' : 'in-progress'
  };
}

/**
 * Calculate all goals progress
 * @param {Array} goals
 * @returns {Array}
 */
export function calculateAllGoalsProgress(goals) {
  return goals.map(goal => calculateGoalProgress(goal));
}

/**
 * Get goals summary
 * @param {Array} goalProgress - from calculateAllGoalsProgress
 * @returns {Object}
 */
export function getGoalsSummary(goalProgress) {
  const totalTarget = goalProgress.reduce((sum, g) => sum + g.target, 0);
  const totalCurrent = goalProgress.reduce((sum, g) => sum + g.current, 0);
  const totalRemaining = goalProgress.reduce((sum, g) => sum + g.remaining, 0);
  const completedCount = goalProgress.filter(g => g.isComplete).length;
  
  return {
    totalTarget,
    totalCurrent,
    totalRemaining,
    completedCount,
    totalCount: goalProgress.length,
    overallPercentage: totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0
  };
}

/**
 * Calculate projected completion date based on saving rate
 * @param {Object} goal
 * @param {Array} transactions - recent transactions for this goal
 * @param {number} monthsBack - how many months to look back for rate
 * @returns {Date|null}
 */
export function projectCompletionDate(goal, transactions, monthsBack = 3) {
  const target = parseFloat(goal.target) || 0;
  const current = parseFloat(goal.terkumpul) || 0;
  const remaining = target - current;
  
  if (remaining <= 0) return new Date(); // Already complete
  
  // Calculate average monthly contribution
  const now = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  
  const relevantTransactions = transactions.filter(t => {
    const d = new Date(t.tanggal);
    return d >= startDate && 
           t.tipe === 'transfer' && 
           t.kategori === goal.nama;
  });
  
  const totalContributed = relevantTransactions.reduce(
    (sum, t) => sum + (parseFloat(t.jumlah) || 0), 0
  );
  
  const avgMonthlyRate = totalContributed / monthsBack;
  
  if (avgMonthlyRate <= 0) return null; // Can't project without data
  
  const monthsNeeded = remaining / avgMonthlyRate;
  const projectedDate = new Date();
  projectedDate.setMonth(projectedDate.getMonth() + Math.ceil(monthsNeeded));
  
  return projectedDate;
}

/**
 * Create a new goal object
 * @param {Object} data
 * @returns {Object}
 */
export function createGoal(data) {
  return {
    id: data.id || `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nama: data.nama || '',
    target: parseFloat(data.target) || 0,
    terkumpul: parseFloat(data.terkumpul) || 0,
    targetDate: data.targetDate || null,
    icon: data.icon || 'target',
    catatan: data.catatan || '',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * Validate goal data
 * @param {Object} goal
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateGoal(goal) {
  const errors = [];
  
  if (!goal.nama || goal.nama.trim() === '') {
    errors.push('Goal name is required');
  }
  
  if (!goal.target || parseFloat(goal.target) <= 0) {
    errors.push('Target amount must be greater than 0');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
