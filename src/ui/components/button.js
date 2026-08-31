/**
 * Button Components
 * Reusable button primitives for Kocekku 2.0
 */

/**
 * Create a button element
 * @param {Object} options
 * @param {string} options.text - Button text
 * @param {string} options.variant - 'primary' | 'secondary' | 'ghost' | 'danger'
 * @param {string} options.size - 'sm' | 'md' | 'lg'
 * @param {string} options.icon - Lucide icon name
 * @param {boolean} options.disabled
 * @param {boolean} options.loading
 * @param {Function} options.onClick
 * @returns {HTMLElement}
 */
export function Button(options = {}) {
  const {
    text = '',
    variant = 'primary',
    size = 'md',
    icon = null,
    disabled = false,
    loading = false,
    onClick = null,
    className = '',
    type = 'button'
  } = options;
  
  const btn = document.createElement('button');
  btn.type = type;
  btn.disabled = disabled || loading;
  
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm',
    secondary: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-primary-500',
    ghost: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500',
    success: 'bg-success-600 text-white hover:bg-success-700 focus:ring-success-500'
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2'
  };
  
  btn.className = `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`;
  
  // Icon
  if (icon && !loading) {
    const iconEl = document.createElement('i');
    iconEl.setAttribute('data-lucide', icon);
    iconEl.className = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
    btn.appendChild(iconEl);
  }
  
  // Loading spinner
  if (loading) {
    const spinner = document.createElement('svg');
    spinner.className = 'animate-spin h-4 w-4';
    spinner.innerHTML = `
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    `;
    btn.appendChild(spinner);
  }
  
  // Text
  if (text) {
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    btn.appendChild(textSpan);
  }
  
  // Click handler
  if (onClick) {
    btn.addEventListener('click', onClick);
  }
  
  return btn;
}

/**
 * Create an icon button element
 * @param {Object} options
 * @param {string} options.icon - Lucide icon name
 * @param {string} options.variant - 'primary' | 'secondary' | 'ghost' | 'danger'
 * @param {string} options.size - 'sm' | 'md' | 'lg'
 * @param {string} options.tooltip
 * @param {boolean} options.disabled
 * @param {Function} options.onClick
 * @returns {HTMLElement}
 */
export function IconButton(options = {}) {
  return Button({
    ...options,
    text: '',
    className: `p-2 ${options.className || ''}`
  });
}
