/**
 * Settings Page Module
 * Renders the Settings page with preferences, currency, theme, data management
 */

import { CURRENCIES, formatCurrency } from '../formatting/currency.js';
import { t } from '../i18n/index.js';
import { setLanguage, getLanguage } from '../i18n/index.js';
import { appState } from '../app/state.js';
import { exportData, importData, resetToDemoData, deleteAllData, saveData } from '../app/bootstrap.js';

function getUserCurrency() {
  return appState.get('currency') || 'IDR';
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
];

export function renderSettingsPage() {
  const currency = getUserCurrency();
  const isDark = appState.get('isDarkMode');
  const userName = appState.get('user')?.name || '';

  const el = document.createElement('div');
  el.className = 'space-y-6 max-w-3xl';

  el.innerHTML = `
    <!-- HEADER -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${t('settings.title')}</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${t('settings.subtitle')}</p>
    </div>

    <!-- GENERAL -->
    <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">${t('settings.general')}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${t('settings.generalDesc')}</p>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('settings.userName')}</label>
          <input type="text" id="settings-user-name" value="${userName}" placeholder="${t('settings.userNamePlaceholder')}"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('settings.currency')}</label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">${t('settings.currencyDesc')}</p>
          <select id="settings-currency"
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            ${Object.entries(CURRENCIES).map(([code, c]) =>
              `<option value="${code}" ${currency === code ? 'selected' : ''}>${c.symbol} ${c.name} (${code})</option>`
            ).join('')}
          </select>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${t('reports.totalIncome')}: ${formatCurrency(1000000, currency)}</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('settings.language')}</label>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">${t('settings.languageDesc')}</p>
          <select id="settings-language" disabled
            class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 opacity-60">
            ${SUPPORTED_LANGUAGES.map(l =>
              `<option value="${l.code}" ${getLanguage() === l.code ? 'selected' : ''}>${l.name}</option>`
            ).join('')}
          </select>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">More languages coming soon</p>
        </div>
      </div>
    </section>

    <!-- APPEARANCE -->
    <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">${t('settings.appearance')}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${t('settings.appearanceDesc')}</p>
      <div class="flex gap-3">
        <button id="theme-light" class="flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${!isDark ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}">
          <i data-lucide="sun" class="w-5 h-5 mx-auto mb-1"></i>
          ${t('settings.light')}
        </button>
        <button id="theme-dark" class="flex-1 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${isDark ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}">
          <i data-lucide="moon" class="w-5 h-5 mx-auto mb-1"></i>
          ${t('settings.dark')}
        </button>
      </div>
    </section>

    <!-- DATA MANAGEMENT -->
    <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">${t('settings.dataManagement')}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${t('settings.dataManagementDesc')}</p>
      <div class="space-y-3">
        <!-- Backup -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">${t('settings.backup')}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${t('settings.backupDescription')}</p>
          </div>
          <button id="btn-backup" class="px-4 py-2 bg-primary-600 text-white text-sm rounded-xl font-medium hover:bg-primary-700 transition-colors">
            ${t('settings.backup')}
          </button>
        </div>
        <!-- Restore -->
        <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">${t('settings.restore')}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${t('settings.restoreDescription')}</p>
            </div>
            <div>
              <input type="file" id="restore-file" accept=".json" class="hidden">
              <button id="btn-restore" class="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                ${t('settings.pickFile')}
              </button>
            </div>
          </div>
          <!-- Restore preview (hidden until file selected) -->
          <div id="restore-preview" class="hidden mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="upload" class="w-5 h-5 text-success-600"></i>
                <span id="restore-filename" class="text-sm font-medium text-gray-900 dark:text-white"></span>
              </div>
              <div class="flex gap-2">
                <button id="btn-restore-cancel" class="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <button id="btn-restore-confirm" class="px-3 py-1.5 bg-success-600 text-white text-xs font-medium rounded-lg hover:bg-success-700 transition-colors">
                  Restore Data
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- Export CSV -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">${t('settings.exportCSV')}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${t('settings.exportCSVDescription')}</p>
          </div>
          <button id="btn-export-csv" class="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            ${t('settings.exportCSV')}
          </button>
        </div>
        <!-- Reset Demo -->
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <div>
            <p class="text-sm font-medium text-gray-900 dark:text-white">${t('settings.resetDemo')}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${t('settings.resetDemoDescription')}</p>
          </div>
          <button id="btn-reset-demo" class="px-4 py-2 border border-warning-200 dark:border-warning-700 text-warning-700 dark:text-warning-400 text-sm rounded-xl font-medium hover:bg-warning-50 dark:hover:bg-warning-900/20 transition-colors">
            ${t('settings.resetDemo')}
          </button>
        </div>
        <!-- Delete All -->
        <div class="flex items-center justify-between p-4 bg-danger-50 dark:bg-danger-900/10 rounded-xl border border-danger-100 dark:border-danger-900/30">
          <div>
            <p class="text-sm font-medium text-danger-700 dark:text-danger-400">${t('settings.deleteAll')}</p>
            <p class="text-xs text-danger-500 dark:text-danger-400/70">${t('settings.deleteAllDescription')}</p>
          </div>
          <button id="btn-delete-all" class="px-4 py-2 bg-danger-600 text-white text-sm rounded-xl font-medium hover:bg-danger-700 transition-colors">
            ${t('settings.deleteAll')}
          </button>
        </div>
      </div>
    </section>

    <!-- ABOUT -->
    <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">${t('settings.about')}</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${t('settings.aboutDesc')}</p>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">${t('settings.appName')}</span>
          <span class="font-medium text-gray-900 dark:text-white">${t('settings.appNameFull')}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">${t('settings.version')}</span>
          <span class="font-medium text-gray-900 dark:text-white">2.0.0</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Tagline</span>
          <span class="font-medium text-gray-900 dark:text-white italic">${t('settings.tagline')}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">${t('settings.currency')}</span>
          <span class="font-medium text-gray-900 dark:text-white">${currency} — ${CURRENCIES[currency]?.name || currency}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">${t('settings.language')}</span>
          <span class="font-medium text-gray-900 dark:text-white">English</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">${t('settings.theme')}</span>
          <span class="font-medium text-gray-900 dark:text-white">${isDark ? t('settings.dark') : t('settings.light')}</span>
        </div>
      </div>
    </section>
  `;

  // ── Bind event handlers ──
  requestAnimationFrame(() => {
    // Currency change
    const currencySelect = el.querySelector('#settings-currency');
    if (currencySelect) {
      currencySelect.addEventListener('change', (e) => {
        const newCurrency = e.target.value;
        appState.set('currency', newCurrency);
        localStorage.setItem('sakku-currency', newCurrency);
        appState.showToast({ type: 'success', message: t('settings.currencyChanged', { currency: newCurrency }) });
        // Re-render to update preview
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(renderSettingsPage(), el);
        }
      });
    }

    // User name
    const nameInput = el.querySelector('#settings-user-name');
    if (nameInput) {
      let debounce;
      nameInput.addEventListener('input', (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const user = appState.get('user') || {};
          user.name = e.target.value;
          appState.set('user', user);
          saveData();
        }, 500);
      });
    }

    // Theme
    const lightBtn = el.querySelector('#theme-light');
    const darkBtn = el.querySelector('#theme-dark');
    if (lightBtn) {
      lightBtn.addEventListener('click', () => {
        if (appState.get('isDarkMode')) {
          appState.toggleDarkMode();
          appState.showToast({ type: 'success', message: t('settings.themeChanged') });
          const parent = el.parentNode;
          if (parent) parent.replaceChild(renderSettingsPage(), el);
        }
      });
    }
    if (darkBtn) {
      darkBtn.addEventListener('click', () => {
        if (!appState.get('isDarkMode')) {
          appState.toggleDarkMode();
          appState.showToast({ type: 'success', message: t('settings.themeChanged') });
          const parent = el.parentNode;
          if (parent) parent.replaceChild(renderSettingsPage(), el);
        }
      });
    }

    // Backup
    const backupBtn = el.querySelector('#btn-backup');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        const data = exportData();
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `sakku-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        appState.showToast({ type: 'success', message: t('settings.backupExported') });
      });
    }

    // Restore — two-step: Pick file → confirm & restore
    const restoreBtn = el.querySelector('#btn-restore');
    const restoreFile = el.querySelector('#restore-file');
    const restorePreview = el.querySelector('#restore-preview');
    const restoreFilename = el.querySelector('#restore-filename');
    const restoreConfirm = el.querySelector('#btn-restore-confirm');
    const restoreCancel = el.querySelector('#btn-restore-cancel');
    let pendingRestoreFile = null;

    if (restoreBtn && restoreFile) {
      restoreBtn.addEventListener('click', () => restoreFile.click());

      restoreFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        pendingRestoreFile = file;
        restoreFilename.textContent = file.name;
        restorePreview.classList.remove('hidden');
      });
    }

    if (restoreCancel) {
      restoreCancel.addEventListener('click', () => {
        pendingRestoreFile = null;
        restoreFile.value = '';
        restorePreview.classList.add('hidden');
      });
    }

    if (restoreConfirm) {
      restoreConfirm.addEventListener('click', async () => {
        if (!pendingRestoreFile) return;
        try {
          const text = await pendingRestoreFile.text();
          const data = JSON.parse(text);
          const result = importData(data);
          if (result.success) {
            appState.showToast({ type: 'success', message: t('settings.backupImported') });
            window.location.reload();
          } else {
            appState.showToast({ type: 'error', message: result.message || t('settings.invalidBackup') });
          }
        } catch (err) {
          appState.showToast({ type: 'error', message: t('settings.invalidBackup') });
        }
        pendingRestoreFile = null;
        restoreFile.value = '';
        restorePreview.classList.add('hidden');
      });
    }

    // Export CSV
    const csvBtn = el.querySelector('#btn-export-csv');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => {
        const transactions = appState.get('transactions') || [];
        const accounts = appState.get('accounts') || [];
        const accountMap = {};
        accounts.forEach(a => { accountMap[a.id] = a.nama; });

        const header = 'Date,Description,Amount,Type,Account,Category,Member,Notes';
        const rows = transactions.map(tx => {
          const type = tx.tipe === 'masuk' ? 'Income' : tx.tipe === 'keluar' ? 'Expense' : 'Transfer';
          const account = accountMap[tx.dompet] || tx.dompet || '';
          return [
            tx.tanggal,
            `"${(tx.keterangan || '').replace(/"/g, '""')}"`,
            tx.jumlah,
            type,
            `"${account}"`,
            `"${tx.kategori || ''}"`,
            `"${tx.pengeluar || ''}"`,
            `"${(tx.catatan || '').replace(/"/g, '""')}"`,
          ].join(',');
        });

        const csv = [header, ...rows].join('\n');
        downloadFile(csv, `sakku-transactions-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        appState.showToast({ type: 'success', message: t('reports.csvSuccess') });
      });
    }

    // Reset Demo
    const resetBtn = el.querySelector('#btn-reset-demo');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const confirmed = await appState.confirm({
          title: t('settings.confirmReset'),
          message: t('settings.resetDemoWarning'),
          type: 'warning',
        });
        if (!confirmed) return;
        resetToDemoData();
        appState.showToast({ type: 'success', message: t('settings.dataReset') });
        window.location.reload();
      });
    }

    // Delete All
    const deleteBtn = el.querySelector('#btn-delete-all');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        const confirmed = await appState.confirm({
          title: t('settings.confirmDelete'),
          message: t('settings.deleteAllWarning'),
          type: 'danger',
        });
        if (!confirmed) return;
        deleteAllData();
        appState.showToast({ type: 'success', message: t('settings.dataDeleted') });
        window.location.reload();
      });
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ attrs: { class: 'w-5 h-5' }, nameAttr: 'data-lucide' });
    }
  });

  return el;
}
