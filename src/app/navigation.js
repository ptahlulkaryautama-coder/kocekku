/**
 * Navigation Configuration
 * Defines the navigation structure for Kocekku 2.0
 */

/**
 * Main navigation items
 */
export const NAV_ITEMS = [
  {
    id: 'home',
    label: 'nav.home',
    icon: 'home',
    path: '/'
  },
  {
    id: 'money',
    label: 'nav.money',
    icon: 'wallet',
    children: [
      { id: 'accounts', label: 'nav.accounts', icon: 'credit-card' },
      { id: 'transactions', label: 'nav.transactions', icon: 'list' },
      { id: 'transfers', label: 'nav.transfers', icon: 'arrow-left-right' }
    ]
  },
  {
    id: 'plan',
    label: 'nav.plan',
    icon: 'target',
    children: [
      { id: 'budgets', label: 'nav.budgets', icon: 'pie-chart' },
      { id: 'goals', label: 'nav.goals', icon: 'flag' },
      { id: 'bills', label: 'nav.bills', icon: 'calendar' }
    ]
  },
  {
    id: 'insights',
    label: 'nav.insights',
    icon: 'bar-chart-2',
    children: [
      { id: 'cashflow', label: 'nav.cashFlow', icon: 'trending-up' },
      { id: 'spending', label: 'nav.spending', icon: 'shopping-bag' },
      { id: 'networth', label: 'nav.netWorth', icon: 'dollar-sign' },
      { id: 'health', label: 'nav.health', icon: 'heart-pulse' }
    ]
  },
  {
    id: 'family',
    label: 'nav.family',
    icon: 'users',
    children: [
      { id: 'members', label: 'nav.members', icon: 'user' },
      { id: 'contributions', label: 'nav.contributions', icon: 'pie-chart' }
    ]
  },
  {
    id: 'reports',
    label: 'nav.reports',
    icon: 'file-text'
  },
  {
    id: 'settings',
    label: 'nav.settings',
    icon: 'settings'
  }
];

/**
 * Mobile bottom navigation items
 */
export const MOBILE_NAV_ITEMS = [
  {
    id: 'home',
    label: 'nav.home',
    icon: 'home'
  },
  {
    id: 'money',
    label: 'nav.money',
    icon: 'wallet'
  },
  {
    id: 'add',
    label: '',
    icon: 'plus',
    isAction: true
  },
  {
    id: 'insights',
    label: 'nav.insights',
    icon: 'bar-chart-2'
  },
  {
    id: 'more',
    label: 'nav.more',
    icon: 'menu'
  }
];

/**
 * Mobile "More" menu items
 */
export const MOBILE_MORE_ITEMS = [
  { id: 'plan', label: 'nav.plan', icon: 'target' },
  { id: 'family', label: 'nav.family', icon: 'users' },
  { id: 'reports', label: 'nav.reports', icon: 'file-text' },
  { id: 'settings', label: 'nav.settings', icon: 'settings' }
];

/**
 * Quick action items for the FAB menu
 */
export const QUICK_ACTIONS = [
  { id: 'smart-add', label: 'smartAdd.title', icon: 'zap', description: 'smartAdd.subtitle' },
  { id: 'manual-add', label: 'transactionForm.title', icon: 'edit-3', description: 'transactionForm.title' },
  { id: 'transfer', label: 'nav.transfers', icon: 'arrow-left-right', description: 'nav.transfers' }
];

/**
 * Check if a nav item is active
 * @param {string} itemId
 * @param {string} currentTab
 * @returns {boolean}
 */
export function isNavActive(itemId, currentTab) {
  if (itemId === currentTab) return true;
  
  // Check if current tab is a child of this item
  const parentItem = NAV_ITEMS.find(item => 
    item.children?.some(child => child.id === currentTab)
  );
  
  return parentItem?.id === itemId;
}

/**
 * Get nav item by ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getNavItem(id) {
  // Search top-level items
  const topItem = NAV_ITEMS.find(item => item.id === id);
  if (topItem) return topItem;
  
  // Search child items
  for (const item of NAV_ITEMS) {
    if (item.children) {
      const child = item.children.find(c => c.id === id);
      if (child) return child;
    }
  }
  
  return null;
}

/**
 * Get parent nav item for a child
 * @param {string} childId
 * @returns {Object|null}
 */
export function getParentNavItem(childId) {
  return NAV_ITEMS.find(item => 
    item.children?.some(child => child.id === childId)
  ) || null;
}

/**
 * Check if navigation should show expanded state
 * @param {string} itemId
 * @param {string} currentTab
 * @returns {boolean}
 */
export function shouldExpandNavItem(itemId, currentTab) {
  const item = NAV_ITEMS.find(i => i.id === itemId);
  if (!item?.children) return false;
  
  return item.children.some(child => child.id === currentTab);
}
