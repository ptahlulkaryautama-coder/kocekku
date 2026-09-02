/**
 * Sakku — Main Entry Point
 * "Money Management, Simplified."
 *
 * Phase 3: Home Dashboard with real application data
 */

import { appState } from './app/state.js';
import { initializeApp, saveData } from './app/bootstrap.js';
import { NAV_ITEMS, MOBILE_NAV_ITEMS, isNavActive, shouldExpandNavItem } from './app/navigation.js';
import { t } from './i18n/index.js';
import { formatCurrency, detectDominantCurrency, CURRENCIES } from './formatting/currency.js';
import { initExchangeRates } from './data/exchange-rates.js';
import { formatDate, formatMonth } from './formatting/dates.js';
import { toast } from './ui/components/toast.js';

import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateSavingsRate,
  calculateNetWorth,
  calculateEmergencyFundCoverage,
  calculateDebtBurden,
  calculateSpendingByCategory,
  calculateCashFlowHistory,
  generateNextBestActions,
  calculateBillSummary,
  assessSavingsRate,
} from './domain/financial-health.js';

import { getUpcomingBills, calculateMonthlyCommitments, calculateBillsSummary, getBillsByStatus, calculateBillStatus, createBill as createBillObj, validateBill as validateBillFn, BILL_STATUS, RECURRENCE, calculateNextOccurrence, isBillPaidForMonth } from './domain/bills.js';
import { calculateAllBudgetUsages, getBudgetSummary, createBudget, validateBudget } from './domain/budgets.js';
import {
  getRecentTransactions,
  filterByType,
  filterByAccount,
  filterByCategory,
  filterByMember,
  searchTransactions,
  sortTransactions,
  spendingByCategory,
  incomeBySource,
  getTransactionsForPeriod,
  calculateCashFlow,
  createTransaction,
  validateTransaction,
} from './domain/transactions.js';
import { calculateGoalProgress, calculateAllGoalsProgress, getGoalsSummary, projectCompletionDate, createGoal, validateGoal } from './domain/goals.js';
import {
  calculateAvailableCash,
  calculateTotalAssets,
  calculateTotalLiabilities,
  classifyAccount,
  getAccountsByClassification,
  normalizeAccountType,
  createAccount,
  validateAccount,
  findAccountById,
} from './domain/accounts.js';

import './ui/design-tokens.css';
import { renderReportsPage } from './ui/reports-page.js';
import { renderSettingsPage } from './ui/settings-page.js';
import { renderDebtsPage } from './ui/debts-page.js';
import { showSmartAddModal } from './ui/smart-add.js';

import {
  calculateFamilySpending,
  getFamilySpendingSummary,
  createFamilyMember,
  validateFamilyMember,
  normalizeRelationship,
} from './domain/family.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function now() { return new Date(); }
function currentMonth() { return now().getMonth(); }
function currentYear() { return now().getFullYear(); }

function getGreeting() {
  const h = now().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getUserName() {
  const user = appState.get('user');
  return user?.name || '';
}

function getUserCurrency() {
  return appState.get('currency') || 'IDR';
}

/** Build a reusable card wrapper */
function card(extraClass = '') {
  const el = document.createElement('div');
  el.className = `bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${extraClass}`;
  return el;
}

/* ------------------------------------------------------------------ */
/*  Application Class                                                 */
/* ------------------------------------------------------------------ */

class SakkuApp {
  constructor() {
    this.sidebar = null;
    this.mainContent = null;
    this.mobileNav = null;
    this.currentTab = 'home';
    this._charts = [];  // track chart instances for cleanup
    this._period = { year: currentYear(), month: currentMonth() };
    this._sourceCurrency = 'IDR';  // dominant source currency for conversion
  }

  /**
   * Format currency with automatic source→display conversion.
   * Uses the detected source currency from the current data.
   */
  fmt(amount, displayCur) {
    const dc = displayCur || getUserCurrency();
    return formatCurrency(amount, dc, { fromCurrency: this._sourceCurrency });
  }

  /* ---- lifecycle ------------------------------------------------ */

  async init() {
    await initializeApp();
    initExchangeRates(); // fetch live rates in background
    this.buildShell();
    this.setupEventListeners();
    this.renderContent();
    if (window.lucide) window.lucide.createIcons();
  }

  /* ---- shell ---------------------------------------------------- */

  buildShell() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    this.sidebar = this.buildSidebar();
    app.appendChild(this.sidebar);

    const wrapper = document.createElement('div');
    wrapper.className = 'flex-1 flex flex-col min-h-screen lg:ml-64';
    wrapper.appendChild(this.buildDesktopHeader());

    this.mainContent = document.createElement('main');
    this.mainContent.id = 'main-content';
    this.mainContent.className = 'flex-1 p-4 lg:p-6 pb-20 lg:pb-6';
    wrapper.appendChild(this.mainContent);
    app.appendChild(wrapper);

    this.mobileNav = this.buildMobileNav();
    app.appendChild(this.mobileNav);
  }

  /* ---- sidebar -------------------------------------------------- */

  buildSidebar() {
    const sidebar = document.createElement('aside');
    sidebar.className = 'fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40 hidden lg:flex flex-col';
    sidebar.setAttribute('role', 'navigation');
    sidebar.setAttribute('aria-label', 'Main navigation');

    // Logo
    const logoSection = document.createElement('div');
    logoSection.className = 'p-6 border-b border-gray-200 dark:border-gray-800';
    logoSection.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="./sakku_logo_icon.png" alt="" class="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        <div>
          <img src="./sakku_wordmark.png" alt="Sakku" class="h-5 w-auto" data-wordmark />
          <p class="text-xs text-gray-500 dark:text-gray-400">Money Management, Simplified</p>
        </div>
      </div>`;
    sidebar.appendChild(logoSection);

    // Nav
    const nav = document.createElement('nav');
    nav.className = 'flex-1 p-4 space-y-1 overflow-y-auto';
    NAV_ITEMS.forEach(item => nav.appendChild(this.buildNavItem(item)));
    sidebar.appendChild(nav);

    // Theme toggle footer
    const footer = document.createElement('div');
    footer.className = 'p-4 border-t border-gray-200 dark:border-gray-800';
    const dark = appState.get('isDarkMode');
    const btn = document.createElement('button');
    btn.className = 'flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors';
    btn.innerHTML = `<i data-lucide="${dark ? 'sun' : 'moon'}" class="w-5 h-5 text-gray-500"></i><span class="text-sm text-gray-700 dark:text-gray-300">${dark ? 'Light Mode' : 'Dark Mode'}</span>`;
    btn.addEventListener('click', () => { appState.toggleDarkMode(); this.buildShell(); this.renderContent(); });
    footer.appendChild(btn);
    sidebar.appendChild(footer);

    return sidebar;
  }

  buildNavItem(item, isChild = false) {
    const container = document.createElement('div');
    const isActive = isNavActive(item.id, this.currentTab);
    const shouldExpand = shouldExpandNavItem(item.id, this.currentTab);

    const btn = document.createElement('button');
    btn.className = `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors ${isChild ? 'pl-11' : ''} ${isActive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`;

    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', item.icon);
    icon.className = 'w-5 h-5';
    btn.appendChild(icon);

    const label = document.createElement('span');
    label.className = 'text-sm font-medium';
    label.textContent = t(item.label);
    btn.appendChild(label);

    if (item.children && !isChild) {
      const arrow = document.createElement('i');
      arrow.setAttribute('data-lucide', 'chevron-down');
      arrow.className = `w-4 h-4 ml-auto transition-transform ${shouldExpand ? 'rotate-180' : ''}`;
      btn.appendChild(arrow);
      btn.addEventListener('click', () => { if (item.children.length) this.navigateTo(item.children[0].id); });
    } else {
      btn.addEventListener('click', () => this.navigateTo(item.id));
    }

    container.appendChild(btn);

    if (item.children && shouldExpand) {
      const children = document.createElement('div');
      children.className = 'mt-1 space-y-1';
      item.children.forEach(c => children.appendChild(this.buildNavItem(c, true)));
      container.appendChild(children);
    }

    return container;
  }

  /* ---- desktop header ------------------------------------------- */

  buildDesktopHeader() {
    const header = document.createElement('header');
    header.className = 'hidden lg:flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900';
    header.setAttribute('role', 'banner');

    const search = document.createElement('div');
    search.className = 'flex-1 max-w-md';
    search.innerHTML = `<div class="relative"><i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></i><input type="text" placeholder="Search transactions..." class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"></div>`;

    const right = document.createElement('div');
    right.className = 'flex items-center gap-4';

    const addBtn = document.createElement('button');
    addBtn.className = 'flex items-center gap-2 px-4 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ';
    addBtn.innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i><span class="font-medium">Add</span>';
    addBtn.addEventListener('click', () => this.showSmartAddModal());
    right.appendChild(addBtn);

    right.innerHTML += `<button class="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><i data-lucide="bell" class="w-5 h-5 text-gray-600 dark:text-gray-400"></i></button>`;

    const avatar = document.createElement('div');
    avatar.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium';
    avatar.textContent = (getUserName() || 'U')[0].toUpperCase();
    right.appendChild(avatar);

    header.appendChild(search);
    header.appendChild(right);
    return header;
  }

  /* ---- mobile nav ------------------------------------------------ */

  buildMobileNav() {
    const nav = document.createElement('nav');
    nav.className = 'fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 lg:hidden z-40';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Mobile navigation');
    nav.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    const container = document.createElement('div');
    container.className = 'flex items-center justify-around h-14 sm:h-16';
    MOBILE_NAV_ITEMS.forEach(item => container.appendChild(this.buildMobileNavItem(item)));
    nav.appendChild(container);
    return nav;
  }

  buildMobileNavItem(item) {
    const wrapper = document.createElement('div');
    if (item.isAction) {
      const fab = document.createElement('button');
      fab.className = 'w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg -mt-5 sm:-mt-6';
      fab.innerHTML = '<i data-lucide="plus" class="w-6 h-6"></i>';
      fab.addEventListener('click', () => this.showSmartAddModal());
      wrapper.appendChild(fab);
      return wrapper;
    }

    // Find the full NAV_ITEMS definition for this item (may have children)
    const fullItem = NAV_ITEMS.find(n => n.id === item.id);
    const hasChildren = fullItem?.children && fullItem.children.length > 0;

    const isActive = isNavActive(item.id, this.currentTab);
    const btn = document.createElement('button');
    btn.className = `flex flex-col items-center justify-center gap-1 w-full min-w-[48px] py-2 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`;
    btn.innerHTML = `<i data-lucide="${item.icon}" class="w-5 h-5"></i><span class="text-[11px] font-medium leading-tight">${t(item.label)}</span>`;
    btn.addEventListener('click', () => {
      if (item.id === 'more') {
        this.showMobileMoreMenu();
      } else if (hasChildren) {
        this.showMobileSubmenu(fullItem);
      } else {
        this.navigateTo(item.id);
      }
    });
    wrapper.appendChild(btn);
    return wrapper;
  }

  /* ---- Mobile submenu for parent nav items ----------------------- */

  showMobileSubmenu(parentItem) {
    // Remove any existing overlay
    document.querySelector('.mobile-submenu-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 lg:hidden mobile-submenu-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const sheet = document.createElement('div');
    sheet.className = 'fixed bottom-14 sm:bottom-16 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl p-4 pb-6 z-50 lg:hidden shadow-xl';
    sheet.style.paddingBottom = 'calc(24px + env(safe-area-inset-bottom, 0px))';

    const title = document.createElement('h3');
    title.className = 'text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-2';
    title.textContent = t(parentItem.label);
    sheet.appendChild(title);

    const list = document.createElement('div');
    list.className = 'space-y-1';

    parentItem.children.forEach(child => {
      const btn = document.createElement('button');
      const isActive = this.currentTab === child.id;
      btn.className = `flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`;
      btn.innerHTML = `<i data-lucide="${child.icon}" class="w-5 h-5"></i><span class="text-sm font-medium">${t(child.label)}</span>`;
      btn.addEventListener('click', () => { overlay.remove(); this.navigateTo(child.id); });
      list.appendChild(btn);
    });

    sheet.appendChild(list);
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
  }

  /* ---- navigation ------------------------------------------------ */

  navigateTo(tabId) {
    this.currentTab = tabId;
    appState.set('currentTab', tabId);
    this.buildShell();   // recreate shell first (creates new mainContent element)
    this.renderContent(); // then render into the fresh mainContent
  }

  /* ---- content router -------------------------------------------- */

  renderContent() {
    if (!this.mainContent) return;
    this.destroyCharts();
    this.mainContent.innerHTML = '';

    try {
      const content = this.getTabContent(this.currentTab);
      this.mainContent.appendChild(content);
    } catch (err) {
      console.error('[Sakku] Page render error:', err);
      this.mainContent.innerHTML = `
        <div class="flex flex-col items-center justify-center py-24 text-center px-4">
          <div class="w-16 h-16 rounded-full bg-danger-50 dark:bg-danger-900/20 flex items-center justify-center mb-4">
            <i data-lucide="alert-triangle" class="w-8 h-8 text-danger-500"></i>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">${err.message || 'An unexpected error occurred while loading this page.'}</p>
          <button onclick="window.location.reload()" class="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">Reload Page</button>
        </div>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  getTabContent(tabId) {
    switch (tabId) {
      case 'home':       return this.renderHome();
      case 'accounts':   return this.renderAccounts();
      case 'transactions': return this.renderTransactionsPage();
      case 'transfers':  return this.renderTransfers();
      case 'budgets':    return this.renderBudgets();
      case 'goals':      return this.renderGoals();
      case 'bills':      return this.renderBills();
      case 'health':     return this.renderFinancialHealth();
      case 'family':     return this.renderFamily();
      case 'reports':    return this.renderReports();
      case 'settings':   return this.renderSettings();
      case 'debts':      return renderDebtsPage();
      default:           return this.renderPlaceholder(tabId);
    }
  }

  /* ================================================================ */
  /*  HOME DASHBOARD  (Phase 3 — data-driven)                        */
  /* ================================================================ */

  renderHome() {
    const container = document.createElement('div');
    container.className = 'space-y-6';

    // Gather real data
    const accounts      = appState.get('accounts') || [];
    const transactions  = appState.get('transactions') || [];
    const budgets       = appState.get('budgets') || [];
    const goals         = appState.get('goals') || [];
    const bills         = appState.get('bills') || [];
    const members       = appState.get('familyMembers') || [];
    const displayCurrency = getUserCurrency();
    const currency = displayCurrency; // alias for builder function signatures
    const year          = this._period.year;
    const month         = this._period.month;

    // Detect the dominant source currency from accounts for conversion
    this._sourceCurrency = detectDominantCurrency(
      accounts.map(a => ({ amount: Math.abs(parseFloat(a.saldo) || 0), currency: a.mataUang || 'IDR' }))
    );
    const sourceCurrency = this._sourceCurrency;
    // Helper: format with auto-conversion from source to display currency
    const fc = (amount, displayCur) => formatCurrency(amount, displayCur || displayCurrency, { fromCurrency: sourceCurrency });

    const monthIncome   = calculateMonthlyIncome(transactions, year, month);
    const monthExpenses = calculateMonthlyExpenses(transactions, year, month);
    const savingsRate   = calculateSavingsRate(monthIncome, monthExpenses);
    const netWorthData  = calculateNetWorth(accounts);
    const availableCash = calculateAvailableCash(accounts);
    const emergencyFund = calculateEmergencyFundCoverage(accounts, monthExpenses);
    const debtBurden    = calculateDebtBurden(transactions, budgets, year, month, monthIncome);
    const spending      = calculateSpendingByCategory(transactions, year, month);
    const cashFlowHist  = calculateCashFlowHistory(transactions, year, month);
    const upcomingBills = getUpcomingBills(bills, 30);
    const goalProgress  = calculateAllGoalsProgress(goals);
    const billSummary   = calculateBillSummary(bills);

    const healthData = {
      savingsRate,
      emergencyFund,
      debtBurden,
      budgetOverruns: spending.filter(s => {
        const b = budgets.find(bg => bg.kategori === s.category);
        return b && s.amount > (parseFloat(b.anggaran) || 0);
      }).map(s => {
        const b = budgets.find(bg => bg.kategori === s.category);
        const limit = parseFloat(b?.anggaran) || 0;
        return { categoryName: s.category, overagePercent: limit > 0 ? Math.round(((s.amount - limit) / limit) * 100) : 0 };
      })
    };
    const nextActions = generateNextBestActions(healthData);

    // Check if user has any data
    const hasData = transactions.length > 0 || accounts.length > 0;

    /* ---- 1. PAGE HEADER ---------------------------------------- */

    container.appendChild(this.buildHomeHeader(year, month));

    if (!hasData) {
      container.appendChild(this.buildEmptyDashboard());
      return container;
    }

    /* ---- 2. NET WORTH (primary metric) ------------------------- */

    container.appendChild(this.buildNetWorthCard(netWorthData, currency));

    /* ---- 3. KEY METRICS (4 cards) ------------------------------ */

    container.appendChild(this.buildKeyMetrics(monthIncome, monthExpenses, savingsRate, availableCash, currency));

    /* ---- 4. ANALYTICS ROW (cash flow + spending) --------------- */

    const analyticsRow = document.createElement('div');
    analyticsRow.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6';

    analyticsRow.appendChild(this.buildCashFlowCard(cashFlowHist, currency));
    analyticsRow.appendChild(this.buildSpendingCard(spending, monthExpenses, currency));
    container.appendChild(analyticsRow);

    /* ---- 5. PLANNING ROW (bills + goals) ----------------------- */

    const planningRow = document.createElement('div');
    planningRow.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6';
    planningRow.appendChild(this.buildBillsCard(upcomingBills, billSummary, currency));
    planningRow.appendChild(this.buildGoalsCard(goalProgress, currency));
    container.appendChild(planningRow);

    /* ---- 6. FINANCIAL HEALTH ----------------------------------- */

    container.appendChild(this.buildFinancialHealthCard(emergencyFund, savingsRate, debtBurden));

    /* ---- 7. NEXT BEST ACTIONS ---------------------------------- */

    if (nextActions.length > 0) {
      container.appendChild(this.buildNextActionsCard(nextActions));
    }

    /* ---- 8. SMART ADD ------------------------------------------ */

    container.appendChild(this.buildSmartAddCard());

    /* ---- 9. RECENT TRANSACTIONS -------------------------------- */

    const recent = getRecentTransactions(transactions, 5);
    if (recent.length > 0) {
      container.appendChild(this.buildRecentTransactionsCard(recent, accounts, currency));
    }

    // Post-render: init charts
    requestAnimationFrame(() => {
      this.initCashFlowChart(cashFlowHist, currency);
      this.initSpendingChart(spending, monthExpenses, currency);
    });

    return container;
  }

  /* ---- HOME HEADER ---------------------------------------------- */

  buildHomeHeader(year, month) {
    const container = document.createElement('div');
    container.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';

    const greeting = document.createElement('div');
    const name = getUserName();
    const greetingText = getGreeting();
    greeting.innerHTML = `
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${greetingText}${name ? ', ' + name : ''}</h1>
      <p class="text-gray-500 dark:text-gray-400">Here's your financial overview for ${formatMonth(`${year}-${String(month + 1).padStart(2, '0')}`, 'long')}.</p>`;

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-3';

    // Period selector
    const select = document.createElement('select');
    select.className = 'px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
    const now2 = now();
    const periods = [
      { value: `${now2.getFullYear()}-${now2.getMonth()}`, label: 'This Month' },
      (() => { const d = new Date(now2.getFullYear(), now2.getMonth() - 1, 1); return { value: `${d.getFullYear()}-${d.getMonth()}`, label: 'Last Month' }; })(),
      { value: 'quarter', label: 'This Quarter' },
      { value: `${now2.getFullYear()}-0`, label: 'This Year' },
    ];
    periods.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.value;
      opt.textContent = p.label;
      select.appendChild(opt);
    });
    select.value = `${year}-${month}`;
    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'quarter') {
        const q = Math.floor(now2.getMonth() / 3);
        this._period = { year: now2.getFullYear(), month: q * 3 };
      } else {
        const [y, m] = val.split('-').map(Number);
        this._period = { year: y, month: m };
      }
      this.renderContent();
    });
    actions.appendChild(select);

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium';
    addBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i>Add Transaction';
    addBtn.addEventListener('click', () => this.showSmartAddModal());
    actions.appendChild(addBtn);

    container.appendChild(greeting);
    container.appendChild(actions);
    return container;
  }

  /* ---- NET WORTH ------------------------------------------------ */

  buildNetWorthCard(data, currency) {
    const el = card();
    el.innerHTML = `
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Net Worth</p>
      <p class="text-3xl font-bold text-gray-900 dark:text-white mb-4">${this.fmt(data.total)}</p>
      <div class="flex gap-8">
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Assets</p>
          <p class="text-lg font-semibold text-success-600">${this.fmt(data.assets)}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Liabilities</p>
          <p class="text-lg font-semibold text-danger-600">${this.fmt(data.liabilities)}</p>
        </div>
      </div>`;
    return el;
  }

  /* ---- KEY METRICS (4 cards) ------------------------------------ */

  buildKeyMetrics(income, expenses, savingsRate, cash, currency) {
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4';

    const metrics = [
      { label: 'Income',        value: this.fmt(income),   icon: 'arrow-down-left', color: 'bg-success-100 dark:bg-success-900/30 text-success-600' },
      { label: 'Expenses',      value: this.fmt(expenses), icon: 'arrow-up-right',   color: 'bg-danger-100 dark:bg-danger-900/30 text-danger-600' },
      { label: 'Savings Rate',  value: `${savingsRate}%`,                  icon: 'piggy-bank',      color: 'bg-info-100 dark:bg-info-900/30 text-info-600' },
      { label: 'Available Cash',value: this.fmt(cash),     icon: 'wallet',           color: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' },
    ];

    metrics.forEach(m => {
      const el = card();
      el.innerHTML = `
        <div class="w-10 h-10 rounded-lg ${m.color} flex items-center justify-center mb-3">
          <i data-lucide="${m.icon}" class="w-5 h-5"></i>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">${m.label}</p>
        <p class="text-xl font-bold text-gray-900 dark:text-white">${m.value}</p>`;
      grid.appendChild(el);
    });

    return grid;
  }

  /* ---- CASH FLOW CHART ----------------------------------------- */

  buildCashFlowCard(history, currency) {
    const el = card();
    el.innerHTML = `
      <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Cash Flow</h3>
      <div id="cashflow-chart" class="w-full" style="min-height:260px"></div>`;

    if (history.every(h => h.income === 0 && h.expense === 0)) {
      el.innerHTML = `
        <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Cash Flow</h3>
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <i data-lucide="bar-chart-3" class="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3"></i>
          <p class="text-sm text-gray-500 dark:text-gray-400">Not enough data yet</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">Keep tracking to see your cash flow trend.</p>
        </div>`;
    }

    return el;
  }

  initCashFlowChart(history, currency) {
    const el = document.getElementById('cashflow-chart');
    if (!el || !window.ApexCharts) return;
    if (history.every(h => h.income === 0 && h.expense === 0)) return;

    const isDark = appState.get('isDarkMode');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';

    const chart = new ApexCharts(el, {
      chart: { type: 'bar', height: 260, toolbar: { show: false }, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' },
      series: [
        { name: 'Income',  data: history.map(h => h.income) },
        { name: 'Expenses', data: history.map(h => h.expense) },
      ],
      xaxis: {
        categories: history.map(h => h.label),
        labels: { style: { colors: textColor, fontSize: '12px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: textColor, fontSize: '12px' },
          formatter: (v) => this.fmt(v),
        },
      },
      colors: ['#10b981', '#f43f5e'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '60%', borderRadiusApplication: 'end' } },
      grid: { borderColor: gridColor, strokeDashArray: 4 },
      legend: { show: true, position: 'top', horizontalAlign: 'right', labels: { colors: textColor } },
      tooltip: { y: { formatter: (v) => this.fmt(v) } },
      dataLabels: { enabled: false },
      stroke: { show: false },
    });
    chart.render();
    this._charts.push(chart);
  }

  /* ---- SPENDING BREAKDOWN --------------------------------------- */

  buildSpendingCard(spending, totalExpenses, currency) {
    const el = card();
    el.innerHTML = `
      <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Where Your Money Goes</h3>
      <div id="spending-chart" class="w-full" style="min-height:260px"></div>`;

    if (spending.length === 0 || totalExpenses === 0) {
      el.innerHTML = `
        <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Where Your Money Goes</h3>
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <i data-lucide="pie-chart" class="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3"></i>
          <p class="text-sm text-gray-500 dark:text-gray-400">No expenses this month</p>
        </div>`;
    }

    return el;
  }

  initSpendingChart(spending, totalExpenses, currency) {
    const el = document.getElementById('spending-chart');
    if (!el || !window.ApexCharts) return;
    if (spending.length === 0 || totalExpenses === 0) return;

    const isDark = appState.get('isDarkMode');
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const topN = spending.slice(0, 5);
    const otherAmount = spending.slice(5).reduce((s, c) => s + c.amount, 0);
    const labels = topN.map(s => s.category);
    const values = topN.map(s => s.amount);
    if (otherAmount > 0) { labels.push('Other'); values.push(otherAmount); }

    const colors = ['#d97706', '#10b981', '#3b82f6', '#f43f5e', '#8b5cf6', '#6b7280'];

    const chart = new ApexCharts(el, {
      chart: { type: 'donut', height: 260, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' },
      series: values,
      labels,
      colors,
      plotOptions: { pie: { donut: { size: '70%', labels: { show: true, name: { show: false }, value: { show: true, fontSize: '18px', fontWeight: 700, formatter: (v) => this.fmt(v) }, total: { show: true, label: 'Total', formatter: () => this.fmt(totalExpenses) } } } } },
      legend: { position: 'right', fontSize: '12px', labels: { colors: textColor }, itemMargin: { vertical: 4 } },
      tooltip: { y: { formatter: (v) => this.fmt(v) } },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
    });
    chart.render();
    this._charts.push(chart);
  }

  /* ---- UPCOMING BILLS ------------------------------------------- */

  buildBillsCard(upcoming, summary, currency) {
    const el = card();
    let html = `<div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">Upcoming Bills</h3>
      <button class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400" data-nav="bills">View All</button>
    </div>`;

    if (upcoming.length === 0) {
      html += `
        <div class="flex flex-col items-center py-8 text-center">
          <i data-lucide="calendar-check" class="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3"></i>
          <p class="text-sm text-gray-500 dark:text-gray-400">No upcoming bills</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">You don't have any upcoming recurring payments.</p>
        </div>`;
    } else {
      html += '<div class="space-y-3">';
      upcoming.slice(0, 4).forEach(bill => {
        const due = bill.nextDueDate;
        const dueStr = due ? formatDate(due.toISOString().slice(0, 10), 'short') : '—';
        const days = bill.daysUntilDue;
        const urgency = days <= 3 ? 'text-danger-600' : days <= 7 ? 'text-warning-600' : 'text-gray-500 dark:text-gray-400';
        html += `
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <i data-lucide="receipt" class="w-5 h-5 text-gray-500 dark:text-gray-400"></i>
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white text-sm">${bill.nama}</p>
                <p class="text-xs ${urgency}">${dueStr}${days <= 7 ? ` · ${days}d` : ''}</p>
              </div>
            </div>
            <p class="font-semibold text-gray-900 dark:text-white text-sm">${this.fmt(bill.jumlah)}</p>
          </div>`;
      });
      html += '</div>';

      if (summary.monthlyCommitments > 0) {
        html += `<div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span class="text-sm text-gray-500 dark:text-gray-400">Monthly Commitments</span>
          <span class="font-semibold text-gray-900 dark:text-white">${this.fmt(summary.monthlyCommitments)}</span>
        </div>`;
      }
    }

    el.innerHTML = html;

    // Wire up "View All"
    el.querySelector('[data-nav="bills"]')?.addEventListener('click', () => this.navigateTo('bills'));

    return el;
  }

  /* ---- SAVINGS GOALS -------------------------------------------- */

  buildGoalsCard(goalProgress, currency) {
    const el = card();
    let html = `<div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">Financial Goals</h3>
      <button class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400" data-nav="goals">View All</button>
    </div>`;

    if (goalProgress.length === 0) {
      html += `
        <div class="flex flex-col items-center py-8 text-center">
          <i data-lucide="target" class="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3"></i>
          <p class="text-sm text-gray-500 dark:text-gray-400">No goals set yet</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">Create a financial goal to start tracking your progress.</p>
        </div>`;
    } else {
      html += '<div class="space-y-4">';
      goalProgress.slice(0, 3).forEach(g => {
        const color = g.isComplete ? 'bg-success-500' : g.percentage >= 75 ? 'bg-success-500' : g.percentage >= 50 ? 'bg-primary-500' : 'bg-warning-500';
        html += `
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-gray-900 dark:text-white text-sm">${g.name}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">${g.percentage}%</span>
            </div>
            <div class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full ${color} rounded-full transition-all" style="width: ${g.percentage}%"></div>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">${this.fmt(g.current)} / ${this.fmt(g.target)}</p>
          </div>`;
      });
      html += '</div>';
    }

    el.innerHTML = html;
    el.querySelector('[data-nav="goals"]')?.addEventListener('click', () => this.navigateTo('goals'));
    return el;
  }

  /* ---- FINANCIAL HEALTH ----------------------------------------- */

  buildFinancialHealthCard(emergencyFund, savingsRate, debtBurden) {
    const el = card();
    const srAssessment = assessSavingsRate(savingsRate);

    const efStatus = emergencyFund.status === 'safe' ? 'text-success-600' : emergencyFund.status === 'caution' ? 'text-warning-600' : 'text-danger-600';
    const efLabel = emergencyFund.status === 'safe' ? 'Healthy' : emergencyFund.status === 'caution' ? 'Needs Attention' : 'Critical';

    const srStatus = srAssessment.level === 'healthy' ? 'text-success-600' : srAssessment.level === 'adequate' ? 'text-warning-600' : 'text-danger-600';
    const srLabel = srAssessment.status;

    const dbStatus = debtBurden.status === 'safe' ? 'text-success-600' : debtBurden.status === 'caution' ? 'text-warning-600' : 'text-danger-600';
    const dbLabel = debtBurden.status === 'safe' ? 'Healthy' : debtBurden.status === 'caution' ? 'Moderate' : 'High';

    el.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">Financial Health</h3>
        <button class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400" data-nav="health">View Details</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Emergency Fund</p>
          <p class="text-lg font-bold text-gray-900 dark:text-white">${emergencyFund.months} mo</p>
          <p class="text-xs font-medium ${efStatus}">${efLabel}</p>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Savings Rate</p>
          <p class="text-lg font-bold text-gray-900 dark:text-white">${savingsRate}%</p>
          <p class="text-xs font-medium ${srStatus}">${srLabel}</p>
        </div>
        <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Debt Burden</p>
          <p class="text-lg font-bold text-gray-900 dark:text-white">${debtBurden.ratio}%</p>
          <p class="text-xs font-medium ${dbStatus}">${dbLabel}</p>
        </div>
      </div>`;

    el.querySelector('[data-nav="health"]')?.addEventListener('click', () => this.navigateTo('health'));
    return el;
  }

  /* ---- NEXT BEST ACTIONS ---------------------------------------- */

  buildNextActionsCard(actions) {
    const el = card();
    let html = `
      <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4">Next Best Actions</h3>
      <div class="space-y-3">`;

    actions.forEach(a => {
      const iconColor = a.priority === 'high' ? 'text-danger-600 bg-danger-100 dark:bg-danger-900/30' : a.priority === 'medium' ? 'text-warning-600 bg-warning-100 dark:bg-warning-900/30' : 'text-success-600 bg-success-100 dark:bg-success-900/30';
      html += `
        <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div class="w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center flex-shrink-0 mt-0.5">
            <i data-lucide="${a.icon}" class="w-4 h-4"></i>
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300">${a.message}</p>
        </div>`;
    });

    html += '</div>';
    el.innerHTML = html;
    return el;
  }

  /* ---- SMART ADD CARD ------------------------------------------- */

  buildSmartAddCard() {
    const el = card();
    el.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
          <i data-lucide="zap" class="w-5 h-5 text-primary-600"></i>
        </div>
        <div class="flex-1">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">Quick Add Transaction</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Record income, expense, or transfer in seconds.</p>
        </div>
        <button id="sa-open" class="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium">
          <i data-lucide="plus" class="w-4 h-4"></i>Add
        </button>
      </div>`;

    el.querySelector('#sa-open')?.addEventListener('click', () => this.showSmartAddModal());
    return el;
  }

  /* ---- RECENT TRANSACTIONS -------------------------------------- */

  buildRecentTransactionsCard(recent, accounts, currency) {
    const el = card();
    let html = `
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
        <button class="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400" data-nav="transactions">View All</button>
      </div>
      <div class="space-y-1">`;

    recent.forEach(t => {
      const isIncome = t.tipe === 'masuk';
      const amountColor = isIncome ? 'text-success-600' : 'text-danger-600';
      const sign = isIncome ? '+' : '-';
      const account = accounts.find(a => a.id === t.dompet);
      const accountName = account?.nama || t.dompet || '';
      const dateStr = t.tanggal ? formatDate(t.tanggal, 'short') : '';

      html += `
        <div class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg ${isIncome ? 'bg-success-100 dark:bg-success-900/30' : 'bg-danger-100 dark:bg-danger-900/30'} flex items-center justify-center flex-shrink-0">
              <i data-lucide="${isIncome ? 'arrow-down-left' : 'arrow-up-right'}" class="w-4 h-4 ${isIncome ? 'text-success-600' : 'text-danger-600'}"></i>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${t.keterangan || 'Untitled'}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${dateStr}${accountName ? ' · ' + accountName : ''}</p>
            </div>
          </div>
          <p class="text-sm font-semibold ${amountColor} whitespace-nowrap ml-3">${sign}${this.fmt(t.jumlah)}</p>
        </div>`;
    });

    html += '</div>';
    el.innerHTML = html;
    el.querySelector('[data-nav="transactions"]')?.addEventListener('click', () => this.navigateTo('transactions'));
    return el;
  }

  /* ---- EMPTY DASHBOARD ------------------------------------------ */

  buildEmptyDashboard() {
    const el = card();
    el.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="mb-6">
          <img src="./sakku_logo_icon.png" alt="Sakku" class="w-20 h-20 rounded-2xl object-cover" loading="lazy" />
        </div>
        <h2 class="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Welcome to <img src="./sakku_wordmark.png" alt="Sakku" class="inline-block h-7 align-baseline" data-wordmark /></h2>
        <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md">Start by adding your first transaction or importing your financial data. Your financial overview will appear here.</p>
        <button id="empty-add-btn" class="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
          <i data-lucide="plus" class="w-5 h-5"></i>Add Your First Transaction
        </button>
      </div>`;

    el.querySelector('#empty-add-btn')?.addEventListener('click', () => this.showSmartAddModal());
    return el;
  }

  /* ================================================================ */
  /*  TRANSACTIONS PAGE (Phase 4)                                     */
  /* ================================================================ */

  renderTransactionsPage() {
    const container = document.createElement('div');
    container.className = 'space-y-6';

    const transactions = appState.get('transactions') || [];
    const accounts     = appState.get('accounts') || [];
    const members      = appState.get('familyMembers') || [];
    const currency     = getUserCurrency();

    // Unique categories from transactions
    const categories = [...new Set(transactions.map(t => t.kategori).filter(Boolean))].sort();

    // Filter state (local to this render)
    const state = {
      search: '',
      type: 'all',
      account: 'all',
      category: 'all',
      member: 'all',
      sortField: 'tanggal',
      sortDir: 'desc',
      showCount: 25,
    };

    // Page header
    const header = document.createElement('div');
    header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
    header.innerHTML = `
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
        <p class="text-gray-500 dark:text-gray-400">${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} total</p>
      </div>`;
    const headerActions = document.createElement('div');
    headerActions.className = 'flex items-center gap-3';

    const addBtn = document.createElement('button');
    addBtn.className = 'flex items-center gap-2 px-4 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium ';
    addBtn.innerHTML = '<i data-lucide="plus" class="w-4 h-4"></i>New Transaction';
    addBtn.addEventListener('click', () => this.showTransactionModal(null, accounts, members, categories, state));
    headerActions.appendChild(addBtn);
    header.appendChild(headerActions);
    container.appendChild(header);

    // Filters bar
    const filters = document.createElement('div');
    filters.className = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4';

    // Search
    const searchRow = document.createElement('div');
    searchRow.className = 'mb-4';
    searchRow.innerHTML = `
      <div class="relative">
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></i>
        <input type="text" id="txn-search" placeholder="Search transactions..." aria-label="Search transactions" class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm">
      </div>`;
    filters.appendChild(searchRow);

    // Filter dropdowns
    const dropdownRow = document.createElement('div');
    dropdownRow.className = 'grid grid-cols-2 sm:grid-cols-4 gap-3';

    const mkSelect = (id, label, options) => {
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${label}</label>
        <select id="${id}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          ${options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
        </select>`;
      return wrap.querySelector('select');
    };

    const typeSelect = mkSelect('txn-type', 'Type', [
      { value: 'all', label: 'All Types' },
      { value: 'masuk', label: 'Income' },
      { value: 'keluar', label: 'Expense' },
      { value: 'transfer', label: 'Transfer' },
    ]);
    const accountSelect = mkSelect('txn-account', 'Account', [
      { value: 'all', label: 'All Accounts' },
      ...accounts.map(a => ({ value: a.id, label: a.nama }))
    ]);
    const categorySelect = mkSelect('txn-category', 'Category', [
      { value: 'all', label: 'All Categories' },
      ...categories.map(c => ({ value: c, label: c }))
    ]);
    const memberSelect = mkSelect('txn-member', 'Member', [
      { value: 'all', label: 'All Members' },
      ...members.map(m => ({ value: m.id, label: m.nama }))
    ]);

    dropdownRow.appendChild(typeSelect.parentElement || mkSelectWrap(typeSelect));
    dropdownRow.appendChild(accountSelect.parentElement || mkSelectWrap(accountSelect));
    dropdownRow.appendChild(categorySelect.parentElement || mkSelectWrap(categorySelect));
    dropdownRow.appendChild(memberSelect.parentElement || mkSelectWrap(memberSelect));
    filters.appendChild(dropdownRow);
    container.appendChild(filters);

    // Table container
    const tableWrap = document.createElement('div');
    tableWrap.className = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden';
    container.appendChild(tableWrap);

    // Render function (re-renders table + summary)
    const render = () => {
      let filtered = [...transactions];

      // Apply search
      if (state.search) filtered = searchTransactions(filtered, state.search);
      // Apply type filter
      if (state.type !== 'all') filtered = filterByType(filtered, state.type);
      // Apply account filter
      if (state.account !== 'all') filtered = filterByAccount(filtered, state.account);
      // Apply category filter
      if (state.category !== 'all') filtered = filterByCategory(filtered, state.category);
      // Apply member filter
      if (state.member !== 'all') filtered = filterByMember(filtered, state.member);
      // Sort
      filtered = sortTransactions(filtered, state.sortField, state.sortDir);

      const totalIncome  = filtered.filter(t => t.tipe === 'masuk').reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);
      const totalExpense = filtered.filter(t => t.tipe === 'keluar').reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);

      const visible = filtered.slice(0, state.showCount);
      const hasMore = filtered.length > state.showCount;

      tableWrap.innerHTML = '';

      // Summary bar
      const summary = document.createElement('div');
      summary.className = 'flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm';
      summary.innerHTML = `
        <span class="text-gray-500 dark:text-gray-400">${filtered.length} result${filtered.length !== 1 ? 's' : ''}</span>
        <div class="flex gap-4">
          <span class="text-success-600 font-medium">+${this.fmt(totalIncome)}</span>
          <span class="text-danger-600 font-medium">-${this.fmt(totalExpense)}</span>
        </div>`;
      tableWrap.appendChild(summary);

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'flex flex-col items-center py-16 text-center';
        empty.innerHTML = `
          <i data-lucide="search-x" class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4"></i>
          <p class="text-gray-500 dark:text-gray-400 mb-1">No transactions found</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">Try adjusting your search or filters.</p>`;
        tableWrap.appendChild(empty);
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // Table
      const table = document.createElement('table');
      table.className = 'w-full text-sm';
      const thead = document.createElement('thead');
      thead.className = 'bg-gray-50 dark:bg-gray-900 text-left';

      const mkTh = (label, field) => {
        const th = document.createElement('th');
        th.className = 'px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200';
        const arrow = state.sortField === field ? (state.sortDir === 'asc' ? ' ↑' : ' ↓') : '';
        th.innerHTML = `${label}${arrow}`;
        th.addEventListener('click', () => {
          if (state.sortField === field) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          else { state.sortField = field; state.sortDir = 'desc'; }
          render();
        });
        return th;
      };

      thead.appendChild(mkTh('Date', 'tanggal'));
      thead.appendChild(mkTh('Description', 'keterangan'));
      thead.appendChild(mkTh('Account', 'dompet'));
      thead.appendChild(mkTh('Category', 'kategori'));
      thead.appendChild(mkTh('Amount', 'jumlah'));
      thead.appendChild(mkTh('Type', 'tipe'));
      const actionsTh = document.createElement('th');
      actionsTh.className = 'px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right';
      actionsTh.textContent = 'Actions';
      thead.appendChild(actionsTh);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      tbody.className = 'divide-y divide-gray-100 dark:divide-gray-800';

      visible.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors';

        const account = accounts.find(a => a.id === t.dompet);
        const member  = members.find(m => m.id === t.pengeluar);
        const isIncome = t.tipe === 'masuk';
        const isTransfer = t.tipe === 'transfer';
        const amountColor = isIncome ? 'text-success-600' : isTransfer ? 'text-info-600' : 'text-danger-600';
        const sign = isIncome ? '+' : isTransfer ? '' : '-';
        const typeBadge = isIncome
          ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400">Income</span>'
          : isTransfer
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-400">Transfer</span>'
            : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-400">Expense</span>';

        tr.innerHTML = `
          <td class="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">${formatDate(t.tanggal, 'short')}</td>
          <td class="px-4 py-3">
            <p class="font-medium text-gray-900 dark:text-white">${t.keterangan || 'Untitled'}</p>
            ${t.catatan ? `<p class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">${t.catatan}</p>` : ''}
          </td>
          <td class="px-4 py-3 text-gray-700 dark:text-gray-300">${account?.nama || t.dompet || '—'}</td>
          <td class="px-4 py-3 text-gray-700 dark:text-gray-300">${t.kategori || '—'}</td>
          <td class="px-4 py-3 font-semibold ${amountColor} whitespace-nowrap">${sign}${this.fmt(t.jumlah)}</td>
          <td class="px-4 py-3">${typeBadge}</td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-1">
              <button class="txn-edit p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-id="${t.id}" title="Edit">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
              <button class="txn-delete p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-danger-500" data-id="${t.id}" title="Delete">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </td>`;
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);

      // Load more
      if (hasMore) {
        const loadMore = document.createElement('div');
        loadMore.className = 'px-4 py-3 text-center border-t border-gray-200 dark:border-gray-700';
        const btn = document.createElement('button');
        btn.className = 'text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium';
        btn.textContent = `Show more (${filtered.length - state.showCount} remaining)`;
        btn.addEventListener('click', () => { state.showCount += 25; render(); });
        loadMore.appendChild(btn);
        tableWrap.appendChild(loadMore);
      }

      // Wire edit/delete
      tableWrap.querySelectorAll('.txn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const txn = transactions.find(t => t.id === btn.dataset.id);
          if (txn) this.showTransactionModal(txn, accounts, members, categories, state);
        });
      });
      tableWrap.querySelectorAll('.txn-delete').forEach(btn => {
        btn.addEventListener('click', () => this.deleteTransaction(btn.dataset.id, state));
      });

      if (window.lucide) window.lucide.createIcons();
    };

    // Wire filter events
    const searchInput = searchRow.querySelector('#txn-search');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => { state.search = e.target.value; render(); }, 250);
    });
    typeSelect.addEventListener('change', (e) => { state.type = e.target.value; render(); });
    accountSelect.addEventListener('change', (e) => { state.account = e.target.value; render(); });
    categorySelect.addEventListener('change', (e) => { state.category = e.target.value; render(); });
    memberSelect.addEventListener('change', (e) => { state.member = e.target.value; render(); });

    // Initial render
    render();

    return container;
  }

  /* ---- Transaction Modal (Add / Edit) --------------------------- */

  showTransactionModal(existing, accounts, members, categories, filterState) {
    const isEdit = !!existing;
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl';

    const currency = getUserCurrency();
    const today = new Date().toISOString().slice(0, 10);

    // Form fields
    const form = document.createElement('form');
    form.className = 'p-6 space-y-4';
    form.innerHTML = `
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">${isEdit ? 'Edit Transaction' : 'New Transaction'}</h2>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select id="modal-type" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
            <option value="keluar">Expense</option>
            <option value="masuk">Income</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
          <input type="date" id="modal-date" value="${existing?.tanggal || today}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
        <input type="text" id="modal-desc" value="${existing?.keterangan || ''}" placeholder="e.g., Coffee, Grocery shopping" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 text-sm">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (${currency})</label>
        <input type="number" id="modal-amount" value="${existing?.jumlah || ''}" min="0" step="any" placeholder="0" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 text-sm">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
          <select id="modal-account" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
            ${accounts.map(a => `<option value="${a.id}" ${existing?.dompet === a.id ? 'selected' : ''}>${a.nama}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <input type="text" id="modal-category" list="modal-category-list" value="${existing?.kategori || ''}" placeholder="e.g., Food & Dining" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 text-sm">
          <datalist id="modal-category-list">
            ${categories.map(c => `<option value="${c}">`).join('')}
          </datalist>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recorded By</label>
        <select id="modal-member" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm">
          <option value="">— None —</option>
          ${members.map(m => `<option value="${m.id}" ${existing?.pengeluar === m.id ? 'selected' : ''}>${m.nama}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea id="modal-notes" rows="2" placeholder="Optional notes..." class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 text-sm resize-none">${existing?.catatan || ''}</textarea>
      </div>

      <div id="modal-error" class="hidden text-sm text-danger-600 bg-danger-50 dark:bg-danger-900/20 rounded-lg p-3"></div>

      <div class="flex justify-end gap-3 pt-2">
        <button type="button" id="modal-cancel" class="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
        <button type="submit" class="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">${isEdit ? 'Save Changes' : 'Add Transaction'}</button>
      </div>`;

    // Pre-fill type
    if (existing) {
      form.querySelector('#modal-type').value = existing.tipe || 'keluar';
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {
        tanggal:    form.querySelector('#modal-date').value,
        keterangan: form.querySelector('#modal-desc').value.trim(),
        jumlah:     parseFloat(form.querySelector('#modal-amount').value) || 0,
        tipe:       form.querySelector('#modal-type').value,
        dompet:     form.querySelector('#modal-account').value,
        kategori:   form.querySelector('#modal-category').value.trim(),
        pengeluar:  form.querySelector('#modal-member').value,
        catatan:    form.querySelector('#modal-notes').value.trim(),
      };

      const validation = validateTransaction(data);
      if (!validation.valid) {
        const errDiv = form.querySelector('#modal-error');
        errDiv.textContent = validation.errors.join('. ');
        errDiv.classList.remove('hidden');
        return;
      }

      // Account balance adjustment
      let txns = [...appState.get('transactions')];
      let accts = [...appState.get('accounts')];

      if (isEdit) {
        // Reverse old transaction effect
        const old = txns.find(t => t.id === existing.id);
        if (old) {
          const oldAmt = parseFloat(old.jumlah) || 0;
          const oldAcct = accts.find(a => a.id === old.dompet);
          if (oldAcct) {
            if (old.tipe === 'masuk') oldAcct.saldo = (parseFloat(oldAcct.saldo) || 0) - oldAmt;
            else if (old.tipe === 'keluar') oldAcct.saldo = (parseFloat(oldAcct.saldo) || 0) + oldAmt;
          }
        }
        // Apply new transaction
        txns = txns.map(t => t.id === existing.id ? { ...t, ...data, id: existing.id } : t);
      } else {
        // Create new
        const newTxn = createTransaction(data);
        txns.push(newTxn);
      }

      // Apply balance change
      const newAmt = data.jumlah;
      const acct = accts.find(a => a.id === data.dompet);
      if (acct && data.tipe !== 'transfer') {
        if (data.tipe === 'masuk') acct.saldo = (parseFloat(acct.saldo) || 0) + newAmt;
        else if (data.tipe === 'keluar') acct.saldo = (parseFloat(acct.saldo) || 0) - newAmt;
      }

      // Save
      appState.set('transactions', txns);
      appState.set('accounts', accts);
      saveData();

      toast.success(isEdit ? 'Transaction updated.' : 'Transaction saved.');
      overlay.remove();

      // Re-render transactions page
      this.renderContent();
    });

    form.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());

    modal.appendChild(form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus first field
    setTimeout(() => form.querySelector('#modal-desc')?.focus(), 100);
    if (window.lucide) window.lucide.createIcons();
  }

  /* ---- Delete Transaction --------------------------------------- */

  async deleteTransaction(txnId, filterState) {
    const confirmed = await appState.confirm({
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction? This will reverse the balance change on the associated account.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });

    if (!confirmed) return;

    const txns = [...appState.get('transactions')];
    const accts = [...appState.get('accounts')];
    const txn = txns.find(t => t.id === txnId);

    if (txn) {
      // Reverse balance effect
      const amt = parseFloat(txn.jumlah) || 0;
      const acct = accts.find(a => a.id === txn.dompet);
      if (acct && txn.tipe !== 'transfer') {
        if (txn.tipe === 'masuk') acct.saldo = (parseFloat(acct.saldo) || 0) - amt;
        else if (txn.tipe === 'keluar') acct.saldo = (parseFloat(acct.saldo) || 0) + amt;
      }

      const filtered = txns.filter(t => t.id !== txnId);
      appState.set('transactions', filtered);
      appState.set('accounts', accts);
      saveData();

      toast.success('Transaction deleted.');
      this.renderContent();
    }
  }

  /* ================================================================ */
  /*  OTHER TABS (placeholders for later phases)                     */
  /* ================================================================ */

  renderAccounts() {
    const accounts = appState.get('accounts') || [];
    const currency = getUserCurrency();
    const nwData = calculateNetWorth(accounts);
    const totalAssets = calculateTotalAssets(accounts);
    const totalLiabilities = calculateTotalLiabilities(accounts);
    const availableCash = calculateAvailableCash(accounts);

    // Group by classification
    const liquid = getAccountsByClassification(accounts, 'liquid');
    const investments = getAccountsByClassification(accounts, 'investment');
    const receivables = getAccountsByClassification(accounts, 'receivable');
    const liabilities = getAccountsByClassification(accounts, 'liability');
    const other = getAccountsByClassification(accounts, 'other');

    const el = document.createElement('div');
    el.className = 'animate-fade-in space-y-6';

    // -- Header --
    el.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Where your money lives.</p>
        </div>
        <button id="btn-add-account" class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors">
          <i data-lucide="plus" class="w-4 h-4"></i> Add Account
        </button>
      </div>`;

    // -- Summary cards --
    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4';
    [
      { label: 'Available Cash', value: availableCash, color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/20' },
      { label: 'Total Assets', value: totalAssets, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
      { label: 'Total Liabilities', value: totalLiabilities, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
      { label: 'Net Worth', value: nwData.total ?? nwData, color: (nwData.total ?? nwData) >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: (nwData.total ?? nwData) >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-rose-50 dark:bg-rose-900/20' },
    ].forEach(m => {
      const card = document.createElement('div');
      card.className = `${m.bg} rounded-xl p-4 border border-gray-100 dark:border-gray-800`;
      card.innerHTML = `<p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${m.label}</p><p class="text-xl font-bold ${m.color} mt-1">${this.fmt(m.value)}</p>`;
      summaryGrid.appendChild(card);
    });
    el.appendChild(summaryGrid);

    // -- Account sections --
    const sections = [
      { title: 'Liquid Money', icon: 'wallet', accounts: liquid, emptyText: 'No liquid accounts. Add cash, bank, or e-wallet accounts.' },
      { title: 'Investments', icon: 'trending-up', accounts: investments, emptyText: 'No investment accounts.' },
      { title: 'Money Owed to You', icon: 'hand-coins', accounts: receivables, emptyText: 'No receivable accounts.' },
      { title: 'Money You Owe', icon: 'credit-card', accounts: liabilities, emptyText: 'No liability accounts.' },
    ];
    if (other.length > 0) sections.push({ title: 'Other', icon: 'folder', accounts: other, emptyText: '' });

    sections.forEach(sec => {
      const section = document.createElement('div');
      section.className = 'space-y-3';
      
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'flex items-center justify-between';
      sectionHeader.innerHTML = `
        <div class="flex items-center gap-2">
          <i data-lucide="${sec.icon}" class="w-4 h-4 text-gray-400"></i>
          <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">${sec.title}</h2>
          <span class="text-xs text-gray-400 dark:text-gray-500">(${sec.accounts.length})</span>
        </div>`;
      section.appendChild(sectionHeader);

      if (sec.accounts.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'py-6 text-center text-sm text-gray-400 dark:text-gray-500';
        empty.textContent = sec.emptyText;
        section.appendChild(empty);
      } else {
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';
        sec.accounts.forEach(acc => {
          grid.appendChild(this._buildAccountCard(acc, currency));
        });
        section.appendChild(grid);
      }

      el.appendChild(section);
    });

    // -- Bind Add Account --
    setTimeout(() => {
      const btnAdd = el.querySelector('#btn-add-account');
      if (btnAdd) btnAdd.addEventListener('click', () => this._showAccountModal(null, currency));
    }, 0);

    return el;
  }

  _buildAccountCard(acc, currency) {
    const classification = classifyAccount(acc);
    const balance = parseFloat(acc.saldo) || 0;
    const isLiability = classification === 'liability';
    const classificationLabel = { liquid: 'Liquid', investment: 'Investment', receivable: 'Receivable', liability: 'Liability', other: 'Other' }[classification] || 'Other';
    const classificationColor = { liquid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', investment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', receivable: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', liability: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }[classification] || '';

    const typeLabel = t(`accounts.accountTypes.${normalizeAccountType(acc.jenis)}`) || acc.jenis;

    const el = document.createElement('div');
    el.className = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow';
    el.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <i data-lucide="${acc.icon || 'wallet'}" class="w-4 h-4 text-gray-500 dark:text-gray-400"></i>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${acc.nama}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">${typeLabel}</p>
          </div>
        </div>
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${classificationColor} flex-shrink-0">${classificationLabel}</span>
      </div>
      <p class="text-lg font-bold ${isLiability ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'}">${this.fmt(balance)}</p>
      <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <button class="flex-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-1" data-action="edit" data-id="${acc.id}">Edit</button>
        <span class="text-gray-200 dark:text-gray-700">|</span>
        <button class="flex-1 text-xs font-medium text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 transition-colors py-1" data-action="delete" data-id="${acc.id}">Delete</button>
      </div>`;

    // Bind actions
    setTimeout(() => {
      el.querySelector('[data-action="edit"]')?.addEventListener('click', () => this._showAccountModal(acc, currency));
      el.querySelector('[data-action="delete"]')?.addEventListener('click', () => this._confirmDeleteAccount(acc));
    }, 0);

    return el;
  }

  _showAccountModal(existingAcc, currency) {
    const isEdit = !!existingAcc;
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4';
    modal.innerHTML = `
      <h3 class="text-lg font-bold text-gray-900 dark:text-white">${isEdit ? 'Edit Account' : 'Add Account'}</h3>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Account Name</label>
          <input id="acc-name" type="text" value="${isEdit ? existingAcc.nama : ''}" placeholder="e.g., Chase Checking" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Account Type</label>
          <select id="acc-type" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
            <option value="cash" ${isEdit && existingAcc.jenis === 'cash' ? 'selected' : ''}>Cash</option>
            <option value="bank" ${isEdit && existingAcc.jenis === 'bank' ? 'selected' : ''}>Bank Account</option>
            <option value="tabungan" ${isEdit && existingAcc.jenis === 'tabungan' ? 'selected' : ''}>Savings</option>
            <option value="e-wallet" ${isEdit && existingAcc.jenis === 'e-wallet' ? 'selected' : ''}>E-Wallet</option>
            <option value="investasi" ${isEdit && existingAcc.jenis === 'investasi' ? 'selected' : ''}>Investment</option>
            <option value="kartu kredit" ${isEdit && existingAcc.jenis === 'kartu kredit' ? 'selected' : ''}>Credit Card</option>
            <option value="utang" ${isEdit && existingAcc.jenis === 'utang' ? 'selected' : ''}>Loan / Debt</option>
            <option value="piutang" ${isEdit && existingAcc.jenis === 'piutang' ? 'selected' : ''}>Receivable</option>
            <option value="lainnya" ${isEdit && existingAcc.jenis === 'lainnya' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Balance</label>
          <input id="acc-balance" type="number" step="any" value="${isEdit ? existingAcc.saldo : '0'}" placeholder="0" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
          <p class="text-[11px] text-gray-400 mt-1">Use negative for credit cards and loans.</p>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Currency</label>
          <select id="acc-currency" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
            ${Object.entries(CURRENCIES).map(([code, c]) =>
              `<option value="${code}" ${(isEdit ? existingAcc.mataUang : currency) === code ? 'selected' : ''}>${c.symbol} ${c.name} (${code})</option>`
            ).join('')}
          </select>
        </div>
        <div id="acc-error" class="text-sm text-rose-600 hidden"></div>
      </div>
      <div class="flex gap-3 pt-2">
        <button id="acc-cancel" class="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
        <button id="acc-save" class="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors">${isEdit ? 'Save Changes' : 'Add Account'}</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus first input
    setTimeout(() => modal.querySelector('#acc-name')?.focus(), 50);

    // Cancel
    modal.querySelector('#acc-cancel').addEventListener('click', () => overlay.remove());

    // Save
    modal.querySelector('#acc-save').addEventListener('click', () => {
      const name = modal.querySelector('#acc-name').value.trim();
      const type = modal.querySelector('#acc-type').value;
      const balance = parseFloat(modal.querySelector('#acc-balance').value) || 0;
      const accCurrency = modal.querySelector('#acc-currency').value;
      const errorEl = modal.querySelector('#acc-error');

      const testAcc = { nama: name, jenis: type, saldo: balance };
      const validation = validateAccount(testAcc);
      if (!validation.valid) {
        errorEl.textContent = validation.errors.join('. ');
        errorEl.classList.remove('hidden');
        return;
      }

      let accounts = [...(appState.get('accounts') || [])];
      if (isEdit) {
        accounts = accounts.map(a => a.id === existingAcc.id ? { ...a, nama: name, jenis: type, saldo: balance, mataUang: accCurrency } : a);
      } else {
        accounts.push(createAccount({ nama: name, jenis: type, saldo: balance, mataUang: accCurrency }));
      }
      appState.set('accounts', accounts);
      saveData();
      overlay.remove();
      toast.success(isEdit ? 'Account updated.' : 'Account added.');
      this.renderContent();
    });
  }

  _confirmDeleteAccount(acc) {
    const transactions = appState.get('transactions') || [];
    const linkedTxns = transactions.filter(t => t.dompet === acc.id);

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4';
    modal.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <i data-lucide="trash-2" class="w-5 h-5 text-rose-600 dark:text-rose-400"></i>
        </div>
        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Delete Account</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">This cannot be undone.</p>
        </div>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-300">Are you sure you want to delete <strong>${acc.nama}</strong>?</p>
      ${linkedTxns.length > 0 ? `<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
        <p class="text-xs font-medium text-amber-700 dark:text-amber-300">This account has ${linkedTxns.length} linked transaction${linkedTxns.length > 1 ? 's' : ''}. Deleting it will remove the account reference from those transactions.</p>
      </div>` : ''}
      <div class="flex gap-3 pt-1">
        <button id="del-cancel" class="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
        <button id="del-confirm" class="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-colors">Delete</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector('#del-cancel').addEventListener('click', () => overlay.remove());
    modal.querySelector('#del-confirm').addEventListener('click', () => {
      let accounts = (appState.get('accounts') || []).filter(a => a.id !== acc.id);
      appState.set('accounts', accounts);
      saveData();
      overlay.remove();
      toast.success('Account deleted.');
      this.renderContent();
    });
  }

  /* ================================================================ */
  /*  TRANSFERS PAGE                                                  */
  /* ================================================================ */

  _totalTransfersIn(transfers, accounts) {
    // Sum amounts where this account was the destination
    let total = 0;
    transfers.forEach(t => {
      if (t.dompetTujuan) {
        total += parseFloat(t.jumlah) || 0;
      }
    });
    return total;
  }

  renderTransfers() {
    const container = document.createElement('div');
    container.className = 'space-y-6';

    const allTxns     = appState.get('transactions') || [];
    const accounts    = appState.get('accounts') || [];
    const currency    = getUserCurrency();
    const year        = this._period.year;
    const month       = this._period.month;

    const transfers = allTxns.filter(t => t.tipe === 'transfer');

    // This month transfers
    const monthTransfers = transfers.filter(t => {
      const d = new Date(t.tanggal);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const totalOut  = monthTransfers.reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);
    const totalIn   = this._totalTransfersIn(monthTransfers, accounts);
    const netFlow   = totalIn - totalOut;

    /* ---- HEADER ---- */
    const header = document.createElement('div');
    header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
    header.innerHTML = `
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${t('transfers.title')}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${t('transfers.subtitle')}</p>
      </div>
      <button id="add-transfer-btn" class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
        <i data-lucide="arrow-left-right" class="w-4 h-4"></i>
        ${t('transfers.newTransfer')}
      </button>`;
    container.appendChild(header);

    /* ---- SUMMARY CARDS ---- */
    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'grid grid-cols-1 sm:grid-cols-3 gap-4';
    const summaryCards = [
      { label: t('transfers.totalOut'), value: this.fmt(totalOut), color: 'text-danger-600', bg: 'bg-danger-50 dark:bg-danger-900/20', icon: 'arrow-up-right' },
      { label: t('transfers.totalIn'), value: this.fmt(totalIn), color: 'text-success-600', bg: 'bg-success-50 dark:bg-success-900/20', icon: 'arrow-down-left' },
      { label: t('transfers.netFlow'), value: this.fmt(netFlow), color: netFlow >= 0 ? 'text-success-600' : 'text-danger-600', bg: netFlow >= 0 ? 'bg-success-50 dark:bg-success-900/20' : 'bg-danger-50 dark:bg-danger-900/20', icon: 'trending-up' },
    ];
    summaryCards.forEach(c => {
      const el = document.createElement('div');
      el.className = `flex items-center gap-3 p-4 rounded-xl ${c.bg}`;
      el.innerHTML = `
        <div class="w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center">
          <i data-lucide="${c.icon}" class="w-5 h-5 ${c.color}"></i>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">${c.label}</p>
          <p class="text-lg font-bold ${c.color}">${c.value}</p>
        </div>`;
      summaryGrid.appendChild(el);
    });
    container.appendChild(summaryGrid);

    /* ---- FILTERS ---- */
    const filterBar = document.createElement('div');
    filterBar.className = 'flex flex-col sm:flex-row gap-3';
    filterBar.innerHTML = `
      <div class="relative flex-1">
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"></i>
        <input type="text" id="tf-search" placeholder="${t('transfers.searchPlaceholder')}" class="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500">
      </div>
      <select id="tf-account" class="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
        <option value="">${t('transfers.allAccounts')}</option>
        ${accounts.map(a => `<option value="${a.id}">${a.nama}</option>`).join('')}
      </select>`;
    container.appendChild(filterBar);

    /* ---- TRANSFER LIST ---- */
    const listEl = document.createElement('div');
    listEl.className = 'space-y-2';
    container.appendChild(listEl);

    const renderList = (searchTerm = '', accountFilter = '') => {
      listEl.innerHTML = '';
      let filtered = transfers;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filtered = filtered.filter(t =>
          (t.keterangan || '').toLowerCase().includes(q) ||
          (t.catatan || '').toLowerCase().includes(q)
        );
      }
      if (accountFilter) {
        filtered = filtered.filter(t => t.dompet === accountFilter || t.dompetTujuan === accountFilter);
      }

      // Sort newest first
      filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="flex flex-col items-center py-16 text-center">
            <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <i data-lucide="arrow-left-right" class="w-8 h-8 text-gray-300 dark:text-gray-600"></i>
            </div>
            <p class="text-gray-500 dark:text-gray-400 font-medium">${t('transfers.empty')}</p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">${t('transfers.emptyDescription')}</p>
          </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      // Group by month
      const groups = {};
      filtered.forEach(t => {
        const key = t.tanggal.slice(0, 7); // YYYY-MM
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });

      Object.entries(groups).forEach(([monthKey, txns]) => {
        const [y, m] = monthKey.split('-');
        const monthLabel = new Date(y, parseInt(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const groupHeader = document.createElement('div');
        groupHeader.className = 'pt-4 pb-1 px-1';
        groupHeader.innerHTML = `<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">${monthLabel}</p>`;
        listEl.appendChild(groupHeader);

        txns.forEach(txn => {
          const fromAcc = accounts.find(a => a.id === txn.dompet);
          const toAcc   = accounts.find(a => a.id === txn.dompetTujuan);
          const fromName = fromAcc ? fromAcc.nama : 'Unknown';
          const toName   = toAcc   ? toAcc.nama : 'Unknown';
          const amount   = parseFloat(txn.jumlah) || 0;
          const dateStr  = formatDate(txn.tanggal, 'short');

          const row = document.createElement('div');
          row.className = 'flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors';
          row.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-info-50 dark:bg-info-900/20 flex items-center justify-center flex-shrink-0">
              <i data-lucide="arrow-left-right" class="w-5 h-5 text-info-600"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${txn.keterangan || t('transfers.title')}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                <span class="font-medium text-gray-700 dark:text-gray-300">${fromName}</span>
                <span class="mx-1">→</span>
                <span class="font-medium text-gray-700 dark:text-gray-300">${toName}</span>
              </p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-sm font-semibold text-info-600">${this.fmt(amount)}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500">${dateStr}</p>
            </div>`;
          listEl.appendChild(row);
        });
      });

      if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    renderList();

    // Wire filters
    const searchInput = container.querySelector('#tf-search');
    const accountSelect = container.querySelector('#tf-account');
    const applyFilters = () => renderList(searchInput.value, accountSelect.value);
    let tfSearchTimeout;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(tfSearchTimeout);
      tfSearchTimeout = setTimeout(() => applyFilters(), 250);
    });
    accountSelect?.addEventListener('change', applyFilters);

    // Wire Add Transfer button → opens Smart Add in transfer mode
    container.querySelector('#add-transfer-btn')?.addEventListener('click', () => this.showSmartAddModal('transfer'));

    requestAnimationFrame(() => { if (typeof lucide !== 'undefined') lucide.createIcons(); });

    return container;
  }

  renderBudgets() {
    const container = document.createElement('div');
    container.className = 'space-y-6';

    const budgets   = appState.get('budgets') || [];
    const transactions = appState.get('transactions') || [];
    const currency  = getUserCurrency();
    const year      = this._period.year;
    const month     = this._period.month;

    // Calculate usage for all budgets
    const usages = calculateAllBudgetUsages(budgets, transactions, year, month);
    const summary = getBudgetSummary(usages);

    // Category display names (Indonesian → English)
    const categoryNames = {
      'Makan & Jajan': 'Food & Dining',
      'Transportasi': 'Transportation',
      'Belanja Rumah': 'Household',
      'Anak & Sekolah': 'Kids & Education',
      'Tagihan & Listrik': 'Bills & Utilities',
      'Kesehatan': 'Health',
      'Hiburan': 'Entertainment',
      'Gaji': 'Salary',
      'Bonus': 'Bonus',
      'Bisnis': 'Business',
      'Komisi': 'Commission',
      'Pendapatan Lain': 'Other Income',
      'Tabungan': 'Savings',
      'Bayar Utang': 'Debt Payment',
    };

    const categoryIcons = {
      'Makan & Jajan': 'utensils',
      'Transportasi': 'car',
      'Belanja Rumah': 'shopping-basket',
      'Anak & Sekolah': 'baby',
      'Tagihan & Listrik': 'receipt',
      'Kesehatan': 'heart-pulse',
      'Hiburan': 'popcorn',
      'Gaji': 'wallet',
      'Bonus': 'gift',
      'Tabungan': 'piggy-bank',
      'Bayar Utang': 'circle-minus',
    };

    function displayName(cat) { return categoryNames[cat] || cat; }
    function displayIcon(cat) { return categoryIcons[cat] || 'tag'; }

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
    header.innerHTML = `
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${t('budgets.title')}</h1>
        <p class="text-gray-500 dark:text-gray-400">${t('budgets.subtitle')}</p>
      </div>`;

    const addBtn = document.createElement('button');
    addBtn.className = 'flex items-center gap-2 px-4 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium ';
    addBtn.innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i>' + t('budgets.addBudget');
    addBtn.addEventListener('click', () => this.showBudgetModal());
    header.appendChild(addBtn);
    container.appendChild(header);

    // --- Summary Cards ---
    if (budgets.length > 0) {
      const summaryGrid = document.createElement('div');
      summaryGrid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4';

      const summaryMetrics = [
        { label: t('budgets.totalLimit'), value: this.fmt(summary.totalLimit), color: 'text-gray-900 dark:text-white' },
        { label: t('budgets.totalSpent'), value: this.fmt(summary.totalUsed), color: summary.overBudgetCount > 0 ? 'text-danger-600' : 'text-gray-900 dark:text-white' },
        { label: t('budgets.remaining'), value: this.fmt(summary.totalRemaining), color: summary.totalRemaining < 0 ? 'text-danger-600' : 'text-success-600' },
        { label: 'Progress', value: summary.overallPercentage + '%', color: 'text-gray-900 dark:text-white' },
      ];

      summaryMetrics.forEach(m => {
        const el = card();
        el.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">${m.label}</p><p class="text-xl font-bold ${m.color} mt-1">${m.value}</p>`;
        summaryGrid.appendChild(el);
      });

      // Over-budget badge
      if (summary.overBudgetCount > 0) {
        const alertCard = card();
        alertCard.className += ' border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/10';
        alertCard.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
              <i data-lucide="alert-triangle" class="w-5 h-5 text-danger-600"></i>
            </div>
            <div>
              <p class="font-semibold text-danger-600">${summary.overBudgetCount} categor${summary.overBudgetCount === 1 ? 'y' : 'ies'} over budget</p>
              <p class="text-sm text-danger-500">You've exceeded your spending limit.</p>
            </div>
          </div>`;
        summaryGrid.appendChild(alertCard);
      }

      container.appendChild(summaryGrid);
    }

    // --- Budget Category Cards ---
    if (budgets.length === 0) {
      const emptyCard = card();
      emptyCard.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <i data-lucide="pie-chart" class="w-8 h-8 text-gray-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${t('budgets.empty')}</h3>
          <p class="text-gray-500 dark:text-gray-400 max-w-md mb-6">${t('budgets.emptyDescription')}</p>
          <button class="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
            <i data-lucide="plus" class="w-4 h-4"></i>${t('budgets.createFirst')}
          </button>
        </div>`;
      emptyCard.querySelector('button')?.addEventListener('click', () => this.showBudgetModal());
      container.appendChild(emptyCard);
    } else {
      const budgetGrid = document.createElement('div');
      budgetGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

      usages.forEach((usage, idx) => {
        const budget = budgets[idx];
        const el = card();
        const barColor = usage.isOverBudget ? 'bg-danger-500' : usage.status === 'warning' ? 'bg-warning-500' : 'bg-success-500';
        const statusBadge = usage.isOverBudget
          ? '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 dark:bg-danger-900/30 text-danger-600">Over Budget</span>'
          : usage.status === 'warning'
          ? '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-600">Approaching Limit</span>'
          : '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-600">On Track</span>';

        el.innerHTML = `
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <i data-lucide="${displayIcon(usage.category)}" class="w-5 h-5 text-primary-600"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-900 dark:text-white text-sm">${displayName(usage.category)}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${usage.category}</p>
              </div>
            </div>
            ${statusBadge}
          </div>
          <div class="mb-3">
            <div class="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full ${barColor} rounded-full transition-all" style="width: ${Math.min(usage.percentage, 100)}%"></div>
            </div>
          </div>
          <div class="flex justify-between items-baseline mb-2">
            <span class="text-lg font-bold text-gray-900 dark:text-white">${this.fmt(usage.used)}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">of ${this.fmt(usage.limit)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs ${usage.remaining < 0 ? 'text-danger-600' : 'text-success-600'} font-medium">
              ${usage.remaining >= 0 ? this.fmt(usage.remaining) + ' remaining' : this.fmt(Math.abs(usage.remaining)) + ' over'}
            </span>
            <span class="text-xs text-gray-400">${usage.percentage}%</span>
          </div>
          <div class="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button class="flex-1 text-xs text-center py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors" data-edit="${idx}">${t('budgets.editLimit')}</button>
            <button class="flex-1 text-xs text-center py-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20 text-danger-600 transition-colors" data-delete="${idx}">${t('budgets.delete')}</button>
          </div>`;

        el.querySelector('[data-edit]')?.addEventListener('click', () => this.showBudgetModal(budget));
        el.querySelector('[data-delete]')?.addEventListener('click', () => this.showBudgetDeleteConfirm(budget));
        budgetGrid.appendChild(el);
      });

      container.appendChild(budgetGrid);
    }

    return container;
  }

  /* ---- Budget Modal -------------------------------------------- */

  showBudgetModal(existing = null) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const isEdit = !!existing;
    const transactions = appState.get('transactions') || [];
    const budgets = appState.get('budgets') || [];

    // Get all unique expense categories from transactions
    const expenseCategories = [...new Set(
      transactions.filter(t => t.tipe === 'keluar').map(t => t.kategori).filter(Boolean)
    )].sort();

    // Category display names
    const categoryNames = {
      'Makan & Jajan': 'Food & Dining',
      'Transportasi': 'Transportation',
      'Belanja Rumah': 'Household',
      'Anak & Sekolah': 'Kids & Education',
      'Tagihan & Listrik': 'Bills & Utilities',
      'Kesehatan': 'Health',
      'Hiburan': 'Entertainment',
      'Tabungan': 'Savings',
      'Bayar Utang': 'Debt Payment',
    };

    // Remove categories that already have budgets (unless editing)
    const usedCategories = budgets.map(b => b.kategori);
    const availableCategories = expenseCategories.filter(c => isEdit ? true : !usedCategories.includes(c));

    // If editing, ensure the current category is in the list
    if (isEdit && existing && !availableCategories.includes(existing.kategori)) {
      availableCategories.unshift(existing.kategori);
    }

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md';
    modal.innerHTML = `
      <div class="p-6">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">${isEdit ? t('budgetForm.editTitle') : t('budgetForm.title')}</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('budgetForm.category')}</label>
            <select id="budget-category" class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select category...</option>
              ${availableCategories.map(c => `<option value="${c}" ${isEdit && existing?.kategori === c ? 'selected' : ''}>${categoryNames[c] || c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('budgetForm.limit')}</label>
            <input id="budget-amount" type="number" min="0" step="1000"
              value="${isEdit ? existing?.anggaran || '' : ''}"
              placeholder="${t('budgetForm.limitPlaceholder')}"
              class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
          </div>
        </div>
        <div id="budget-error" class="hidden mt-3 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg text-sm text-danger-600"></div>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button id="budget-cancel" class="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">${t('common.cancel')}</button>
        <button id="budget-save" class="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">${t('budgetForm.save')}</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    overlay.querySelector('#budget-cancel')?.addEventListener('click', () => overlay.remove());

    overlay.querySelector('#budget-save')?.addEventListener('click', () => {
      const kategori = overlay.querySelector('#budget-category').value;
      const anggaran = overlay.querySelector('#budget-amount').value;
      const errorEl = overlay.querySelector('#budget-error');

      const validation = validateBudget({ kategori, anggaran });
      if (!validation.valid) {
        errorEl.textContent = validation.errors.join('. ');
        errorEl.classList.remove('hidden');
        return;
      }

      const allBudgets = [...(appState.get('budgets') || [])];

      if (isEdit) {
        const idx = allBudgets.findIndex(b => b.id === existing.id);
        if (idx >= 0) {
          allBudgets[idx] = { ...allBudgets[idx], kategori, anggaran: parseFloat(anggaran) };
        }
      } else {
        const newBudget = createBudget({ kategori, anggaran: parseFloat(anggaran) });
        allBudgets.push(newBudget);
      }

      appState.set('budgets', allBudgets);
      saveData();
      overlay.remove();
      toast.success(t('alerts.budgetSaved'));
      this.renderContent();
    });
  }

  /* ---- Budget Delete Confirm ------------------------------------ */

  showBudgetDeleteConfirm(budget) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const categoryNames = {
      'Makan & Jajan': 'Food & Dining',
      'Transportasi': 'Transportation',
      'Belanja Rumah': 'Household',
      'Anak & Sekolah': 'Kids & Education',
      'Tagihan & Listrik': 'Bills & Utilities',
      'Kesehatan': 'Health',
      'Hiburan': 'Entertainment',
      'Tabungan': 'Savings',
      'Bayar Utang': 'Debt Payment',
    };

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm';
    modal.innerHTML = `
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
            <i data-lucide="trash-2" class="w-5 h-5 text-danger-600"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">${t('budgets.delete')}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">${categoryNames[budget.kategori] || budget.kategori}</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">${t('confirm.deleteBudget')}</p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button id="del-cancel" class="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">${t('common.cancel')}</button>
        <button id="del-confirm" class="px-5 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors text-sm font-medium">${t('common.delete')}</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    overlay.querySelector('#del-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('#del-confirm')?.addEventListener('click', () => {
      const allBudgets = (appState.get('budgets') || []).filter(b => b.id !== budget.id);
      appState.set('budgets', allBudgets);
      saveData();
      overlay.remove();
      toast.success(t('alerts.budgetSaved'));
      this.renderContent();
    });
  }
  renderGoals() {
    const container = document.createElement('div');
    container.className = 'space-y-6';

    const goals         = appState.get('goals') || [];
    const transactions  = appState.get('transactions') || [];
    const currency      = getUserCurrency();

    // Calculate progress for all goals
    const allProgress = calculateAllGoalsProgress(goals);
    const summary = getGoalsSummary(allProgress);

    // Goal icon mapping
    const goalIcons = {
      'target': 'target', 'shield': 'shield', 'plane': 'plane', 'home': 'home',
      'car': 'car', 'graduation-cap': 'graduation-cap', 'baby': 'baby',
      'heart': 'heart', 'laptop': 'laptop', 'gift': 'gift',
    };
    function goalIcon(icon) { return goalIcons[icon] || 'target'; }

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
    header.innerHTML = `
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${t('goals.title')}</h1>
        <p class="text-gray-500 dark:text-gray-400">${t('goals.subtitle')}</p>
      </div>`;

    const addBtn = document.createElement('button');
    addBtn.className = 'flex items-center gap-2 px-4 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium ';
    addBtn.innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i>' + t('goals.addGoal');
    addBtn.addEventListener('click', () => this.showGoalModal());
    header.appendChild(addBtn);
    container.appendChild(header);

    // --- Summary ---
    if (goals.length > 0) {
      const summaryGrid = document.createElement('div');
      summaryGrid.className = 'grid grid-cols-2 lg:grid-cols-4 gap-4';

      const metrics = [
        { label: 'Total Goals', value: summary.totalCount, color: 'text-gray-900 dark:text-white' },
        { label: 'Total Target', value: this.fmt(summary.totalTarget), color: 'text-gray-900 dark:text-white' },
        { label: 'Total Saved', value: this.fmt(summary.totalCurrent), color: 'text-success-600' },
        { label: 'Completed', value: summary.completedCount + ' of ' + summary.totalCount, color: summary.completedCount > 0 ? 'text-success-600' : 'text-gray-900 dark:text-white' },
      ];

      metrics.forEach(m => {
        const el = card();
        el.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400">${m.label}</p><p class="text-xl font-bold ${m.color} mt-1">${m.value}</p>`;
        summaryGrid.appendChild(el);
      });

      container.appendChild(summaryGrid);
    }

    // --- Goal Cards ---
    if (goals.length === 0) {
      const emptyCard = card();
      emptyCard.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <i data-lucide="target" class="w-8 h-8 text-gray-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">${t('goals.empty')}</h3>
          <p class="text-gray-500 dark:text-gray-400 max-w-md mb-6">${t('goals.emptyDescription')}</p>
          <button class="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
            <i data-lucide="plus" class="w-4 h-4"></i>${t('goals.createFirst')}
          </button>
        </div>`;
      emptyCard.querySelector('button')?.addEventListener('click', () => this.showGoalModal());
      container.appendChild(emptyCard);
    } else {
      // Separate completed and active goals
      const activeGoals = allProgress.filter(g => !g.isComplete);
      const completedGoals = allProgress.filter(g => g.isComplete);

      const goalGrid = document.createElement('div');
      goalGrid.className = 'space-y-6';

      // Active goals section
      if (activeGoals.length > 0) {
        const section = document.createElement('div');
        section.innerHTML = `<h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active Goals (${activeGoals.length})</h2>`;
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3';

        activeGoals.forEach(progress => {
          const goal = goals.find(g => g.nama === progress.name);
          grid.appendChild(this.buildGoalCard(progress, goal, currency, goalIcon));
        });

        section.appendChild(grid);
        goalGrid.appendChild(section);
      }

      // Completed goals section
      if (completedGoals.length > 0) {
        const section = document.createElement('div');
        section.innerHTML = `<h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completed (${completedGoals.length})</h2>`;
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3';

        completedGoals.forEach(progress => {
          const goal = goals.find(g => g.nama === progress.name);
          grid.appendChild(this.buildGoalCard(progress, goal, currency, goalIcon));
        });

        section.appendChild(grid);
        goalGrid.appendChild(section);
      }

      container.appendChild(goalGrid);
    }

    return container;
  }

  /* ---- Goal Card ------------------------------------------------ */

  buildGoalCard(progress, goal, currency, goalIconFn) {
    const el = card();
    const barColor = progress.isComplete ? 'bg-success-500' : progress.percentage >= 75 ? 'bg-success-500' : progress.percentage >= 50 ? 'bg-primary-500' : 'bg-warning-500';

    // Status badge
    let statusBadge = '';
    if (progress.isComplete) {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-600">Completed</span>';
    } else if (progress.percentage >= 75) {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-600">Near Complete</span>';
    } else if (progress.percentage >= 50) {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-600">On Track</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 dark:bg-warning-900/30 text-warning-600">In Progress</span>';
    }

    // Target date
    let targetDateHtml = '';
    if (goal?.targetDate) {
      const targetDate = new Date(goal.targetDate);
      const now = new Date();
      const daysRemaining = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
      const dateStr = formatDate(goal.targetDate, 'medium');
      if (!progress.isComplete) {
        const urgency = daysRemaining <= 30 ? 'text-danger-600' : daysRemaining <= 90 ? 'text-warning-600' : 'text-gray-500 dark:text-gray-400';
        targetDateHtml = `<p class="text-xs ${urgency}">Target: ${dateStr}${daysRemaining > 0 ? ' · ' + daysRemaining + ' days left' : ' · overdue'}</p>`;
      } else {
        targetDateHtml = `<p class="text-xs text-success-600">Completed by ${dateStr}</p>`;
      }
    }

    el.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <i data-lucide="${goalIconFn(goal?.icon)}" class="w-5 h-5 text-primary-600"></i>
          </div>
          <div>
            <p class="font-semibold text-gray-900 dark:text-white text-sm">${progress.name}</p>
          </div>
        </div>
        ${statusBadge}
      </div>
      <div class="mb-3">
        <div class="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full ${barColor} rounded-full transition-all" style="width: ${Math.min(progress.percentage, 100)}%"></div>
        </div>
      </div>
      <div class="flex justify-between items-baseline mb-1">
        <span class="text-lg font-bold text-gray-900 dark:text-white">${this.fmt(progress.current)}</span>
        <span class="text-sm text-gray-500 dark:text-gray-400">of ${this.fmt(progress.target)}</span>
      </div>
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs text-gray-500 dark:text-gray-400">${progress.percentage}%</span>
        <span class="text-xs ${progress.remaining > 0 ? 'text-gray-500 dark:text-gray-400' : 'text-success-600'} font-medium">
          ${progress.remaining > 0 ? this.fmt(progress.remaining) + ' remaining' : 'Goal reached!'}
        </span>
      </div>
      ${targetDateHtml}
      <div class="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        ${!progress.isComplete ? `<button class="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors font-medium" data-deposit="${progress.name}"><i data-lucide="plus" class="w-3.5 h-3.5"></i>Add Money</button>` : ''}
        ${progress.current > 0 && !progress.isComplete ? `<button class="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors" data-withdraw="${progress.name}"><i data-lucide="minus" class="w-3.5 h-3.5"></i>Withdraw</button>` : ''}
        <button class="flex-1 text-xs text-center py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors" data-edit-goal="${progress.name}">Edit</button>
      </div>`;

    // Wire up buttons
    el.querySelector('[data-deposit]')?.addEventListener('click', () => this.showGoalContributionModal(goal, 'deposit'));
    el.querySelector('[data-withdraw]')?.addEventListener('click', () => this.showGoalContributionModal(goal, 'withdraw'));
    el.querySelector('[data-edit-goal]')?.addEventListener('click', () => this.showGoalModal(goal));

    return el;
  }

  /* ---- Goal Modal ----------------------------------------------- */

  showGoalModal(existing = null) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const isEdit = !!existing;

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md';
    modal.innerHTML = `
      <div class="p-6">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">${isEdit ? t('goals.editGoal') || 'Edit Goal' : t('goals.addGoal')}</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('goalForm.name')}</label>
            <input id="goal-name" type="text" value="${existing?.nama || ''}" placeholder="${t('goalForm.namePlaceholder')}"
              class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('goalForm.target')}</label>
            <input id="goal-target" type="number" min="0" step="1000" value="${existing?.target || ''}" placeholder="e.g., 5000000"
              class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('goalForm.current') || 'Current Amount'}</label>
            <input id="goal-current" type="number" min="0" step="1000" value="${existing?.terkumpul || 0}" placeholder="0"
              ${isEdit ? 'disabled' : ''}
              class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('goalForm.targetMonth') || 'Target Date (optional)'}</label>
            <input id="goal-date" type="date" value="${existing?.targetDate || ''}"
              class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('goalForm.icon') || 'Icon'}</label>
            <select id="goal-icon" class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="target" ${existing?.icon === 'target' ? 'selected' : ''}>🎯 Target</option>
              <option value="shield" ${existing?.icon === 'shield' ? 'selected' : ''}>🛡️ Shield</option>
              <option value="plane" ${existing?.icon === 'plane' ? 'selected' : ''}>✈️ Travel</option>
              <option value="home" ${existing?.icon === 'home' ? 'selected' : ''}>🏠 Home</option>
              <option value="car" ${existing?.icon === 'car' ? 'selected' : ''}>🚗 Car</option>
              <option value="graduation-cap" ${existing?.icon === 'graduation-cap' ? 'selected' : ''}>🎓 Education</option>
              <option value="baby" ${existing?.icon === 'baby' ? 'selected' : ''}>👶 Family</option>
              <option value="heart" ${existing?.icon === 'heart' ? 'selected' : ''}>❤️ Health</option>
              <option value="laptop" ${existing?.icon === 'laptop' ? 'selected' : ''}>💻 Tech</option>
              <option value="gift" ${existing?.icon === 'gift' ? 'selected' : ''}>🎁 Other</option>
            </select>
          </div>
        </div>
        <div id="goal-error" class="hidden mt-3 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg text-sm text-danger-600"></div>
        ${isEdit ? `<div class="mt-3">
          <button id="goal-delete" class="text-sm text-danger-600 hover:text-danger-700">Delete this goal</button>
        </div>` : ''}
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button id="goal-cancel" class="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">${t('common.cancel')}</button>
        <button id="goal-save" class="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">${t('goalForm.save')}</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    overlay.querySelector('#goal-cancel')?.addEventListener('click', () => overlay.remove());

    // Delete from edit modal
    overlay.querySelector('#goal-delete')?.addEventListener('click', () => {
      overlay.remove();
      this.showGoalDeleteConfirm(existing);
    });

    overlay.querySelector('#goal-save')?.addEventListener('click', () => {
      const nama = overlay.querySelector('#goal-name').value;
      const target = overlay.querySelector('#goal-target').value;
      const current = overlay.querySelector('#goal-current').value;
      const targetDate = overlay.querySelector('#goal-date').value || null;
      const icon = overlay.querySelector('#goal-icon').value;
      const errorEl = overlay.querySelector('#goal-error');

      const validation = validateGoal({ nama, target });
      if (!validation.valid) {
        errorEl.textContent = validation.errors.join('. ');
        errorEl.classList.remove('hidden');
        return;
      }

      const allGoals = [...(appState.get('goals') || [])];

      if (isEdit) {
        const idx = allGoals.findIndex(g => g.id === existing.id);
        if (idx >= 0) {
          allGoals[idx] = { ...allGoals[idx], nama, target: parseFloat(target), targetDate, icon };
        }
      } else {
        const newGoal = createGoal({ nama, target: parseFloat(target), terkumpul: parseFloat(current) || 0, targetDate, icon });
        allGoals.push(newGoal);
      }

      appState.set('goals', allGoals);
      saveData();
      overlay.remove();
      toast.success(t('alerts.goalSaved'));
      this.renderContent();
    });
  }

  /* ---- Goal Delete Confirm -------------------------------------- */

  showGoalDeleteConfirm(goal) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm';
    modal.innerHTML = `
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
            <i data-lucide="trash-2" class="w-5 h-5 text-danger-600"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">Delete Goal</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">${goal.nama}</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">${t('confirm.deleteGoal')}</p>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button id="del-cancel" class="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">${t('common.cancel')}</button>
        <button id="del-confirm" class="px-5 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors text-sm font-medium">${t('common.delete')}</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    overlay.querySelector('#del-cancel')?.addEventListener('click', () => overlay.remove());
    overlay.querySelector('#del-confirm')?.addEventListener('click', () => {
      const allGoals = (appState.get('goals') || []).filter(g => g.id !== goal.id);
      appState.set('goals', allGoals);
      saveData();
      overlay.remove();
      toast.success('Goal deleted.');
      this.renderContent();
    });
  }

  /* ---- Goal Contribution Modal ---------------------------------- */

  showGoalContributionModal(goal, type = 'deposit') {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const accounts = appState.get('accounts') || [];
    const isDeposit = type === 'deposit';
    const title = isDeposit ? 'Add Money' : 'Withdraw';

    // Filter to liquid accounts only for deposit/withdraw
    const liquidAccounts = accounts.filter(a => {
      const type = (a.jenis || '').toLowerCase();
      return ['cash', 'bank', 'tabungan', 'ewallet', 'e-wallet', 'kas', 'bank-digital'].includes(type);
    });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md';
    modal.innerHTML = `
      <div class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg ${isDeposit ? 'bg-success-100 dark:bg-success-900/30' : 'bg-warning-100 dark:bg-warning-900/30'} flex items-center justify-center">
            <i data-lucide="${isDeposit ? 'plus' : 'minus'}" class="w-5 h-5 ${isDeposit ? 'text-success-600' : 'text-warning-600'}"></i>
          </div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-white">${title}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">${goal.nama}</p>
          </div>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('goalAdjust.amount')}</label>
            <input id="contrib-amount" type="number" min="0" step="1000" placeholder="${t('goalAdjust.amountPlaceholder')}"
              class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${isDeposit ? t('goalAdjust.fromAccount') : t('goalAdjust.toAccount')}</label>
            <select id="contrib-account" class="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              ${liquidAccounts.map(a => `<option value="${a.id}">${a.nama} (${this.fmt(a.saldo)})</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="contrib-error" class="hidden mt-3 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg text-sm text-danger-600"></div>
      </div>
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button id="contrib-cancel" class="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">${t('common.cancel')}</button>
        <button id="contrib-save" class="px-5 py-2 ${isDeposit ? 'bg-success-600 hover:bg-success-700' : 'bg-warning-600 hover:bg-warning-700'} text-white rounded-lg transition-colors text-sm font-medium">${t('goalAdjust.confirm')}</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    overlay.querySelector('#contrib-cancel')?.addEventListener('click', () => overlay.remove());

    overlay.querySelector('#contrib-save')?.addEventListener('click', () => {
      const amount = parseFloat(overlay.querySelector('#contrib-amount').value);
      const accountId = overlay.querySelector('#contrib-account').value;
      const errorEl = overlay.querySelector('#contrib-error');

      if (!amount || amount <= 0) {
        errorEl.textContent = 'Please enter a valid amount.';
        errorEl.classList.remove('hidden');
        return;
      }

      if (!accountId) {
        errorEl.textContent = 'Please select an account.';
        errorEl.classList.remove('hidden');
        return;
      }

      const allGoals = [...(appState.get('goals') || [])];
      const allAccounts = [...(appState.get('accounts') || [])];
      const allTransactions = [...(appState.get('transactions') || [])];

      // Find goal and account
      const goalIdx = allGoals.findIndex(g => g.id === goal.id);
      const accIdx = allAccounts.findIndex(a => a.id === accountId);

      if (goalIdx < 0 || accIdx < 0) {
        errorEl.textContent = 'Invalid goal or account.';
        errorEl.classList.remove('hidden');
        return;
      }

      if (isDeposit) {
        // Check account balance
        if (allAccounts[accIdx].saldo < amount) {
          errorEl.textContent = t('confirm.insufficientFunds');
          errorEl.classList.remove('hidden');
          return;
        }

        // Update account balance
        allAccounts[accIdx] = { ...allAccounts[accIdx], saldo: allAccounts[accIdx].saldo - amount };

        // Update goal progress
        allGoals[goalIdx] = { ...allGoals[goalIdx], terkumpul: allGoals[goalIdx].terkumpul + amount };

        // Create transfer record for audit trail (NOT expense — goal funding is not spending)
        const txn = createTransaction({
          tipe: 'transfer',
          keterangan: `Goal: ${goal.nama} - Deposit`,
          jumlah: amount,
          dompet: accountId,
          kategori: goal.nama,
          tanggal: new Date().toISOString().split('T')[0],
        });
        allTransactions.push(txn);
      } else {
        // Withdraw
        const maxWithdraw = allGoals[goalIdx].terkumpul;
        if (amount > maxWithdraw) {
          errorEl.textContent = t('confirm.withdrawalExceeds');
          errorEl.classList.remove('hidden');
          return;
        }

        // Update account balance
        allAccounts[accIdx] = { ...allAccounts[accIdx], saldo: allAccounts[accIdx].saldo + amount };

        // Update goal progress
        allGoals[goalIdx] = { ...allGoals[goalIdx], terkumpul: allGoals[goalIdx].terkumpul - amount };

        // Create transfer record for audit trail (NOT income — goal withdrawal is not earning)
        const txn = createTransaction({
          tipe: 'transfer',
          keterangan: `Goal: ${goal.nama} - Withdrawal`,
          jumlah: amount,
          dompet: accountId,
          kategori: goal.nama,
          tanggal: new Date().toISOString().split('T')[0],
        });
        allTransactions.push(txn);
      }

      appState.set('goals', allGoals);
      appState.set('accounts', allAccounts);
      appState.set('transactions', allTransactions);
      saveData();
      overlay.remove();
      toast.success(isDeposit ? t('alerts.goalContribution') : t('alerts.goalWithdrawal'));
      this.renderContent();
    });
  }
  renderBills() {
    const bills = appState.get('bills') || [];
    const accounts = appState.get('accounts') || [];
    const currency = appState.get('currency') || 'IDR';
    const now = new Date();

    const summary = calculateBillsSummary(bills, 0, now);
    const groups = getBillsByStatus(bills, now);

    const el = document.createElement('div');
    el.className = 'space-y-6';

    // Page header
    el.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${t('bills.title')}</h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">${t('bills.subtitle')}</p>
        </div>
        <button id="btn-add-bill" class="flex items-center gap-2 px-4 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium ">
          <i data-lucide="plus" class="w-4 h-4"></i>${t('bills.addBill')}
        </button>
      </div>`;

    // Summary cards
    const summaryHtml = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${t('bills.totalDue')}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">${this.fmt(summary.totalDue)}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${t('bills.dueThisWeek')}</p>
          <p class="text-xl font-bold text-warning-600">${this.fmt(summary.totalDueThisWeek)}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${t('bills.overdue')}</p>
          <p class="text-xl font-bold ${summary.totalOverdue > 0 ? 'text-danger-600' : 'text-gray-900 dark:text-white'}">${this.fmt(summary.totalOverdue)}</p>
        </div>
        <div class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${t('bills.paidThisMonth')}</p>
          <p class="text-xl font-bold text-success-600">${this.fmt(summary.totalPaid)}</p>
        </div>
      </div>`;
    el.innerHTML += summaryHtml;

    // Render groups
    const sections = [
      { key: 'overdue', title: t('bills.overdue'), bills: groups.overdue, color: 'danger' },
      { key: 'due', title: t('bills.dueSoon'), bills: groups.due, color: 'warning' },
      { key: 'upcoming', title: t('bills.upcoming'), bills: groups.upcoming, color: 'primary' },
      { key: 'paid', title: t('bills.paidBills'), bills: groups.paid, color: 'success' },
      { key: 'inactive', title: t('bills.inactive'), bills: groups.inactive, color: 'gray' },
    ];

    // If all empty, show empty state
    const allEmpty = sections.every(s => s.bills.length === 0) && groups.inactive.length === 0;
    if (allEmpty) {
      el.innerHTML += `
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <i data-lucide="receipt" class="w-8 h-8 text-gray-400"></i>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">${t('bills.empty')}</h2>
          <p class="text-gray-500 dark:text-gray-400 max-w-md mb-6">${t('bills.emptyDescription')}</p>
          <button id="btn-add-bill-empty" class="flex items-center gap-2 px-4 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium ">
            <i data-lucide="plus" class="w-4 h-4"></i>${t('bills.createFirst')}
          </button>
        </div>`;
      const addBtnEmpty = el.querySelector('#btn-add-bill-empty');
      if (addBtnEmpty) addBtnEmpty.addEventListener('click', () => this.showBillModal());
      const addBtn = el.querySelector('#btn-add-bill');
      if (addBtn) addBtn.addEventListener('click', () => this.showBillModal());
      return el;
    }

    // Render each section
    sections.forEach(section => {
      if (section.bills.length === 0) return;

      const sectionEl = document.createElement('div');
      const badgeColors = {
        danger: 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
        warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
        primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
        success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
        gray: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
      };
      sectionEl.innerHTML = `
        <div class="flex items-center gap-2 mb-3">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">${section.title}</h3>
          <span class="text-xs font-medium px-2 py-0.5 rounded-full ${badgeColors[section.color]}">${section.bills.length}</span>
        </div>`;

      const listEl = document.createElement('div');
      listEl.className = 'space-y-3';

      section.bills.forEach(bill => {
        const daysText = bill.daysUntilDue <= 0
          ? (bill.daysUntilDue === 0 ? t('bills.dueToday') : t('bills.overdueBy', { days: Math.abs(bill.daysUntilDue) }))
          : t('bills.daysUntilDue', { days: bill.daysUntilDue });
        const dueDateStr = bill.nextDueDate ? formatDate(bill.nextDueDate.toISOString().slice(0, 10), 'short') : '—';
        const recurrence = bill.ulang || RECURRENCE.MONTHLY;
        const recurrenceLabels = {
          none: t('bills.none'),
          weekly: t('bills.weekly'),
          monthly: t('bills.monthly'),
          yearly: t('bills.yearly'),
        };
        const isPaid = bill.status === BILL_STATUS.PAID;
        const isOverdue = bill.status === BILL_STATUS.OVERDUE;

        const card = document.createElement('div');
        card.className = `bg-white dark:bg-gray-900 rounded-xl border p-4 ${isOverdue ? 'border-danger-300 dark:border-danger-700' : 'border-gray-200 dark:border-gray-800'}`;
        card.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <i data-lucide="receipt" class="w-5 h-5 text-gray-500 dark:text-gray-400"></i>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-medium text-gray-900 dark:text-white text-sm truncate">${bill.nama}</p>
                  ${isPaid ? '<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400">Paid</span>' : ''}
                  ${isOverdue ? '<span class="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400">Overdue</span>' : ''}
                </div>
                <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span>${dueDateStr}</span>
                  <span>·</span>
                  <span class="${isOverdue ? 'text-danger-600 dark:text-danger-400' : ''}">${daysText}</span>
                  ${recurrence !== 'none' ? `<span>·</span><span>${recurrenceLabels[recurrence]}</span>` : ''}
                </div>
                ${bill.kategori ? `<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">${bill.kategori}</p>` : ''}
              </div>
            </div>
            <div class="flex items-center gap-3">
              <p class="font-semibold text-gray-900 dark:text-white text-sm">${this.fmt(bill.jumlah)}</p>
              <div class="flex items-center gap-1">
                ${!isPaid ? `<button class="bill-pay-btn px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors" data-bill-id="${bill.id}">${t('bills.pay')}</button>` : ''}
                <button class="bill-edit-btn p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" data-bill-id="${bill.id}" title="${t('common.edit')}">
                  <i data-lucide="pencil" class="w-4 h-4 text-gray-500 dark:text-gray-400"></i>
                </button>
                <button class="bill-delete-btn p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" data-bill-id="${bill.id}" title="${t('common.delete')}">
                  <i data-lucide="trash-2" class="w-4 h-4 text-gray-400 dark:text-gray-500"></i>
                </button>
              </div>
            </div>
          </div>`;
        listEl.appendChild(card);
      });

      sectionEl.appendChild(listEl);
      el.appendChild(sectionEl);
    });

    // Monthly commitments footer
    if (summary.monthlyCommitments > 0) {
      const commitmentPct = summary.totalPaid > 0 ? Math.round((summary.totalPaid / (summary.totalPaid + summary.totalDue)) * 100) : 0;
      el.innerHTML += `
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${t('bills.monthlyCommitments')}</span>
            <span class="text-sm font-semibold text-gray-900 dark:text-white">${this.fmt(summary.monthlyCommitments)}</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div class="bg-primary-600 h-2 rounded-full transition-all" style="width: ${Math.min(commitmentPct, 100)}%"></div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${commitmentPct}% ${t('bills.paid').toLowerCase()}</p>
        </div>`;
    }

    // Wire up events
    requestAnimationFrame(() => {
      el.querySelector('#btn-add-bill')?.addEventListener('click', () => this.showBillModal());

      el.querySelectorAll('.bill-pay-btn').forEach(btn => {
        btn.addEventListener('click', () => this.showPayBillModal(btn.dataset.billId));
      });

      el.querySelectorAll('.bill-edit-btn').forEach(btn => {
        btn.addEventListener('click', () => this.showBillModal(btn.dataset.billId));
      });

      el.querySelectorAll('.bill-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => this.deleteBill(btn.dataset.billId));
      });
    });

    return el;
  }
  renderFinancialHealth() {
    const accounts = appState.get('accounts') || [];
    const transactions = appState.get('transactions') || [];
    const budgets = appState.get('budgets') || [];
    const currency = appState.get('currency') || 'IDR';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Calculate core metrics
    const monthIncome = calculateMonthlyIncome(transactions, year, month);
    const monthExpenses = calculateMonthlyExpenses(transactions, year, month);
    const savingsRate = calculateSavingsRate(monthIncome, monthExpenses);
    const srAssessment = assessSavingsRate(savingsRate);
    const emergency = calculateEmergencyFundCoverage(accounts, monthExpenses);
    const debt = calculateDebtBurden(transactions, budgets, year, month, monthIncome);
    const netWorth = calculateNetWorth(accounts);
    const liquidAssets = calculateAvailableCash(accounts);

    // Calculate composite health score (0-100)
    let healthScore = 0;
    if (savingsRate >= 20) healthScore += 40;
    else if (savingsRate >= 10) healthScore += 25;
    else if (savingsRate >= 5) healthScore += 10;
    if (emergency.months >= 6) healthScore += 35;
    else if (emergency.months >= 3) healthScore += 20;
    else if (emergency.months >= 1) healthScore += 8;
    if (debt.ratio <= 10) healthScore += 25;
    else if (debt.ratio <= 20) healthScore += 18;
    else if (debt.ratio <= 35) healthScore += 8;

    let scoreLabel, scoreColor;
    if (healthScore >= 80) { scoreLabel = t('health.excellent'); scoreColor = 'text-success-600'; }
    else if (healthScore >= 60) { scoreLabel = t('health.good'); scoreColor = 'text-primary-600'; }
    else if (healthScore >= 40) { scoreLabel = t('health.fair'); scoreColor = 'text-warning-600'; }
    else { scoreLabel = t('health.poor'); scoreColor = 'text-danger-600'; }

    // Next best actions
    const spending = calculateSpendingByCategory(transactions, year, month);
    const budgetOverruns = spending.filter(s => {
      const b = budgets.find(bg => bg.kategori === s.category);
      return b && s.amount > (parseFloat(b.anggaran) || 0);
    }).map(s => {
      const b = budgets.find(bg => bg.kategori === s.category);
      const limit = parseFloat(b?.anggaran) || 0;
      return { categoryName: s.category, overagePercent: limit > 0 ? Math.round(((s.amount - limit) / limit) * 100) : 0 };
    });
    const nextActions = generateNextBestActions({ savingsRate, emergencyFund: emergency, debtBurden: debt, budgetOverruns });

    // Score ring color
    const scoreRingColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#6366f1' : healthScore >= 40 ? '#f59e0b' : '#ef4444';
    const circumference = 2 * Math.PI * 54;
    const dashoffset = circumference - (healthScore / 100) * circumference;

    // Status helpers
    const statusColor = (status) => {
      if (status === 'safe' || status === 'healthy') return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400';
      if (status === 'caution' || status === 'adequate') return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400';
      return 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400';
    };
    const statusLabel = (status) => {
      if (status === 'safe') return t('health.status.safe');
      if (status === 'caution') return t('health.status.caution');
      if (status === 'danger') return t('health.status.danger');
      if (status === 'healthy') return t('health.status.healthy');
      if (status === 'adequate') return t('health.status.adequate');
      if (status === 'critical') return t('health.status.critical');
      return status;
    };

    const el = document.createElement('div');
    el.className = 'space-y-6';

    el.innerHTML = `
      <!-- Page Header -->
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${t('health.title')}</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">${t('health.subtitle')}</p>
      </div>

      <!-- Score + Metrics Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Health Score Card -->
        <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">${t('health.score')}</p>
          <div class="relative w-32 h-32">
            <svg class="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke-width="8" class="stroke-gray-200 dark:stroke-gray-700" />
              <circle cx="60" cy="60" r="54" fill="none" stroke-width="8" stroke-linecap="round"
                stroke="${scoreRingColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashoffset}"
                class="transition-all duration-1000" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-3xl font-bold text-gray-900 dark:text-white">${healthScore}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">${t('health.scoreLabel')}</span>
            </div>
          </div>
          <p class="mt-3 text-sm font-semibold ${scoreColor}">${scoreLabel}</p>
        </div>

        <!-- Three Metric Cards -->
        <div class="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Emergency Fund -->
          <div class="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">${t('health.emergencyFund')}</p>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(emergency.status)}">${statusLabel(emergency.status)}</span>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">${emergency.months}<span class="text-sm font-normal text-gray-500 dark:text-gray-400"> mo</span></p>
            <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div class="h-1.5 rounded-full transition-all duration-500 ${emergency.months >= 6 ? 'bg-success-500' : emergency.months >= 3 ? 'bg-warning-500' : 'bg-danger-500'}" style="width: ${Math.min((emergency.months / 6) * 100, 100)}%"></div>
            </div>
            <p class="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">${t('health.target6Months')}</p>
          </div>

          <!-- Savings Rate -->
          <div class="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">${t('health.savingsRate')}</p>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(srAssessment.level)}">${statusLabel(srAssessment.level)}</span>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">${savingsRate}<span class="text-sm font-normal text-gray-500 dark:text-gray-400">%</span></p>
            <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div class="h-1.5 rounded-full transition-all duration-500 ${savingsRate >= 20 ? 'bg-success-500' : savingsRate >= 10 ? 'bg-warning-500' : 'bg-danger-500'}" style="width: ${Math.min(savingsRate, 100)}%"></div>
            </div>
            <p class="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">${t('health.target20Pct')}</p>
          </div>

          <!-- Debt Burden -->
          <div class="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">${t('health.debtBurden')}</p>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(debt.status)}">${statusLabel(debt.status)}</span>
            </div>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">${debt.ratio}<span class="text-sm font-normal text-gray-500 dark:text-gray-400">%</span></p>
            <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div class="h-1.5 rounded-full transition-all duration-500 ${debt.ratio <= 10 ? 'bg-success-500' : debt.ratio <= 20 ? 'bg-warning-500' : 'bg-danger-500'}" style="width: ${Math.min(debt.ratio, 100)}%"></div>
            </div>
            <p class="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">${t('health.targetBelow35Pct')}</p>
          </div>
        </div>
      </div>

      <!-- Detail Breakdown -->
      <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">${t('health.detailBreakdown')}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">${t('health.liquidAssets')}</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">${this.fmt(liquidAssets)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">${t('health.monthlyExpenses')}</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">${this.fmt(monthExpenses)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">${t('health.monthlyIncome')}</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">${this.fmt(monthIncome)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">${t('health.debtPayments')}</p>
            <p class="text-lg font-bold text-gray-900 dark:text-white">${this.fmt(debt.ratio > 0 ? monthIncome * (debt.ratio / 100) : 0)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">${t('health.netWorth')}</p>
            <p class="text-lg font-bold ${netWorth.total >= 0 ? 'text-success-600' : 'text-danger-600'}">${this.fmt(netWorth.total)}</p>
          </div>
        </div>
      </div>

      <!-- Next Best Actions -->
      <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">${t('health.nextBestActions')}</h2>
        ${nextActions.length > 0 ? `
          <div class="space-y-3">
            ${nextActions.map(action => `
              <div class="flex items-start gap-3 p-3 rounded-lg ${action.priority === 'high' ? 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800' : action.priority === 'medium' ? 'bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800' : 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800'}">
                <i data-lucide="${action.icon}" class="w-4 h-4 mt-0.5 ${action.priority === 'high' ? 'text-danger-600' : action.priority === 'medium' ? 'text-warning-600' : 'text-success-600'} flex-shrink-0"></i>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">${action.message}</p>
                  <span class="text-[10px] font-bold uppercase ${action.priority === 'high' ? 'text-danger-600' : action.priority === 'medium' ? 'text-warning-600' : 'text-success-600'}">${action.priority}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="text-center py-8">
            <i data-lucide="check-circle" class="w-10 h-10 text-success-500 mx-auto mb-2"></i>
            <p class="text-sm text-gray-500 dark:text-gray-400">${t('health.noActionsNeeded')}</p>
          </div>
        `}
      </div>
    `;

    return el;
  }
  renderFamily() {
    const familyT   = { title: t('family.title'), subtitle: t('family.subtitle'), members: t('family.members'), contributions: t('family.contributions'), addMember: t('family.addMember'), totalSpending: t('family.totalSpending'), householdIncome: t('family.householdIncome'), householdExpenses: t('family.householdExpenses'), activeSpenders: t('family.activeSpenders'), topSpender: t('family.topSpender'), spendingBreakdown: t('family.spendingBreakdown'), noMembers: t('family.noMembers'), noMembersDesc: t('family.noMembersDesc'), createFirst: t('family.createFirst'), noSpending: t('family.noSpending'), noSpendingDesc: t('family.noSpendingDesc'), ofTotal: t('family.ofTotal'), deleteMember: t('family.deleteMember'), deleteConfirm: t('family.deleteConfirm'), editMember: t('family.editMember'), relationshipPlaceholder: t('family.relationshipPlaceholder') };
    const members   = appState.get('familyMembers') || [];
    const txns      = appState.get('transactions') || [];
    const accounts  = appState.get('accounts') || [];
    const currency  = getUserCurrency();
    const year      = this._period.year;
    const month     = this._period.month;

    const familySpending = calculateFamilySpending(txns, members, year, month);
    const summary        = getFamilySpendingSummary(familySpending);

    // Household income for the period
    const householdIncome = txns
      .filter(t => {
        const d = new Date(t.tanggal);
        return t.tipe === 'masuk' && d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, t) => sum + (parseFloat(t.jumlah) || 0), 0);

    // Household expenses for the period
    const householdExpenses = txns
      .filter(t => {
        const d = new Date(t.tanggal);
        return t.tipe === 'keluar' && d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, t) => sum + (parseFloat(t.jumlah) || 0), 0);

    // Spending by category across all members
    const categorySpending = {};
    familySpending.forEach(ms => {
      Object.entries(ms.categories || {}).forEach(([cat, amt]) => {
        categorySpending[cat] = (categorySpending[cat] || 0) + amt;
      });
    });
    const sortedCategories = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1]);

    const el = document.createElement('div');
    el.className = 'space-y-6';

    // ── PAGE HEADER ──
    el.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">${familyT.title}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${familyT.subtitle}</p>
        </div>
        <button id="btn-add-member"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
          <i data-lucide="plus" class="w-4 h-4"></i>
          ${familyT.addMember}
        </button>
      </div>

      <!-- Summary Metrics -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${familyT.totalSpending}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">${this.fmt(summary.totalFamilySpending)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${familyT.householdIncome}</p>
          <p class="text-xl font-bold text-success-600 dark:text-success-400 mt-1">${this.fmt(householdIncome)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${familyT.householdExpenses}</p>
          <p class="text-xl font-bold text-danger-600 dark:text-danger-400 mt-1">${this.fmt(householdExpenses)}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${familyT.activeSpenders}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white mt-1">${summary.activeSpenderCount}</p>
        </div>
      </div>

      <!-- Content: Members + Spending -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- LEFT: Members -->
        <div class="lg:col-span-1 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${familyT.members}</h2>
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full">${members.length}</span>
          </div>
          <div id="family-members-list" class="space-y-3">
            ${members.length === 0 ? `
              <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
                <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <i data-lucide="users" class="w-7 h-7 text-gray-400"></i>
                </div>
                <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">${familyT.noMembers}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">${familyT.noMembersDesc}</p>
                <button onclick="window.__app.showMemberModal()" class="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white text-sm rounded-xl font-medium hover:bg-primary-700 transition-colors">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  ${familyT.createFirst}
                </button>
              </div>
            ` : members.map(m => {
              const ms = familySpending.find(s => s.memberId === m.id);
              const spent = ms ? ms.totalSpent : 0;
              const pct = summary.totalFamilySpending > 0 ? Math.round((spent / summary.totalFamilySpending) * 100) : 0;
              const role = normalizeRelationship(m.hubungan || m.normalizedRole || '');
              return `
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style="background:${m.color || '#6B7280'}">
                      ${(m.nama || '?')[0].toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${m.nama}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">${role}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-bold text-gray-900 dark:text-white">${this.fmt(spent)}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">${pct}%</p>
                    </div>
                  </div>
                  <div class="mt-3 flex items-center gap-2">
                    <div class="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all" style="width:${Math.min(pct, 100)}%;background:${m.color || '#6B7280'}"></div>
                    </div>
                    <button onclick="window.__app.showMemberModal('${m.id}')" class="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-colors" title="${familyT.editMember}">
                      <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="window.__app.deleteMember('${m.id}')" class="p-1.5 text-gray-400 hover:text-danger-600 rounded-lg transition-colors" title="${familyT.deleteMember}">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- RIGHT: Spending -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Per-Member Spending -->
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${familyT.contributions}</h2>
            ${familySpending.filter(s => s.totalSpent > 0).length === 0 ? `
              <div class="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 text-center">
                <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <i data-lucide="pie-chart" class="w-7 h-7 text-gray-400"></i>
                </div>
                <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">${familyT.noSpending}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${familyT.noSpendingDesc}</p>
              </div>
            ` : `
              <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                ${familySpending.filter(s => s.totalSpent > 0).map((ms, i) => {
                  const member = members.find(m => m.id === ms.memberId);
                  const pct = summary.totalFamilySpending > 0 ? Math.round((ms.totalSpent / summary.totalFamilySpending) * 100) : 0;
                  const color = member ? member.color : '#6B7280';
                  const topCats = Object.entries(ms.categories || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);
                  return `
                    <div class="p-4">
                      <div class="flex items-center gap-3 mb-2">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:${color}">
                          ${(ms.name || '?')[0].toUpperCase()}
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-semibold text-gray-900 dark:text-white">${ms.name}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-sm font-bold text-gray-900 dark:text-white">${this.fmt(ms.totalSpent)}</p>
                          <p class="text-xs text-gray-500 dark:text-gray-400">${pct}% ${familyT.ofTotal.replace('{pct}', pct)}</p>
                        </div>
                      </div>
                      <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                        <div class="h-full rounded-full" style="width:${Math.min(pct, 100)}%;background:${color}"></div>
                      </div>
                      ${topCats.length > 0 ? `
                        <div class="flex flex-wrap gap-2 mt-2">
                          ${topCats.map(([cat, amt]) => `
                            <span class="text-xs px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              ${cat}: ${this.fmt(amt)}
                            </span>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- Spending by Category -->
          ${sortedCategories.length > 0 ? `
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${familyT.spendingBreakdown}</h2>
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              ${sortedCategories.map(([cat, amt]) => {
                const pct = summary.totalFamilySpending > 0 ? Math.round((amt / summary.totalFamilySpending) * 100) : 0;
                return `
                  <div class="flex items-center gap-3 p-4">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white">${cat}</p>
                    </div>
                    <div class="w-32 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full bg-primary-500 rounded-full" style="width:${pct}%"></div>
                    </div>
                    <div class="text-right w-28">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">${this.fmt(amt)}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">${pct}%</p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    // Bind Add Member button
    requestAnimationFrame(() => {
      const addBtn = el.querySelector('#btn-add-member');
      if (addBtn) addBtn.addEventListener('click', () => this.showMemberModal());
      if (typeof lucide !== 'undefined') lucide.createIcons({ attrs: { class: 'w-4 h-4' }, nameAttr: 'data-lucide' });
    });

    return el;
  }
  renderReports() {
    const year  = this._period.year;
    const month = this._period.month;
    return renderReportsPage(year, month);
  }
  renderSettings() {
    return renderSettingsPage();
  }

  renderPlaceholder(tabId) {
    const labels = {
      accounts: 'Accounts', transactions: 'Transactions', transfers: 'Transfers',
      budgets: 'Budgets', goals: 'Goals', bills: 'Bills & Subscriptions',
      health: 'Financial Health', family: 'Family', reports: 'Reports', settings: 'Settings',
    };
    const el = document.createElement('div');
    el.className = 'flex flex-col items-center justify-center py-20 text-center';
    el.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <i data-lucide="construction" class="w-8 h-8 text-gray-400"></i>
      </div>
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">${labels[tabId] || tabId}</h2>
      <p class="text-gray-500 dark:text-gray-400 max-w-md">This section is under development. The full redesign will be implemented in upcoming phases.</p>`;
    return el;
  }

  /* ================================================================ */
  /*  BILL MODALS                                                     */
  /* ================================================================ */

  showBillModal(editBillId) {
    const bills = appState.get('bills') || [];
    const accounts = appState.get('accounts') || [];
    const bill = editBillId ? bills.find(b => b.id === editBillId) : null;
    const isEdit = !!bill;
    const currency = appState.get('currency') || 'IDR';

    const categories = [
      'Food & Dining', 'Transportation', 'Housing', 'Household', 'Kids & Education',
      'Bills & Utilities', 'Health', 'Insurance', 'Entertainment', 'Other'
    ];

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 space-y-4';
    modal.innerHTML = `
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${isEdit ? t('billForm.editTitle') : t('billForm.title')}</h2>
        <button id="bill-close" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><i data-lucide="x" class="w-5 h-5 text-gray-500"></i></button>
      </div>
      <div id="bill-error" class="text-sm text-danger-600 hidden"></div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('billForm.name')}</label>
        <input id="bill-name" type="text" value="${bill?.nama || ''}" placeholder="${t('billForm.namePlaceholder')}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('billForm.amount')}</label>
        <input id="bill-amount" type="number" value="${bill?.jumlah || ''}" placeholder="${t('billForm.amountPlaceholder')}" min="1" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('billForm.dueDate')}</label>
        <input id="bill-due" type="number" value="${bill?.tanggalJatuhTempo || ''}" min="1" max="31" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('billForm.category')}</label>
        <select id="bill-category" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">—</option>
          ${categories.map(c => `<option value="${c}" ${bill?.kategori === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('billForm.recurrence')}</label>
        <select id="bill-recurrence" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="none" ${(bill?.ulang || 'monthly') === 'none' ? 'selected' : ''}>${t('bills.none')}</option>
          <option value="weekly" ${bill?.ulang === 'weekly' ? 'selected' : ''}>${t('bills.weekly')}</option>
          <option value="monthly" ${(bill?.ulang || 'monthly') === 'monthly' ? 'selected' : ''}>${t('bills.monthly')}</option>
          <option value="yearly" ${bill?.ulang === 'yearly' ? 'selected' : ''}>${t('bills.yearly')}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('billForm.account')}</label>
        <select id="bill-account" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">—</option>
          ${accounts.filter(a => a.aktif !== false).map(a => `<option value="${a.id}" ${bill?.dompet === a.id ? 'selected' : ''}>${a.nama}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${t('billForm.notes')}</label>
        <textarea id="bill-notes" rows="2" placeholder="${t('billForm.notesPlaceholder')}" class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">${bill?.catatan || ''}</textarea>
      </div>
      <div class="flex gap-3 pt-2">
        <button id="bill-cancel" class="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">${t('billForm.cancel')}</button>
        <button id="bill-save" class="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">${t('billForm.save')}</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const close = () => overlay.remove();
    modal.querySelector('#bill-close').addEventListener('click', close);
    modal.querySelector('#bill-cancel').addEventListener('click', close);

    modal.querySelector('#bill-save').addEventListener('click', () => {
      const errorEl = modal.querySelector('#bill-error');
      errorEl.classList.add('hidden');

      const data = {
        id: bill?.id || undefined,
        nama: modal.querySelector('#bill-name').value.trim(),
        jumlah: parseFloat(modal.querySelector('#bill-amount').value),
        tanggalJatuhTempo: parseInt(modal.querySelector('#bill-due').value),
        kategori: modal.querySelector('#bill-category').value,
        ulang: modal.querySelector('#bill-recurrence').value,
        dompet: modal.querySelector('#bill-account').value,
        catatan: modal.querySelector('#bill-notes').value.trim(),
      };

      if (isEdit && bill) {
        // Preserve existing fields
        data.aktif = bill.aktif;
        data.terakhirBayar = bill.terakhirBayar;
        data.createdAt = bill.createdAt;
      }

      const validation = validateBillFn(data);
      if (!validation.valid) {
        errorEl.textContent = validation.errors.join('. ');
        errorEl.classList.remove('hidden');
        return;
      }

      const updatedBills = [...bills];
      if (isEdit) {
        const idx = updatedBills.findIndex(b => b.id === bill.id);
        if (idx >= 0) updatedBills[idx] = createBillObj(data);
      } else {
        updatedBills.push(createBillObj(data));
      }

      appState.set('bills', updatedBills);
      saveData();
      close();
      toast.success(t(isEdit ? 'alerts.billSaved' : 'alerts.billSaved'));
      this.renderContent();
    });
  }

  showPayBillModal(billId) {
    const bills = appState.get('bills') || [];
    const accounts = appState.get('accounts') || [];
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    const currency = appState.get('currency') || 'IDR';
    const paymentAccount = bill.dompet || (accounts.length > 0 ? accounts[0].id : '');
    const account = accounts.find(a => a.id === paymentAccount);

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const modal = document.createElement('div');
    modal.className = 'bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 space-y-4';
    modal.innerHTML = `
      <div class="text-center">
        <div class="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
          <i data-lucide="receipt" class="w-7 h-7 text-primary-600 dark:text-primary-400"></i>
        </div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${t('bills.confirmPay', { name: bill.nama })}</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${t('bills.confirmPayMessage')}</p>
      </div>
      <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
        <div class="flex justify-between">
          <span class="text-sm text-gray-500 dark:text-gray-400">${t('bills.amount')}</span>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">${this.fmt(bill.jumlah)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-sm text-gray-500 dark:text-gray-400">${t('bills.paymentAccount')}</span>
          <span class="text-sm font-medium text-gray-900 dark:text-white">${account?.nama || '—'}</span>
        </div>
        ${bill.kategori ? `<div class="flex justify-between">
          <span class="text-sm text-gray-500 dark:text-gray-400">${t('bills.amount').replace('Amount', 'Category')}</span>
          <span class="text-sm text-gray-700 dark:text-gray-300">${bill.kategori}</span>
        </div>` : ''}
      </div>
      <div id="pay-error" class="text-sm text-danger-600 hidden"></div>
      <div class="flex gap-3">
        <button id="pay-cancel" class="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">${t('common.cancel')}</button>
        <button id="pay-confirm" class="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors">${t('bills.pay')}</button>
      </div>`;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();

    const close = () => overlay.remove();
    modal.querySelector('#pay-cancel').addEventListener('click', close);

    modal.querySelector('#pay-confirm').addEventListener('click', () => {
      const errorEl = modal.querySelector('#pay-error');
      errorEl.classList.add('hidden');

      // Find account
      const accIdx = accounts.findIndex(a => a.id === paymentAccount);
      if (accIdx < 0) {
        errorEl.textContent = 'No payment account selected.';
        errorEl.classList.remove('hidden');
        return;
      }

      // Create expense transaction
      const txn = createTransaction({
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: `Bill: ${bill.nama}`,
        jumlah: bill.jumlah,
        tipe: 'keluar',
        dompet: paymentAccount,
        kategori: bill.kategori || 'Bills & Utilities',
      });

      // Update account balance
      const updatedAccounts = [...accounts];
      updatedAccounts[accIdx] = {
        ...updatedAccounts[accIdx],
        saldo: (parseFloat(updatedAccounts[accIdx].saldo) || 0) - bill.jumlah
      };

      // Update bill payment record
      const updatedBills = [...bills];
      const billIdx = updatedBills.findIndex(b => b.id === billId);
      if (billIdx >= 0) {
        updatedBills[billIdx] = {
          ...updatedBills[billIdx],
          terakhirBayar: new Date().toISOString()
        };
      }

      // Add transaction
      const transactions = [...appState.get('transactions') || [], txn];

      appState.update({
        accounts: updatedAccounts,
        bills: updatedBills,
        transactions: transactions
      });
      saveData();
      close();
      toast.success(t('alerts.billSaved'));
      this.renderContent();
    });
  }

  deleteBill(billId) {
    const bills = appState.get('bills') || [];
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    const hasHistory = bill.terakhirBayar !== null;
    const message = hasHistory
      ? `${t('bills.deleteConfirm')} ${t('bills.deleteWarning')}`
      : t('bills.deleteConfirm');

    appState.confirm({
      title: t('bills.deleteBill'),
      message,
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      type: 'danger',
    }).then(confirmed => {
      if (!confirmed) return;
      const updatedBills = bills.filter(b => b.id !== billId);
      appState.set('bills', updatedBills);
      saveData();
      toast.success(t('alerts.billSaved'));
      this.renderContent();
    });
  }

  /* ================================================================ */
  /*  FAMILY MEMBER MODALS                                            */
  /* ================================================================ */

  showMemberModal(editId = null) {
    const members   = appState.get('familyMembers') || [];
    const existing  = editId ? members.find(m => m.id === editId) : null;
    const memberT   = { title: t('memberForm.title'), editTitle: t('memberForm.editTitle'), name: t('memberForm.name'), namePlaceholder: t('memberForm.namePlaceholder'), role: t('memberForm.role'), color: t('memberForm.color'), cancel: t('memberForm.cancel'), save: t('memberForm.save') };
    const familyT   = { deleteMember: t('family.deleteMember'), deleteConfirm: t('family.deleteConfirm'), relationshipPlaceholder: t('family.relationshipPlaceholder') };
    const isEdit    = !!existing;

    const colors = ['#3B82F6','#EC4899','#F59E0B','#10B981','#8B5CF6','#EF4444','#6366F1','#14B8A6'];
    const roles  = ['Father','Mother','Husband','Wife','Child','Sibling','Partner','Admin','Member'];

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">${isEdit ? memberT.editTitle : memberT.title}</h3>
        <form id="member-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${memberT.name}</label>
            <input type="text" id="member-name" value="${existing?.nama || ''}" placeholder="${memberT.namePlaceholder}"
              class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${memberT.role}</label>
            <select id="member-role"
              class="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">${familyT.relationshipPlaceholder}</option>
              ${roles.map(r => `<option value="${r}" ${existing?.hubungan === r ? 'selected' : ''}>${r}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${memberT.color}</label>
            <div class="flex gap-2 flex-wrap">
              ${colors.map(c => `
                <button type="button" data-color="${c}"
                  class="w-8 h-8 rounded-full border-2 transition-all ${existing?.color === c || (!existing && c === '#3B82F6') ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}"
                  style="background:${c}"></button>
              `).join('')}
            </div>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" id="member-cancel"
              class="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              ${memberT.cancel}
            </button>
            <button type="submit"
              class="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">
              ${memberT.save}
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Color picker
    let selectedColor = existing?.color || '#3B82F6';
    modal.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('[data-color]').forEach(b => b.classList.remove('border-gray-900', 'dark:border-white', 'scale-110'));
        btn.classList.add('border-gray-900', 'dark:border-white', 'scale-110');
        selectedColor = btn.dataset.color;
      });
    });

    // Cancel
    modal.querySelector('#member-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    // Submit
    modal.querySelector('#member-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = modal.querySelector('#member-name').value.trim();
      const role = modal.querySelector('#member-role').value;

      const memberData = {
        nama: name,
        hubungan: role,
        color: selectedColor,
      };

      const validation = validateFamilyMember(memberData);
      if (!validation.valid) {
        appState.showToast({ type: 'error', message: validation.errors[0] });
        return;
      }

      const currentMembers = [...appState.get('familyMembers')];

      if (isEdit) {
        const idx = currentMembers.findIndex(m => m.id === editId);
        if (idx !== -1) {
          currentMembers[idx] = { ...currentMembers[idx], ...memberData };
        }
      } else {
        currentMembers.push(createFamilyMember(memberData));
      }

      appState.set('familyMembers', currentMembers);
      saveData();
      appState.showToast({ type: 'success', message: isEdit ? 'Member updated' : 'Member added' });
      modal.remove();
      this.renderContent();
    });

    // Focus
    requestAnimationFrame(() => modal.querySelector('#member-name')?.focus());
  }

  async deleteMember(memberId) {
    const members  = appState.get('familyMembers') || [];
    const member   = members.find(m => m.id === memberId);
    if (!member) return;

    const familyT = { deleteMember: t('family.deleteMember'), deleteConfirm: t('family.deleteConfirm') };
    const confirmed = await appState.confirm({
      title: familyT.deleteMember,
      message: familyT.deleteConfirm.replace('{name}', member.nama),
      confirmText: familyT.deleteMember,
      type: 'danger',
    });

    if (!confirmed) return;

    const updated = members.filter(m => m.id !== memberId);
    appState.set('familyMembers', updated);
    saveData();
    appState.showToast({ type: 'success', message: `${member.nama} removed` });
    this.renderContent();
  }

  /* ================================================================ */
  /*  MODALS                                                          */
  /* ================================================================ */

  showSmartAddModal(initialType) {
    showSmartAddModal(this, initialType);
  }

  showMobileMoreMenu() {
    // Show a simple bottom sheet with more nav items
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 z-50 lg:hidden';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const sheet = document.createElement('div');
    sheet.className = 'fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl p-6 z-50 lg:hidden space-y-1';
    sheet.style.paddingBottom = 'calc(32px + env(safe-area-inset-bottom, 0px))';
    sheet.style.maxHeight = '70vh';
    sheet.style.overflowY = 'auto';

    const moreItems = [
      { id: 'budgets', icon: 'pie-chart', label: 'Budgets' },
      { id: 'goals', icon: 'target', label: 'Goals' },
      { id: 'bills', icon: 'receipt', label: 'Bills & Subscriptions' },
      { id: 'family', icon: 'users', label: 'Family' },
      { id: 'reports', icon: 'bar-chart-3', label: 'Reports' },
      { id: 'settings', icon: 'settings', label: 'Settings' },
    ];

    moreItems.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left';
      btn.innerHTML = `<i data-lucide="${item.icon}" class="w-5 h-5 text-gray-500 dark:text-gray-400"></i><span class="text-sm font-medium text-gray-900 dark:text-white">${item.label}</span>`;
      btn.addEventListener('click', () => { overlay.remove(); this.navigateTo(item.id); });
      sheet.appendChild(btn);
    });

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
  }

  /* ================================================================ */
  /*  CHART CLEANUP                                                   */
  /* ================================================================ */

  destroyCharts() {
    this._charts.forEach(c => { try { c.destroy(); } catch {} });
    this._charts = [];
  }

  /* ================================================================ */
  /*  EVENT LISTENERS                                                 */
  /* ================================================================ */

  setupEventListeners() {
    appState.subscribe('currentTab', (tab) => { this.currentTab = tab; });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toast.info('Search opened!');
      }
    });
  }
}

/* ---- Global Error Handlers ------------------------------------- */

window.addEventListener('error', (e) => {
  console.error('[Sakku] Uncaught error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Sakku] Unhandled promise rejection:', e.reason);
});

/* ---- Boot ------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  const app = new SakkuApp();
  window.__app = app;
  app.init();
});

export default SakkuApp;
