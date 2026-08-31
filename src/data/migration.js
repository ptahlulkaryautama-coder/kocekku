/**
 * Kocekku 2.0 — Data Migration Layer
 * 
 * Handles migration from legacy (v1) data format to v2.
 * Preserves all monetary values and financial relationships.
 * NEVER converts currencies or destroys data.
 */

import {
  SCHEMA_VERSION,
  LEGACY_ACCOUNT_TYPE_MAP,
  LEGACY_ROLE_MAP,
  LEGACY_CATEGORY_NAME_MAP
} from './schema.js';

/**
 * Detect the schema version of a dataset.
 * Returns 1 if unversioned (legacy), or the declared version.
 */
export function detectVersion(data) {
  if (data && typeof data._schemaVersion === 'number') {
    return data._schemaVersion;
  }
  // Legacy data has no version marker
  return 1;
}

/**
 * Migrate data from one version to another.
 * Returns a new object — does NOT mutate the input.
 */
export function migrateData(data, fromVersion) {
  // Clone to avoid mutation
  let migrated = JSON.parse(JSON.stringify(data));

  if (fromVersion < 2) {
    migrated = migrateV1toV2(migrated);
  }

  // Future: if (fromVersion < 3) migrated = migrateV2toV3(migrated);

  return migrated;
}

/**
 * Migration: v1 → v2
 * 
 * Changes:
 * - Adds _schemaVersion = 2
 * - Adds settings object with currency and locale
 * - Maps legacy account types to normalized types
 * - Maps legacy member roles to English
 * - Adds currency field to accounts (defaults to IDR for legacy data)
 * - Does NOT rename category names (preserves originals for backward compat)
 * - Does NOT destroy or rename any existing data
 */
function migrateV1toV2(data) {
  // 1. Set schema version
  data._schemaVersion = 2;

  // 2. Add settings (default to IDR for existing users)
  if (!data.settings) {
    data.settings = {
      currency: 'IDR',
      locale: 'en-US',
      language: 'en',
      dateFormat: 'MM/DD/YYYY'
    };
  }

  // 3. Migrate account types (non-destructive — adds normalizedType field)
  if (data.accounts && Array.isArray(data.accounts)) {
    data.accounts = data.accounts.map(account => {
      const migrated = { ...account };
      // Store normalized type without removing legacy type
      if (!migrated.normalizedType) {
        migrated.normalizedType = LEGACY_ACCOUNT_TYPE_MAP[account.type] || 'other';
      }
      // Add currency if missing (legacy = IDR)
      if (!migrated.currency) {
        migrated.currency = 'IDR';
      }
      return migrated;
    });
  }

  // 4. Migrate member roles (non-destructive — adds normalizedRole field)
  if (data.members && Array.isArray(data.members)) {
    data.members = data.members.map(member => {
      const migrated = { ...member };
      if (!migrated.normalizedRole) {
        migrated.normalizedRole = LEGACY_ROLE_MAP[member.role] || 'Member';
      }
      return migrated;
    });
  }

  // 5. Add currency to transactions (legacy = IDR)
  if (data.transactions && Array.isArray(data.transactions)) {
    data.transactions = data.transactions.map(tx => {
      const migrated = { ...tx };
      if (!migrated.currency) {
        migrated.currency = 'IDR';
      }
      return migrated;
    });
  }

  return data;
}

/**
 * Full import pipeline: parse → detect → migrate → validate
 * 
 * @param {string} jsonString - Raw JSON string from backup file
 * @param {Function} validateFn - Validation function from schema.js
 * @returns {{ success: boolean, data?: object, errors?: string[], warnings?: string[] }}
 */
export function importPipeline(jsonString, validateFn) {
  const warnings = [];

  // Step 1: Parse
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, errors: ['Invalid JSON format'] };
  }

  // Step 2: Validate basic structure
  if (!data || typeof data !== 'object') {
    return { success: false, errors: ['Invalid data: expected an object'] };
  }

  // Check for required arrays
  const requiredKeys = ['members', 'categories', 'accounts', 'transactions'];
  for (const key of requiredKeys) {
    if (!Array.isArray(data[key])) {
      return { success: false, errors: [`Missing required field: ${key}`] };
    }
  }

  // Step 3: Detect version
  const version = detectVersion(data);
  warnings.push(`Detected schema version: ${version}`);

  // Step 4: Migrate if needed
  let migrated = data;
  if (version < SCHEMA_VERSION) {
    warnings.push(`Migrating from v${version} to v${SCHEMA_VERSION}`);
    try {
      migrated = migrateData(data, version);
    } catch (e) {
      return { success: false, errors: [`Migration failed: ${e.message}`] };
    }
  }

  // Step 5: Validate
  const validation = validateFn(migrated);
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings };
  }

  return { success: true, data: migrated, warnings };
}
