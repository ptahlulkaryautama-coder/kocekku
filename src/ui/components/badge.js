/**
 * Badge and Avatar Components
 * Reusable display primitives for Kocekku 2.0
 */

/**
 * Create a badge element
 * @param {Object} options
 * @param {string} options.text
 * @param {string} options.variant - 'default' | 'success' | 'warning' | 'danger' | 'info'
 * @param {string} options.size - 'sm' | 'md'
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function Badge(options = {}) {
  const {
    text = '',
    variant = 'default',
    size = 'sm',
    className = ''
  } = options;
  
  const badge = document.createElement('span');
  
  const baseClasses = 'inline-flex items-center font-medium rounded-full';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  };
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    success: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
    danger: 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400',
    info: 'bg-info-100 text-info-800 dark:bg-info-900/30 dark:text-info-400'
  };
  
  badge.className = `${baseClasses} ${sizeClasses[size] || sizeClasses.sm} ${variantClasses[variant] || variantClasses.default} ${className}`;
  badge.textContent = text;
  
  return badge;
}

/**
 * Create an avatar element
 * @param {Object} options
 * @param {string} options.name - User name (for initials fallback)
 * @param {string} options.src - Image URL
 * @param {string} options.size - 'sm' | 'md' | 'lg'
 * @param {string} options.color - Background color for initials
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function Avatar(options = {}) {
  const {
    name = '',
    src = null,
    size = 'md',
    color = 'bg-primary-100 text-primary-600',
    className = ''
  } = options;
  
  const container = document.createElement('div');
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };
  
  container.className = `${sizeClasses[size] || sizeClasses.md} rounded-full flex items-center justify-center font-medium ${color} ${className}`;
  
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    img.className = 'w-full h-full rounded-full object-cover';
    container.appendChild(img);
  } else {
    // Show initials
    const initials = getInitials(name);
    container.textContent = initials;
  }
  
  return container;
}

/**
 * Get initials from a name
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Create a status dot indicator
 * @param {Object} options
 * @param {string} options.status - 'active' | 'inactive' | 'warning' | 'error'
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function StatusDot(options = {}) {
  const {
    status = 'active',
    className = ''
  } = options;
  
  const dot = document.createElement('span');
  
  const statusClasses = {
    active: 'bg-success-500',
    inactive: 'bg-gray-400',
    warning: 'bg-warning-500',
    error: 'bg-danger-500'
  };
  
  dot.className = `w-2 h-2 rounded-full ${statusClasses[status] || statusClasses.active} ${className}`;
  
  return dot;
}
