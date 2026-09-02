/**
 * Modal Components
 * Reusable modal primitives for Sakku
 */

/**
 * Create a modal element
 * @param {Object} options
 * @param {string} options.title
 * @param {HTMLElement|HTMLElement[]} options.content
 * @param {string} options.size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} options.closeOnBackdrop
 * @param {Function} options.onClose
 * @returns {HTMLElement}
 */
export function Modal(options = {}) {
  const {
    title = '',
    content = [],
    size = 'md',
    closeOnBackdrop = true,
    onClose = null
  } = options;
  
  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 opacity-0 transition-opacity duration-200';
  
  // Modal container
  const container = document.createElement('div');
  container.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
  
  // Modal panel
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };
  
  const panel = document.createElement('div');
  panel.className = `bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${sizeClasses[size] || sizeClasses.md} transform scale-95 opacity-0 transition-all duration-200`;
  
  // Header
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700';
  
  const titleEl = document.createElement('h3');
  titleEl.className = 'text-lg font-semibold text-gray-900 dark:text-white';
  titleEl.textContent = title;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';
  closeBtn.innerHTML = '<i data-lucide="x" class="w-5 h-5 text-gray-500"></i>';
  closeBtn.addEventListener('click', () => closeModal());
  
  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  
  // Body
  const body = document.createElement('div');
  body.className = 'px-6 py-4 max-h-[60vh] overflow-y-auto';
  
  if (Array.isArray(content)) {
    content.forEach(el => {
      if (el) body.appendChild(el);
    });
  } else if (content) {
    body.appendChild(content);
  }
  
  // Assemble
  panel.appendChild(header);
  panel.appendChild(body);
  container.appendChild(panel);
  
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal hidden';
  modal.appendChild(backdrop);
  modal.appendChild(container);
  
  // Open animation
  const openModal = () => {
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
      panel.classList.remove('scale-95', 'opacity-0');
      panel.classList.add('scale-100', 'opacity-100');
    });
  };
  
  // Close function
  const closeModal = () => {
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    panel.classList.remove('scale-100', 'opacity-100');
    panel.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
      modal.classList.add('hidden');
      if (onClose) onClose();
    }, 200);
  };
  
  // Backdrop click
  if (closeOnBackdrop) {
    backdrop.addEventListener('click', closeModal);
  }
  
  // Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Expose methods
  modal.open = openModal;
  modal.close = closeModal;
  modal.body = body;
  
  return modal;
}

/**
 * Create a confirmation dialog
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} options.confirmText
 * @param {string} options.cancelText
 * @param {string} options.type - 'warning' | 'danger' | 'info'
 * @param {Function} options.onConfirm
 * @param {Function} options.onCancel
 * @returns {HTMLElement}
 */
export function ConfirmDialog(options = {}) {
  const {
    title = 'Confirm',
    message = 'Are you sure?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    onConfirm = null,
    onCancel = null
  } = options;
  
  const typeConfig = {
    warning: {
      icon: 'alert-triangle',
      iconBg: 'bg-warning-100',
      iconColor: 'text-warning-600',
      confirmBtn: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500'
    },
    danger: {
      icon: 'alert-circle',
      iconBg: 'bg-danger-100',
      iconColor: 'text-danger-600',
      confirmBtn: 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500'
    },
    info: {
      icon: 'info',
      iconBg: 'bg-info-100',
      iconColor: 'text-info-600',
      confirmBtn: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
    }
  };
  
  const config = typeConfig[type] || typeConfig.warning;
  
  // Content container
  const content = document.createElement('div');
  content.className = 'flex flex-col items-center text-center';
  
  // Icon
  const iconContainer = document.createElement('div');
  iconContainer.className = `w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center mb-4`;
  iconContainer.innerHTML = `<i data-lucide="${config.icon}" class="w-6 h-6 ${config.iconColor}"></i>`;
  
  // Message
  const messageEl = document.createElement('p');
  messageEl.className = 'text-gray-600 dark:text-gray-400 mb-6';
  messageEl.textContent = message;
  
  // Buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex gap-3 w-full';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium';
  cancelBtn.textContent = cancelText;
  cancelBtn.addEventListener('click', () => {
    if (onCancel) onCancel();
  });
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = `flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.confirmBtn}`;
  confirmBtn.textContent = confirmText;
  confirmBtn.addEventListener('click', () => {
    if (onConfirm) onConfirm();
  });
  
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(confirmBtn);
  
  content.appendChild(iconContainer);
  content.appendChild(messageEl);
  content.appendChild(buttonContainer);
  
  // Create modal
  const modal = Modal({
    title,
    content,
    size: 'sm',
    closeOnBackdrop: false,
    onClose: onCancel
  });
  
  return modal;
}
