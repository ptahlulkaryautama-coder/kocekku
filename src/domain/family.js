/**
 * Family Domain Logic
 * Pure functions for family member calculations - no DOM dependencies
 */

/**
 * Calculate spending by family member for a period
 * @param {Array} transactions
 * @param {Array} members
 * @param {number} year
 * @param {number} month - 0-indexed
 * @returns {Array}
 */
export function calculateFamilySpending(transactions, members, year, month) {
  const memberSpending = {};
  
  // Initialize spending for all members
  members.forEach(m => {
    memberSpending[m.id] = {
      memberId: m.id,
      name: m.nama,
      totalSpent: 0,
      categories: {}
    };
  });
  
  // Also track "Unassigned" spending
  memberSpending['unassigned'] = {
    memberId: 'unassigned',
    name: 'Unassigned',
    totalSpent: 0,
    categories: {}
  };
  
  // Sum up expenses by member
  transactions
    .filter(t => {
      const d = new Date(t.tanggal);
      return t.tipe === 'keluar' && d.getFullYear() === year && d.getMonth() === month;
    })
    .forEach(t => {
      const memberId = t.pengeluar || 'unassigned';
      
      // Ensure member exists in our tracking
      if (!memberSpending[memberId]) {
        memberSpending[memberId] = {
          memberId,
          name: memberId,
          totalSpent: 0,
          categories: {}
        };
      }
      
      const amount = parseFloat(t.jumlah) || 0;
      memberSpending[memberId].totalSpent += amount;
      
      const cat = t.kategori || 'Other';
      memberSpending[memberId].categories[cat] = 
        (memberSpending[memberId].categories[cat] || 0) + amount;
    });
  
  // Convert to array and sort by spending
  return Object.values(memberSpending)
    .filter(m => m.totalSpent > 0 || members.some(mem => mem.id === m.memberId))
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

/**
 * Calculate family spending summary
 * @param {Array} familySpending - from calculateFamilySpending
 * @returns {Object}
 */
export function getFamilySpendingSummary(familySpending) {
  const totalFamilySpending = familySpending.reduce(
    (sum, m) => sum + m.totalSpent, 0
  );
  
  const activeSpenders = familySpending.filter(m => m.totalSpent > 0);
  const topSpender = activeSpenders.length > 0 ? activeSpenders[0] : null;
  
  return {
    totalFamilySpending,
    activeSpenderCount: activeSpenders.length,
    topSpender: topSpender ? {
      name: topSpender.name,
      amount: topSpender.totalSpent,
      percentage: totalFamilySpending > 0 
        ? Math.round((topSpender.totalSpent / totalFamilySpending) * 100) 
        : 0
    } : null
  };
}

/**
 * Create a new family member object
 * @param {Object} data
 * @returns {Object}
 */
export function createFamilyMember(data) {
  return {
    id: data.id || `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    nama: data.nama || '',
    hubungan: data.hubungan || '',
    avatar: data.avatar || '',
    color: data.color || '#6B7280',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

/**
 * Validate family member data
 * @param {Object} member
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function validateFamilyMember(member) {
  const errors = [];
  
  if (!member.nama || member.nama.trim() === '') {
    errors.push('Name is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Relationship type mapping (legacy Indonesian to English)
 */
export const RELATIONSHIP_MAP = {
  'ayah': 'Father',
  'ibu': 'Mother',
  'anak': 'Child',
  'suami': 'Husband',
  'istri': 'Wife',
  'saudara': 'Sibling',
  'lainnya': 'Other'
};

/**
 * Normalize relationship type from legacy format
 * @param {string} legacyType
 * @returns {string}
 */
export function normalizeRelationship(legacyType) {
  const lower = (legacyType || '').toLowerCase().trim();
  return RELATIONSHIP_MAP[lower] || legacyType || 'Other';
}
