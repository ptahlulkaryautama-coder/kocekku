/**
 * Card Components
 * Reusable card primitives for Kocekku 2.0
 */

/**
 * Create a basic card element
 * @param {Object} options
 * @param {HTMLElement|HTMLElement[]} options.content
 * @param {string} options.className
 * @param {boolean} options.hoverable
 * @returns {HTMLElement}
 */
export function Card(options = {}) {
  const {
    content = [],
    className = '',
    hoverable = false
  } = options;
  
  const card = document.createElement('div');
  card.className = `bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${hoverable ? 'hover:shadow-md transition-shadow duration-200' : ''} ${className}`;
  
  if (Array.isArray(content)) {
    content.forEach(el => {
      if (el) card.appendChild(el);
    });
  } else if (content) {
    card.appendChild(content);
  }
  
  return card;
}

/**
 * Create a metric card element
 * @param {Object} options
 * @param {string} options.label - Metric label
 * @param {string|number} options.value - Metric value
 * @param {string} options.icon - Lucide icon name
 * @param {string} options.color - Icon background color class
 * @param {string} options.trend - 'up' | 'down' | 'neutral'
 * @param {number} options.trendValue - Percentage change
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function MetricCard(options = {}) {
  const {
    label = '',
    value = '0',
    icon = 'dollar-sign',
    color = 'bg-primary-100 text-primary-600',
    trend = null,
    trendValue = 0,
    className = ''
  } = options;
  
  const card = document.createElement('div');
  card.className = `bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm ${className}`;
  
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-3';
  
  // Icon container
  const iconContainer = document.createElement('div');
  iconContainer.className = `w-10 h-10 rounded-lg flex items-center justify-center ${color}`;
  
  const iconEl = document.createElement('i');
  iconEl.setAttribute('data-lucide', icon);
  iconEl.className = 'w-5 h-5';
  iconContainer.appendChild(iconEl);
  
  // Trend indicator
  if (trend) {
    const trendBadge = document.createElement('div');
    const trendColor = trend === 'up' ? 'text-success-600' : trend === 'down' ? 'text-danger-600' : 'text-gray-500';
    const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'minus';
    
    trendBadge.className = `flex items-center gap-1 text-sm ${trendColor}`;
    trendBadge.innerHTML = `
      <i data-lucide="${trendIcon}" class="w-4 h-4"></i>
      <span>${Math.abs(trendValue)}%</span>
    `;
    header.appendChild(trendBadge);
  }
  
  header.prepend(iconContainer);
  
  // Label
  const labelEl = document.createElement('p');
  labelEl.className = 'text-sm text-gray-500 dark:text-gray-400 mb-1';
  labelEl.textContent = label;
  
  // Value
  const valueEl = document.createElement('p');
  valueEl.className = 'text-2xl font-semibold text-gray-900 dark:text-white';
  valueEl.textContent = value;
  
  card.appendChild(header);
  card.appendChild(labelEl);
  card.appendChild(valueEl);
  
  return card;
}

/**
 * Create an account card element
 * @param {Object} options
 * @param {string} options.name - Account name
 * @param {string} options.type - Account type
 * @param {number} options.balance - Account balance
 * @param {string} options.currency - Currency code
 * @param {string} options.icon - Account type icon
 * @param {string} options.color - Icon color
 * @param {Function} options.onClick - Click handler
 * @returns {HTMLElement}
 */
export function AccountCard(options = {}) {
  const {
    name = '',
    type = '',
    balance = 0,
    currency = 'IDR',
    icon = 'wallet',
    color = 'bg-primary-100',
    onClick = null
  } = options;
  
  const card = document.createElement('div');
  card.className = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer';
  
  if (onClick) {
    card.addEventListener('click', onClick);
  }
  
  const header = document.createElement('div');
  header.className = 'flex items-center gap-3 mb-3';
  
  // Icon
  const iconContainer = document.createElement('div');
  iconContainer.className = `w-10 h-10 rounded-lg flex items-center justify-center ${color}`;
  
  const iconEl = document.createElement('i');
  iconEl.setAttribute('data-lucide', icon);
  iconEl.className = 'w-5 h-5';
  iconContainer.appendChild(iconEl);
  
  // Name and type
  const nameContainer = document.createElement('div');
  nameContainer.className = 'flex-1 min-w-0';
  
  const nameEl = document.createElement('p');
  nameEl.className = 'font-medium text-gray-900 dark:text-white truncate';
  nameEl.textContent = name;
  
  const typeEl = document.createElement('p');
  typeEl.className = 'text-sm text-gray-500 dark:text-gray-400';
  typeEl.textContent = type;
  
  nameContainer.appendChild(nameEl);
  nameContainer.appendChild(typeEl);
  
  header.appendChild(iconContainer);
  header.appendChild(nameContainer);
  
  // Balance
  const balanceEl = document.createElement('p');
  balanceEl.className = 'text-lg font-semibold text-gray-900 dark:text-white';
  balanceEl.textContent = `${currency} ${balance.toLocaleString()}`;
  
  card.appendChild(header);
  card.appendChild(balanceEl);
  
  return card;
}
