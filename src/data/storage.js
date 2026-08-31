/**
 * Kocekku 2.0 — Storage Architecture
 * 
 * Manages localStorage persistence with schema versioning.
 * Backward compatible with legacy "kocekku_" prefixed data.
 * Never silently drops or transforms user data.
 */

import { SCHEMA_VERSION } from './schema.js';
import { detectVersion, migrateData } from './migration.js';
import { readLegacyData, LEGACY_KEYS, hasLegacyData } from './legacy-adapter.js';

const LEGACY_PREFIX = 'kocekku_';
const V2_PREFIX = 'kocekku2:';

// Keys stored in localStorage
const KEYS = {
  SCHEMA_VERSION: 'schema_version',
  THEME: 'kocekku_theme',
  SELECTED_MONTH: 'selected_month',
  SELECTED_YEAR: 'selected_year',
  MEMBERS: 'members',
  CATEGORIES: 'categories',
  ACCOUNTS: 'accounts',
  TRANSACTIONS: 'transactions',
  GOALS: 'goals',
  ENVELOPES: 'envelopes',
  BILLS: 'bills',
  SETTINGS: 'settings',
  USER: 'kocekku_user'
};

/**
 * Read a value from localStorage.
 * Tries v2 prefix first, then kocekku_ prefix (original), then kocekku2: prefix.
 */
function readKey(key) {
  // Try v2 key first
  let raw = localStorage.getItem(V2_PREFIX + key);
  if (raw !== null) return raw;

  // Try kocekku_ prefix (original Kocekku format)
  if (key === 'accounts') raw = localStorage.getItem('kocekku_dompet');
  else if (key === 'transactions') raw = localStorage.getItem('kocekku_transaksi');
  else if (key === 'envelopes') raw = localStorage.getItem('kocekku_anggaran');
  else if (key === 'goals') raw = localStorage.getItem('kocekku_tabungan');
  else if (key === 'bills') raw = localStorage.getItem('kocekku_tagihan');
  else if (key === 'members') raw = localStorage.getItem('kocekku_keluarga');
  else if (key === 'kocekku_user' || key === 'user') raw = localStorage.getItem('kocekku_user');
  else if (key === 'kocekku_theme' || key === 'theme') raw = localStorage.getItem('kocekku_theme');
  else raw = localStorage.getItem(LEGACY_PREFIX + key);

  if (raw !== null) return raw;

  // Fall back to old rumah-ringkas key for very old data
  raw = localStorage.getItem('rumah-ringkas:' + key);
  return raw;
}

/**
 * Write a value to localStorage (writes to v2 prefix)
 */
function writeKey(key, value) {
  localStorage.setItem(V2_PREFIX + key, value);
}

/**
 * Parse JSON safely
 */
function safeParse(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('[Storage] Failed to parse JSON:', e);
    return null;
  }
}

/**
 * Load all application data from localStorage.
 * Handles migration from v1 (legacy) to current schema version.
 * 
 * @param {object} defaults - Default data to use if nothing is stored
 * @returns {object} { data, isLegacy, migrationApplied }
 */
export function loadAllData(defaults) {
  let migrationApplied = false;
  let isLegacy = false;

  // Check if we have v2 data
  const v2VersionRaw = localStorage.getItem(V2_PREFIX + KEYS.SCHEMA_VERSION);
  let schemaVersion = v2VersionRaw ? parseInt(v2VersionRaw, 10) : null;

  // Check for legacy Kocekku data
  const hasKocekkuData = hasLegacyData();
  const hasV2Data = Object.values(KEYS).some(key => 
    localStorage.getItem(V2_PREFIX + key) !== null
  );

  if (schemaVersion === null && !hasV2Data && hasKocekkuData) {
    // Legacy Kocekku data exists — read it using legacy adapter
    console.log('[Storage] Found legacy Kocekku data, reading via legacy adapter...');
    const legacy = readLegacyData();
    
    // Map legacy fields to v2 format
    schemaVersion = 1;
    isLegacy = true;
    
    // Create v2-compatible data from legacy
    const rawData = {
      members: legacy.familyMembers || defaults.members || [],
      categories: defaults.categories || [],
      accounts: legacy.accounts || defaults.accounts || [],
      transactions: legacy.transactions || defaults.transactions || [],
      goals: legacy.goals || defaults.goals || [],
      envelopes: legacy.budgets || defaults.envelopes || [],
      bills: legacy.bills || defaults.bills || [],
      settings: legacy.user?.settings || defaults.settings || { currency: 'IDR', locale: 'id-ID', language: 'id' }
    };

    console.log('[Storage] Legacy data loaded:', {
      accounts: rawData.accounts.length,
      transactions: rawData.transactions.length,
      bills: rawData.bills.length,
      members: rawData.members.length
    });

    // Migrate if needed
    let data = rawData;
    if (schemaVersion < SCHEMA_VERSION) {
      console.log(`[Storage] Migrating from v${schemaVersion} to v${SCHEMA_VERSION}`);
      try {
        data._schemaVersion = schemaVersion;
        data = migrateData(data, schemaVersion);
        migrationApplied = true;
      } catch (e) {
        console.error('[Storage] Migration failed, using raw data:', e);
        data = rawData;
        migrationApplied = false;
      }
    }

    // Ensure schema version is set
    data._schemaVersion = SCHEMA_VERSION;

    // Save migrated data to v2 keys
    saveAllData(data);
    console.log('[Storage] Migrated legacy data saved to v2 keys');

    return { data, isLegacy, migrationApplied };
  }

  if (schemaVersion === null) {
    // Truly new user — use defaults
    schemaVersion = SCHEMA_VERSION;
  }

  // Load raw data from v2 keys
  const rawData = {
    members: safeParse(readKey(KEYS.MEMBERS)) || defaults.members,
    categories: safeParse(readKey(KEYS.CATEGORIES)) || defaults.categories,
    accounts: safeParse(readKey(KEYS.ACCOUNTS)) || defaults.accounts,
    transactions: safeParse(readKey(KEYS.TRANSACTIONS)) || defaults.transactions,
    goals: safeParse(readKey(KEYS.GOALS)) || defaults.goals,
    envelopes: safeParse(readKey(KEYS.ENVELOPES)) || defaults.envelopes,
    bills: safeParse(readKey(KEYS.BILLS)) || defaults.bills,
    settings: safeParse(readKey(KEYS.SETTINGS)) || defaults.settings
  };

  // Migrate if needed
  let data = rawData;
  if (schemaVersion < SCHEMA_VERSION) {
    console.log(`[Storage] Migrating from v${schemaVersion} to v${SCHEMA_VERSION}`);
    try {
      data._schemaVersion = schemaVersion;
      data = migrateData(data, schemaVersion);
      migrationApplied = true;
    } catch (e) {
      console.error('[Storage] Migration failed, using raw data:', e);
      data = rawData;
      migrationApplied = false;
    }
  }

  // Ensure schema version is set
  data._schemaVersion = SCHEMA_VERSION;

  // Save migrated data back
  if (migrationApplied || isLegacy) {
    saveAllData(data);
    console.log('[Storage] Migrated data saved to v2 keys');
  }

  return { data, isLegacy, migrationApplied };
}

/**
 * Save all application data to localStorage.
 */
export function saveAllData(data) {
  writeKey(KEYS.SCHEMA_VERSION, JSON.stringify(SCHEMA_VERSION));
  writeKey(KEYS.MEMBERS, JSON.stringify(data.members));
  writeKey(KEYS.CATEGORIES, JSON.stringify(data.categories));
  writeKey(KEYS.ACCOUNTS, JSON.stringify(data.accounts));
  writeKey(KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
  writeKey(KEYS.GOALS, JSON.stringify(data.goals));
  writeKey(KEYS.ENVELOPES, JSON.stringify(data.envelopes));
  writeKey(KEYS.BILLS, JSON.stringify(data.bills));
  if (data.settings) {
    writeKey(KEYS.SETTINGS, JSON.stringify(data.settings));
  }
}

/**
 * Save a specific data collection.
 */
export function saveCollection(key, data) {
  writeKey(key, JSON.stringify(data));
}

/**
 * Load a preference (theme, month, year).
 */
export function loadPreference(key, fallback) {
  const raw = readKey(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // Handle non-JSON strings like theme name
  }
}

/**
 * Save a preference.
 */
export function savePreference(key, value) {
  writeKey(key, typeof value === 'string' ? value : JSON.stringify(value));
}

/**
 * Clear ONLY v2 data (for "Reset Demo Data" / "Start from Zero").
 * Does NOT clear legacy keys — preserves backward compat.
 */
export function clearV2Data() {
  Object.values(KEYS).forEach(key => {
    localStorage.removeItem(V2_PREFIX + key);
  });
}

/**
 * Full factory reset — clears everything.
 */
export function clearAllData() {
  // Clear v2 keys
  clearV2Data();
  
  // Clear legacy keys
  Object.values(LEGACY_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear old rumah-ringkas keys too
  const oldKeys = ['rumah-ringkas:accounts', 'rumah-ringkas:transactions', 'rumah-ringkas:bills'];
  oldKeys.forEach(key => localStorage.removeItem(key));
}

/**
 * Create a backup object (v2 format with version header).
 */
export function createBackup(data) {
  return {
    _schemaVersion: SCHEMA_VERSION,
    _backupDate: new Date().toISOString(),
    _appVersion: '2.0.0',
    members: data.members,
    categories: data.categories,
    accounts: data.accounts,
    transactions: data.transactions,
    goals: data.goals,
    envelopes: data.envelopes,
    bills: data.bills,
    settings: data.settings
  };
}
