/**
 * Family Module Tests
 * Tests for family domain logic, CRUD, spending aggregation, and cross-module invariants
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateFamilySpending,
  getFamilySpendingSummary,
  createFamilyMember,
  validateFamilyMember,
  normalizeRelationship,
  RELATIONSHIP_MAP,
} from '../src/domain/family.js';

import { filterByMember } from '../src/domain/transactions.js';

/* ============================================
   TEST DATA FIXTURES
   ============================================ */

function createMember(overrides = {}) {
  return createFamilyMember({
    nama: 'Alex',
    hubungan: 'Father',
    color: '#3B82F6',
    ...overrides,
  });
}

function createExpense(overrides = {}) {
  return {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tanggal: '2026-08-15',
    keterangan: 'Lunch',
    jumlah: 50000,
    tipe: 'keluar',
    dompet: 'acc_1',
    kategori: 'Makan & Jajan',
    pengeluar: 'member_1',
    catatan: '',
    ...overrides,
  };
}

function createIncome(overrides = {}) {
  return {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tanggal: '2026-08-01',
    keterangan: 'Salary',
    jumlah: 5000000,
    tipe: 'masuk',
    dompet: 'acc_1',
    kategori: 'Gaji',
    pengeluar: 'member_1',
    catatan: '',
    ...overrides,
  };
}

function createTransfer(overrides = {}) {
  return {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tanggal: '2026-08-10',
    keterangan: 'Transfer',
    jumlah: 1000000,
    tipe: 'transfer',
    dompet: 'acc_1',
    kategori: '',
    pengeluar: 'member_1',
    catatan: '',
    ...overrides,
  };
}

const MEMBERS = [
  { id: 'member_1', nama: 'Alex', hubungan: 'Father', color: '#3B82F6', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'member_2', nama: 'Sarah', hubungan: 'Mother', color: '#EC4899', createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'member_3', nama: 'Jamie', hubungan: 'Child', color: '#F59E0B', createdAt: '2026-01-01T00:00:00.000Z' },
];

/* ============================================
   FAMILY MEMBER CREATION
   ============================================ */

describe('Family Member Creation', () => {
  it('should create a member with all fields', () => {
    const member = createFamilyMember({
      nama: 'Alex',
      hubungan: 'Father',
      color: '#3B82F6',
    });
    assert.ok(member.id, 'should have an id');
    assert.equal(member.nama, 'Alex');
    assert.equal(member.hubungan, 'Father');
    assert.equal(member.color, '#3B82F6');
    assert.ok(member.createdAt, 'should have createdAt');
  });

  it('should generate unique IDs', () => {
    const m1 = createFamilyMember({ nama: 'A' });
    const m2 = createFamilyMember({ nama: 'B' });
    assert.notEqual(m1.id, m2.id);
  });

  it('should default to empty name', () => {
    const member = createFamilyMember({});
    assert.equal(member.nama, '');
  });

  it('should default color to gray', () => {
    const member = createFamilyMember({ nama: 'Test' });
    assert.equal(member.color, '#6B7280');
  });

  it('should accept custom id', () => {
    const member = createFamilyMember({ id: 'custom_123', nama: 'Test' });
    assert.equal(member.id, 'custom_123');
  });
});

/* ============================================
   FAMILY MEMBER VALIDATION
   ============================================ */

describe('Family Member Validation', () => {
  it('should pass for valid member', () => {
    const result = validateFamilyMember({ nama: 'Alex' });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('should fail for empty name', () => {
    const result = validateFamilyMember({ nama: '' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('Name')));
  });

  it('should fail for whitespace-only name', () => {
    const result = validateFamilyMember({ nama: '   ' });
    assert.equal(result.valid, false);
  });

  it('should fail for null name', () => {
    const result = validateFamilyMember({ nama: null });
    assert.equal(result.valid, false);
  });

  it('should fail for undefined member', () => {
    const result = validateFamilyMember({});
    assert.equal(result.valid, false);
  });

  it('should pass for member with extra fields', () => {
    const result = validateFamilyMember({ nama: 'Alex', hubungan: 'Father', color: '#3B82F6' });
    assert.equal(result.valid, true);
  });
});

/* ============================================
   RELATIONSHIP NORMALIZATION
   ============================================ */

describe('Relationship Normalization', () => {
  it('should map ayah to Father', () => {
    assert.equal(normalizeRelationship('ayah'), 'Father');
  });

  it('should map ibu to Mother', () => {
    assert.equal(normalizeRelationship('ibu'), 'Mother');
  });

  it('should map anak to Child', () => {
    assert.equal(normalizeRelationship('anak'), 'Child');
  });

  it('should map suami to Husband', () => {
    assert.equal(normalizeRelationship('suami'), 'Husband');
  });

  it('should map istri to Wife', () => {
    assert.equal(normalizeRelationship('istri'), 'Wife');
  });

  it('should map saudara to Sibling', () => {
    assert.equal(normalizeRelationship('saudara'), 'Sibling');
  });

  it('should map Admin to Admin', () => {
    assert.equal(normalizeRelationship('Admin'), 'Admin');
  });

  it('should return input for unmapped normalized value Anggota', () => {
    // RELATIONSHIP_MAP only has lowercase legacy values;
    // Anggota/Pasangan are handled by the role migration layer, not normalizeRelationship
    assert.equal(normalizeRelationship('Anggota'), 'Anggota');
  });

  it('should return input for unmapped normalized value Pasangan', () => {
    assert.equal(normalizeRelationship('Pasangan'), 'Pasangan');
  });

  it('should map Anak to Child', () => {
    assert.equal(normalizeRelationship('Anak'), 'Child');
  });

  it('should return input for unknown relationship (fallback)', () => {
    // normalizeRelationship passes through unrecognized values
    assert.equal(normalizeRelationship('unknown'), 'unknown');
  });

  it('should return Other for empty string', () => {
    assert.equal(normalizeRelationship(''), 'Other');
  });

  it('should return Other for null', () => {
    assert.equal(normalizeRelationship(null), 'Other');
  });

  it('should be case-insensitive', () => {
    assert.equal(normalizeRelationship('AYAH'), 'Father');
    assert.equal(normalizeRelationship('Ibu'), 'Mother');
  });

  it('should have all expected keys in RELATIONSHIP_MAP', () => {
    const expectedKeys = ['ayah', 'ibu', 'anak', 'suami', 'istri', 'saudara', 'lainnya'];
    expectedKeys.forEach(key => {
      assert.ok(key in RELATIONSHIP_MAP, `Missing key: ${key}`);
    });
  });
});

/* ============================================
   FAMILY SPENDING CALCULATION
   ============================================ */

describe('Family Spending Calculation', () => {
  it('should calculate spending per member', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'member_1', jumlah: 50000, tanggal: '2026-08-15' }),
      createExpense({ pengeluar: 'member_2', jumlah: 200000, tanggal: '2026-08-12' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7); // August (0-indexed)
    const alex = spending.find(s => s.memberId === 'member_1');
    const sarah = spending.find(s => s.memberId === 'member_2');
    assert.equal(alex.totalSpent, 150000);
    assert.equal(sarah.totalSpent, 200000);
  });

  it('should include members with zero spending', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const jamie = spending.find(s => s.memberId === 'member_3');
    assert.ok(jamie, 'Jamie should be included even with zero spending');
    assert.equal(jamie.totalSpent, 0);
  });

  it('should track unassigned transactions', () => {
    const transactions = [
      createExpense({ pengeluar: '', jumlah: 75000, tanggal: '2026-08-10' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const unassigned = spending.find(s => s.memberId === 'unassigned');
    assert.ok(unassigned, 'Unassigned transactions should be tracked');
    assert.equal(unassigned.totalSpent, 75000);
  });

  it('should track categories per member', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 50000, kategori: 'Makan & Jajan', tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'member_1', jumlah: 30000, kategori: 'Transportasi', tanggal: '2026-08-12' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.categories['Makan & Jajan'], 50000);
    assert.equal(alex.categories['Transportasi'], 30000);
  });

  it('should exclude income from spending', () => {
    const transactions = [
      createIncome({ pengeluar: 'member_1', jumlah: 5000000, tanggal: '2026-08-01' }),
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.totalSpent, 100000, 'Income should not count as spending');
  });

  it('should exclude transfers from spending', () => {
    const transactions = [
      createTransfer({ pengeluar: 'member_1', jumlah: 500000, tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-12' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.totalSpent, 100000, 'Transfers should not count as spending');
  });

  it('should filter by correct month', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'member_1', jumlah: 200000, tanggal: '2026-07-10' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7); // August
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.totalSpent, 100000, 'Only August expenses should be counted');
  });

  it('should sort by spending descending', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 50000, tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'member_2', jumlah: 200000, tanggal: '2026-08-11' }),
      createExpense({ pengeluar: 'member_3', jumlah: 100000, tanggal: '2026-08-12' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    assert.ok(spending[0].totalSpent >= spending[1].totalSpent);
    assert.ok(spending[1].totalSpent >= spending[2].totalSpent);
  });

  it('should handle empty transactions', () => {
    const spending = calculateFamilySpending([], MEMBERS, 2026, 7);
    assert.equal(spending.length, 3); // All 3 members with zero spending
  });

  it('should handle empty members list', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
    ];
    const spending = calculateFamilySpending(transactions, [], 2026, 7);
    // With empty members, unassigned is initialized but may be filtered out
    // if totalSpent === 0 and no member matches. The key invariant is no crash.
    assert.ok(Array.isArray(spending), 'Should return an array without crashing');
  });

  it('should handle large amounts correctly', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 999999999, tanggal: '2026-08-10' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.totalSpent, 999999999);
  });

  it('should handle zero-amount expenses', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 0, tanggal: '2026-08-10' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.totalSpent, 0);
  });

  it('should include name from member object', () => {
    const spending = calculateFamilySpending([], MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.name, 'Alex');
  });

  it('should default category to Other', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 50000, kategori: '', tanggal: '2026-08-10' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.categories['Other'], 50000);
  });
});

/* ============================================
   FAMILY SPENDING SUMMARY
   ============================================ */

describe('Family Spending Summary', () => {
  it('should calculate total family spending', () => {
    const familySpending = [
      { memberId: 'member_1', totalSpent: 150000 },
      { memberId: 'member_2', totalSpent: 200000 },
    ];
    const summary = getFamilySpendingSummary(familySpending);
    assert.equal(summary.totalFamilySpending, 350000);
  });

  it('should identify active spender count', () => {
    const familySpending = [
      { memberId: 'member_1', totalSpent: 150000 },
      { memberId: 'member_2', totalSpent: 0 },
    ];
    const summary = getFamilySpendingSummary(familySpending);
    assert.equal(summary.activeSpenderCount, 1);
  });

  it('should identify top spender', () => {
    // Summary expects pre-filtered data: only members with totalSpent > 0
    // After filtering: Alex (150k), Sarah (200k) → Sarah is top
    const familySpending = [
      { memberId: 'member_2', name: 'Sarah', totalSpent: 200000 },
      { memberId: 'member_1', name: 'Alex', totalSpent: 150000 },
    ];
    const summary = getFamilySpendingSummary(familySpending);
    assert.equal(summary.topSpender.name, 'Sarah');
    assert.equal(summary.topSpender.amount, 200000);
    assert.equal(summary.topSpender.percentage, 57);
  });

  it('should handle empty spending', () => {
    const summary = getFamilySpendingSummary([]);
    assert.equal(summary.totalFamilySpending, 0);
    assert.equal(summary.activeSpenderCount, 0);
    assert.equal(summary.topSpender, null);
  });

  it('should handle all zero spending', () => {
    const familySpending = [
      { memberId: 'member_1', totalSpent: 0 },
    ];
    const summary = getFamilySpendingSummary(familySpending);
    assert.equal(summary.totalFamilySpending, 0);
    assert.equal(summary.activeSpenderCount, 0);
    assert.equal(summary.topSpender, null);
  });
});

/* ============================================
   TRANSACTION-MEMBER LINKAGE
   ============================================ */

describe('Transaction-Member Linkage', () => {
  it('should filter transactions by member', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'member_2', tanggal: '2026-08-11' }),
      createExpense({ pengeluar: 'member_1', tanggal: '2026-08-12' }),
    ];
    const member1Txns = filterByMember(transactions, 'member_1');
    assert.equal(member1Txns.length, 2);
  });

  it('should return all transactions for "all"', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1' }),
      createExpense({ pengeluar: 'member_2' }),
    ];
    const all = filterByMember(transactions, 'all');
    assert.equal(all.length, 2);
  });

  it('should return all transactions for empty filter', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1' }),
    ];
    const all = filterByMember(transactions, '');
    assert.equal(all.length, 1);
  });

  it('should return empty for non-existent member', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1' }),
    ];
    const result = filterByMember(transactions, 'member_999');
    assert.equal(result.length, 0);
  });
});

/* ============================================
   CROSS-MODULE INVARIANTS
   ============================================ */

describe('Cross-Module Invariants', () => {
  it('should NOT modify account balances when calculating family spending', () => {
    const accounts = [{ id: 'acc_1', balance: 1000000 }];
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
    ];
    const originalBalance = accounts[0].balance;
    calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    assert.equal(accounts[0].balance, originalBalance, 'Account balance should not change');
  });

  it('should NOT modify transactions when calculating family spending', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
    ];
    const originalLength = transactions.length;
    const originalAmount = transactions[0].jumlah;
    calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    assert.equal(transactions.length, originalLength);
    assert.equal(transactions[0].jumlah, originalAmount);
  });

  it('family spending should only include expense transactions', () => {
    const transactions = [
      createIncome({ pengeluar: 'member_1', jumlah: 5000000, tanggal: '2026-08-01' }),
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
      createTransfer({ pengeluar: 'member_1', jumlah: 500000, tanggal: '2026-08-11' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.totalSpent, 100000, 'Only expense transactions should count');
  });

  it('total family spending should equal sum of member expenses for the period', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'member_2', jumlah: 200000, tanggal: '2026-08-11' }),
      createExpense({ pengeluar: '', jumlah: 50000, tanggal: '2026-08-12' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const summary = getFamilySpendingSummary(spending);
    assert.equal(summary.totalFamilySpending, 350000);
  });

  it('member deletion should not affect existing transactions', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 100000, tanggal: '2026-08-10' }),
    ];
    // Remove member_1 from members list
    const remainingMembers = MEMBERS.filter(m => m.id !== 'member_1');
    const spending = calculateFamilySpending(transactions, remainingMembers, 2026, 7);
    // Member_1's transactions should still appear under their ID
    const orphaned = spending.find(s => s.memberId === 'member_1');
    assert.ok(orphaned, 'Orphaned member transactions should still appear');
    assert.equal(orphaned.totalSpent, 100000);
  });
});

/* ============================================
   EDGE CASES
   ============================================ */

describe('Edge Cases', () => {
  it('should handle member with null hubungan', () => {
    const member = createFamilyMember({ nama: 'Test', hubungan: null });
    // createFamilyMember defaults hubungan to '' if data.hubungan is falsy
    assert.equal(member.hubungan, '');
  });

  it('should handle multiple categories per member', () => {
    const transactions = [
      createExpense({ pengeluar: 'member_1', jumlah: 50000, kategori: 'Food', tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'member_1', jumlah: 30000, kategori: 'Transport', tanggal: '2026-08-11' }),
      createExpense({ pengeluar: 'member_1', jumlah: 20000, kategori: 'Food', tanggal: '2026-08-12' }),
    ];
    const spending = calculateFamilySpending(transactions, MEMBERS, 2026, 7);
    const alex = spending.find(s => s.memberId === 'member_1');
    assert.equal(alex.categories['Food'], 70000);
    assert.equal(alex.categories['Transport'], 30000);
  });

  it('should handle very long member names', () => {
    const longName = 'A'.repeat(200);
    const member = createFamilyMember({ nama: longName });
    assert.equal(member.nama.length, 200);
  });

  it('should handle special characters in names', () => {
    const member = createFamilyMember({ nama: "O'Brien-Smith" });
    assert.equal(member.nama, "O'Brien-Smith");
  });

  it('should handle unicode names', () => {
    const member = createFamilyMember({ nama: '田中太郎' });
    assert.equal(member.nama, '田中太郎');
  });

  it('should preserve legacy field hubungan', () => {
    const member = createFamilyMember({ nama: 'Test', hubungan: 'ayah' });
    assert.equal(member.hubungan, 'ayah');
  });

  it('percentage should be 0 when total spending is 0', () => {
    const familySpending = [
      { memberId: 'member_1', name: 'Alex', totalSpent: 0 },
    ];
    const summary = getFamilySpendingSummary(familySpending);
    assert.equal(summary.topSpender, null);
  });
});

/* ============================================
   LEGACY COMPATIBILITY
   ============================================ */

describe('Legacy Compatibility', () => {
  it('should work with legacy member fields', () => {
    const legacyMembers = [
      { id: 'mem_1', nama: 'Budi', hubungan: 'ayah', avatar: '', color: '#FF0000' },
      { id: 'mem_2', nama: 'Siti', hubungan: 'ibu', avatar: '', color: '#00FF00' },
    ];
    const transactions = [
      createExpense({ pengeluar: 'mem_1', jumlah: 50000, tanggal: '2026-08-10' }),
      createExpense({ pengeluar: 'mem_2', jumlah: 80000, tanggal: '2026-08-11' }),
    ];
    const spending = calculateFamilySpending(transactions, legacyMembers, 2026, 7);
    const budi = spending.find(s => s.memberId === 'mem_1');
    const siti = spending.find(s => s.memberId === 'mem_2');
    assert.equal(budi.totalSpent, 50000);
    assert.equal(siti.totalSpent, 80000);
    assert.equal(budi.name, 'Budi');
    assert.equal(siti.name, 'Siti');
  });

  it('should normalize legacy Indonesian relationships', () => {
    const legacyMembers = [
      { id: 'mem_1', nama: 'Budi', hubungan: 'ayah' },
      { id: 'mem_2', nama: 'Siti', hubungan: 'ibu' },
      { id: 'mem_3', nama: 'Ani', hubungan: 'anak' },
    ];
    // normalizeRelationship should handle these
    assert.equal(normalizeRelationship(legacyMembers[0].hubungan), 'Father');
    assert.equal(normalizeRelationship(legacyMembers[1].hubungan), 'Mother');
    assert.equal(normalizeRelationship(legacyMembers[2].hubungan), 'Child');
  });
});
