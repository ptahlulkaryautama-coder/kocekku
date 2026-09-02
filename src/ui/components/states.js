/**
 * State Components
 * Empty, Loading, and Error state primitives for Sakku
 */

/**
 * Create an empty state element
 * @param {Object} options
 * @param {string} options.icon
 * @param {string} options.title
 * @param {string} options.message
 * @param {HTMLElement} options.action - Optional action button
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function EmptyState(options = {}) {
  const {
    icon = 'inbox',
    title = 'No data yet',
    message = '',
    action = null,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `flex flex-col items-center justify-center py-12 px-4 text-center ${className}`;
  
  // Icon
  const iconContainer = document.createElement('div');
  iconContainer.className = 'w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4';
  iconContainer.innerHTML = `<i data-lucide="${icon}" class="w-8 h-8 text-gray-400"></i>`;
  
  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = 'text-lg font-semibold text-gray-900 dark:text-white mb-2';
  titleEl.textContent = title;
  
  // Message
  const messageEl = document.createElement('p');
  messageEl.className = 'text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6';
  messageEl.textContent = message;
  
  container.appendChild(iconContainer);
  container.appendChild(titleEl);
  container.appendChild(messageEl);
  
  // Action
  if (action) {
    container.appendChild(action);
  }
  
  return container;
}

/**
 * Create a loading state element
 * @param {Object} options
 * @param {string} options.message
 * @param {string} options.size - 'sm' | 'md' | 'lg'
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function LoadingState(options = {}) {
  const {
    message = 'Loading...',
    size = 'md',
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `flex flex-col items-center justify-center py-12 ${className}`;
  
  // Spinner
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };
  
  const spinner = document.createElement('div');
  spinner.className = `${sizeClasses[size] || sizeClasses.md} border-4 border-gray-200 dark:border-gray-700 border-t-primary-600 rounded-full animate-spin mb-4`;
  
  // Message
  const messageEl = document.createElement('p');
  messageEl.className = 'text-sm text-gray-500 dark:text-gray-400';
  messageEl.textContent = message;
  
  container.appendChild(spinner);
  container.appendChild(messageEl);
  
  return container;
}

/**
 * Create an error state element
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} options.errorCode
 * @param {HTMLElement} options.action - Optional retry button
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function ErrorState(options = {}) {
  const {
    title = 'Something went wrong',
    message = 'An error occurred while loading data. Please try again.',
    errorCode = null,
    action = null,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `flex flex-col items-center justify-center py-12 px-4 text-center ${className}`;
  
  // Icon
  const iconContainer = document.createElement('div');
  iconContainer.className = 'w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center mb-4';
  iconContainer.innerHTML = '<i data-lucide="alert-circle" class="w-8 h-8 text-danger-500"></i>';
  
  // Title
  const titleEl = document.createElement('h3');
  titleEl.className = 'text-lg font-semibold text-gray-900 dark:text-white mb-2';
  titleEl.textContent = title;
  
  // Message
  const messageEl = document.createElement('p');
  messageEl.className = 'text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-2';
  messageEl.textContent = message;
  
  container.appendChild(iconContainer);
  container.appendChild(titleEl);
  container.appendChild(messageEl);
  
  // Error code
  if (errorCode) {
    const codeEl = document.createElement('p');
    codeEl.className = 'text-xs text-gray-400 dark:text-gray-500 font-mono mb-4';
    codeEl.textContent = `Error: ${errorCode}`;
    container.appendChild(codeEl);
  }
  
  // Action
  if (action) {
    container.appendChild(action);
  }
  
  return container;
}
