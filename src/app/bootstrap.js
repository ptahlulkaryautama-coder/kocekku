/**
 * Application Bootstrap
 * Initializes Kocekku 2.0 and loads data
 */

import { appState } from './state.js';
import { loadAllData, saveAllData, createBackup, clearAllData } from '../data/storage.js';
import { migrateData, detectVersion } from '../data/migration.js';

/**
 * Initialize the application
 * @returns {Promise<void>}
 */
export async function initializeApp() {
  console.log('[Kocekku] Initializing application...');
  
  try {
    // Initialize state preferences
    appState.initialize();
    
    // Load data from storage
    await loadData();
    
    // Mark loading as complete
    appState.set('isLoading', false);
    
    console.log('[Kocekku] Application initialized successfully');
  } catch (error) {
    console.error('[Kocekku] Initialization error:', error);
    appState.set('isLoading', false);
    
    appState.showToast({
      type: 'error',
      message: 'Error initializing application. Some features may not work correctly.'
    });
  }
}

/**
 * Load all data from storage
 * @returns {Promise<void>}
 */
async function loadData() {
  console.log('[Kocekku] Loading data from storage...');
  
  try {
    // Default data structure
    const defaults = {
      accounts: [],
      transactions: [],
      budgets: [],
      goals: [],
      bills: [],
      familyMembers: [],
      user: { name: '', avatar: '' }
    };
    
    // Load and migrate data using storage module
    const { data, isLegacy, migrationApplied } = loadAllData(defaults);
    
    // Update state with loaded data
    appState.update({
      accounts: data.accounts || defaults.accounts,
      transactions: data.transactions || defaults.transactions,
      budgets: data.envelopes || data.budgets || defaults.budgets,
      goals: data.goals || defaults.goals,
      bills: data.bills || defaults.bills,
      familyMembers: data.members || data.familyMembers || defaults.familyMembers,
      user: data.user || data.settings || defaults.user
    });
    
    if (migrationApplied) {
      console.log('[Kocekku] Data migration applied from v1 to v2');
    }
    
    console.log('[Kocekku] Data loaded:', {
      accounts: appState.get('accounts').length,
      transactions: appState.get('transactions').length,
      budgets: appState.get('budgets').length,
      goals: appState.get('goals').length,
      bills: appState.get('bills').length,
      familyMembers: appState.get('familyMembers').length
    });
  } catch (error) {
    console.error('[Kocekku] Error loading data:', error);
    throw error;
  }
}

/**
 * Reload data from storage (after imports, etc.)
 * @returns {Promise<void>}
 */
export async function reloadData() {
  appState.set('isLoading', true);
  await loadData();
  appState.set('isLoading', false);
}

/**
 * Save all data to storage
 * @returns {boolean}
 */
export function saveData() {
  try {
    const data = {
      accounts: appState.get('accounts'),
      transactions: appState.get('transactions'),
      budgets: appState.get('budgets'),
      goals: appState.get('goals'),
      bills: appState.get('bills'),
      familyMembers: appState.get('familyMembers'),
      user: appState.get('user')
    };
    
    return saveAllData(data);
  } catch (error) {
    console.error('[Kocekku] Error saving data:', error);
    return false;
  }
}

/**
 * Export data for backup
 * @returns {Object}
 */
export function exportData() {
  return {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    data: {
      accounts: appState.get('accounts'),
      transactions: appState.get('transactions'),
      budgets: appState.get('budgets'),
      goals: appState.get('goals'),
      bills: appState.get('bills'),
      familyMembers: appState.get('familyMembers'),
      user: appState.get('user')
    }
  };
}

/**
 * Import data from backup
 * @param {Object} importData
 * @returns {Object} - { success: boolean, message: string }
 */
export function importData(importData) {
  try {
    // Validate structure
    if (!importData || !importData.data) {
      return { success: false, message: 'Invalid backup file format' };
    }
    
    const data = importData.data;
    
    // Apply migration
    const migratedData = migrateData(data);
    
    // Update state
    appState.update({
      accounts: migratedData.accounts || [],
      transactions: migratedData.transactions || [],
      budgets: migratedData.budgets || [],
      goals: migratedData.goals || [],
      bills: migratedData.bills || [],
      familyMembers: migratedData.familyMembers || [],
      user: migratedData.user || { name: '', avatar: '' }
    });
    
    // Save to storage
    const saved = saveData();
    
    if (saved) {
      return { success: true, message: 'Data imported successfully' };
    } else {
      return { success: false, message: 'Failed to save imported data' };
    }
  } catch (error) {
    console.error('[Kocekku] Import error:', error);
    return { success: false, message: 'Error importing data: ' + error.message };
  }
}

/**
 * Reset to demo data
 * @returns {boolean}
 */
export function resetToDemoData() {
  try {
    clearAllData();
    return true;
  } catch (error) {
    console.error('[Kocekku] Error resetting data:', error);
    return false;
  }
}

/**
 * Delete all user data
 * @returns {boolean}
 */
export function deleteAllData() {
  try {
    clearAllData();
    appState.update({
      accounts: [],
      transactions: [],
      budgets: [],
      goals: [],
      bills: [],
      familyMembers: [],
      user: { name: '', avatar: '' }
    });
    return true;
  } catch (error) {
    console.error('[Kocekku] Error deleting data:', error);
    return false;
  }
}
