/**
 * Toast Component
 * Toast notification system for Kocekku 2.0
 */

/**
 * Toast container reference
 */
let toastContainer = null;

/**
 * Initialize toast container
 * @returns {HTMLElement}
 */
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

/**
 * Show a toast notification
 * @param {Object} options
 * @param {string} options.type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} options.message
 * @param {number} options.duration - Auto-dismiss in ms (default 3000)
 * @param {boolean} options.dismissible
 * @returns {HTMLElement} Toast element
 */
export function Toast(options = {}) {
  const {
    type = 'info',
    message = '',
    duration = 3000,
    dismissible = true
  } = options;
  
  const container = getToastContainer();
  
  const typeConfig = {
    success: {
      icon: 'check-circle',
      bg: 'bg-success-50 dark:bg-success-900/30',
      border: 'border-success-200 dark:border-success-800',
      text: 'text-success-800 dark:text-success-200',
      iconColor: 'text-success-500'
    },
    error: {
      icon: 'x-circle',
      bg: 'bg-danger-50 dark:bg-danger-900/30',
      border: 'border-danger-200 dark:border-danger-800',
      text: 'text-danger-800 dark:text-danger-200',
      iconColor: 'text-danger-500'
    },
    warning: {
      icon: 'alert-triangle',
      bg: 'bg-warning-50 dark:bg-warning-900/30',
      border: 'border-warning-200 dark:border-warning-800',
      text: 'text-warning-800 dark:text-warning-200',
      iconColor: 'text-warning-500'
    },
    info: {
      icon: 'info',
      bg: 'bg-info-50 dark:bg-info-900/30',
      border: 'border-info-200 dark:border-info-800',
      text: 'text-info-800 dark:text-info-200',
      iconColor: 'text-info-500'
    }
  };
  
  const config = typeConfig[type] || typeConfig.info;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${config.bg} ${config.border} transform translate-x-full opacity-0 transition-all duration-300`;
  
  // Icon
  const icon = document.createElement('div');
  icon.className = `flex-shrink-0 ${config.iconColor}`;
  icon.innerHTML = `<i data-lucide="${config.icon}" class="w-5 h-5"></i>`;
  
  // Message
  const messageEl = document.createElement('p');
  messageEl.className = `text-sm font-medium ${config.text}`;
  messageEl.textContent = message;
  
  // Close button (optional)
  if (dismissible) {
    const closeBtn = document.createElement('button');
    closeBtn.className = `ml-2 flex-shrink-0 ${config.iconColor} hover:opacity-70 transition-opacity`;
    closeBtn.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
    closeBtn.addEventListener('click', () => removeToast(toast));
    toast.appendChild(icon);
    toast.appendChild(messageEl);
    toast.appendChild(closeBtn);
  } else {
    toast.appendChild(icon);
    toast.appendChild(messageEl);
  }
  
  // Add to container
  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
    toast.classList.add('translate-x-0', 'opacity-100');
  });
  
  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
  
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  return toast;
}

/**
 * Remove a toast element
 * @param {HTMLElement} toast
 */
function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  
  toast.classList.remove('translate-x-0', 'opacity-100');
  toast.classList.add('translate-x-full', 'opacity-0');
  
  setTimeout(() => {
    toast.remove();
  }, 300);
}

/**
 * Convenience methods
 */
export const toast = {
  success: (message, options = {}) => Toast({ type: 'success', message, ...options }),
  error: (message, options = {}) => Toast({ type: 'error', message, duration: 5000, ...options }),
  warning: (message, options = {}) => Toast({ type: 'warning', message, ...options }),
  info: (message, options = {}) => Toast({ type: 'info', message, ...options })
};

export default Toast;
