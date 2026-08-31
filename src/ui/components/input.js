/**
 * Input Components
 * Reusable input primitives for Kocekku 2.0
 */

/**
 * Create an input element
 * @param {Object} options
 * @param {string} options.label
 * @param {string} options.type
 * @param {string} options.value
 * @param {string} options.placeholder
 * @param {boolean} options.required
 * @param {boolean} options.disabled
 * @param {string} options.error
 * @param {string} options.helperText
 * @param {Function} options.onChange
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function Input(options = {}) {
  const {
    label = '',
    type = 'text',
    value = '',
    placeholder = '',
    required = false,
    disabled = false,
    error = '',
    helperText = '',
    onChange = null,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `mb-4 ${className}`;
  
  // Label
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';
    labelEl.textContent = label;
    if (required) {
      const asterisk = document.createElement('span');
      asterisk.className = 'text-danger-500 ml-0.5';
      asterisk.textContent = '*';
      labelEl.appendChild(asterisk);
    }
    container.appendChild(labelEl);
  }
  
  // Input element
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.required = required;
  input.disabled = disabled;
  
  const baseClasses = 'w-full px-3 py-2 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed';
  const errorClasses = error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : 'border-gray-300 dark:border-gray-600';
  const darkClasses = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500';
  
  input.className = `${baseClasses} ${errorClasses} ${darkClasses}`;
  
  if (onChange) {
    input.addEventListener('input', onChange);
  }
  
  container.appendChild(input);
  
  // Error message
  if (error) {
    const errorEl = document.createElement('p');
    errorEl.className = 'mt-1.5 text-sm text-danger-600';
    errorEl.textContent = error;
    container.appendChild(errorEl);
  }
  // Helper text
  else if (helperText) {
    const helperEl = document.createElement('p');
    helperEl.className = 'mt-1.5 text-sm text-gray-500 dark:text-gray-400';
    helperEl.textContent = helperText;
    container.appendChild(helperEl);
  }
  
  // Attach input reference for external access
  container.inputElement = input;
  
  return container;
}

/**
 * Create a select element
 * @param {Object} options
 * @param {string} options.label
 * @param {Array} options.options - [{value, label}]
 * @param {string} options.value
 * @param {boolean} options.required
 * @param {boolean} options.disabled
 * @param {string} options.error
 * @param {Function} options.onChange
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function Select(options = {}) {
  const {
    label = '',
    options: selectOptions = [],
    value = '',
    required = false,
    disabled = false,
    error = '',
    onChange = null,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `mb-4 ${className}`;
  
  // Label
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';
    labelEl.textContent = label;
    if (required) {
      const asterisk = document.createElement('span');
      asterisk.className = 'text-danger-500 ml-0.5';
      asterisk.textContent = '*';
      labelEl.appendChild(asterisk);
    }
    container.appendChild(labelEl);
  }
  
  // Select wrapper for custom styling
  const wrapper = document.createElement('div');
  wrapper.className = 'relative';
  
  // Select element
  const select = document.createElement('select');
  select.value = value;
  select.required = required;
  select.disabled = disabled;
  
  const baseClasses = 'w-full px-3 py-2 pr-10 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none';
  const errorClasses = error ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' : 'border-gray-300 dark:border-gray-600';
  const darkClasses = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white';
  
  select.className = `${baseClasses} ${errorClasses} ${darkClasses}`;
  
  // Add options
  selectOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === value) option.selected = true;
    select.appendChild(option);
  });
  
  if (onChange) {
    select.addEventListener('change', onChange);
  }
  
  wrapper.appendChild(select);
  
  // Dropdown icon
  const iconContainer = document.createElement('div');
  iconContainer.className = 'absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none';
  iconContainer.innerHTML = '<i data-lucide="chevron-down" class="w-4 h-4 text-gray-400"></i>';
  wrapper.appendChild(iconContainer);
  
  container.appendChild(wrapper);
  
  // Error message
  if (error) {
    const errorEl = document.createElement('p');
    errorEl.className = 'mt-1.5 text-sm text-danger-600';
    errorEl.textContent = error;
    container.appendChild(errorEl);
  }
  
  container.selectElement = select;
  
  return container;
}

/**
 * Create a search input element
 * @param {Object} options
 * @param {string} options.placeholder
 * @param {Function} options.onSearch
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function SearchInput(options = {}) {
  const {
    placeholder = 'Search...',
    onSearch = null,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `relative ${className}`;
  
  // Search icon
  const icon = document.createElement('div');
  icon.className = 'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none';
  icon.innerHTML = '<i data-lucide="search" class="w-5 h-5 text-gray-400"></i>';
  
  // Input
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  
  const baseClasses = 'w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200';
  
  input.className = baseClasses;
  
  if (onSearch) {
    let debounceTimer;
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onSearch(e.target.value);
      }, 300);
    });
  }
  
  container.appendChild(icon);
  container.appendChild(input);
  container.inputElement = input;
  
  return container;
}
