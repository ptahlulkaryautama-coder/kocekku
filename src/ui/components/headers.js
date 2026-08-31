/**
 * Header Components
 * PageHeader and SectionHeader primitives for Kocekku 2.0
 */

/**
 * Create a page header element
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.subtitle
 * @param {HTMLElement|HTMLElement[]} options.actions
 * @param {HTMLElement} options.breadcrumb
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function PageHeader(options = {}) {
  const {
    title = '',
    subtitle = '',
    actions = [],
    breadcrumb = null,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `mb-6 ${className}`;
  
  // Breadcrumb
  if (breadcrumb) {
    container.appendChild(breadcrumb);
  }
  
  // Title row
  const titleRow = document.createElement('div');
  titleRow.className = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
  
  // Title content
  const titleContent = document.createElement('div');
  
  const titleEl = document.createElement('h1');
  titleEl.className = 'text-2xl font-bold text-gray-900 dark:text-white';
  titleEl.textContent = title;
  
  titleContent.appendChild(titleEl);
  
  if (subtitle) {
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'text-sm text-gray-500 dark:text-gray-400 mt-1';
    subtitleEl.textContent = subtitle;
    titleContent.appendChild(subtitleEl);
  }
  
  titleRow.appendChild(titleContent);
  
  // Actions
  if (actions.length > 0) {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'flex items-center gap-2';
    
    const actionArray = Array.isArray(actions) ? actions : [actions];
    actionArray.forEach(action => {
      if (action) actionsContainer.appendChild(action);
    });
    
    titleRow.appendChild(actionsContainer);
  }
  
  container.appendChild(titleRow);
  
  return container;
}

/**
 * Create a section header element
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.subtitle
 * @param {HTMLElement} options.action
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function SectionHeader(options = {}) {
  const {
    title = '',
    subtitle = '',
    action = null,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `flex items-center justify-between mb-4 ${className}`;
  
  // Title content
  const titleContent = document.createElement('div');
  
  const titleEl = document.createElement('h2');
  titleEl.className = 'text-lg font-semibold text-gray-900 dark:text-white';
  titleEl.textContent = title;
  
  titleContent.appendChild(titleEl);
  
  if (subtitle) {
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'text-sm text-gray-500 dark:text-gray-400 mt-0.5';
    subtitleEl.textContent = subtitle;
    titleContent.appendChild(subtitleEl);
  }
  
  container.appendChild(titleContent);
  
  // Action
  if (action) {
    container.appendChild(action);
  }
  
  return container;
}
