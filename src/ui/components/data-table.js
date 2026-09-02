/**
 * Data Table Components
 * Reusable table primitives for Sakku
 */

/**
 * Create a data table element
 * @param {Object} options
 * @param {Array} options.columns - [{key, label, width, align, render}]
 * @param {Array} options.data
 * @param {Function} options.onRowClick
 * @param {string} options.emptyMessage
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function DataTable(options = {}) {
  const {
    columns = [],
    data = [],
    onRowClick = null,
    emptyMessage = 'No data available',
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `overflow-hidden ${className}`;
  
  if (data.length === 0) {
    // Empty state
    const empty = document.createElement('div');
    empty.className = 'py-12 text-center text-gray-500 dark:text-gray-400';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return container;
  }
  
  // Table wrapper for horizontal scroll on mobile
  const wrapper = document.createElement('div');
  wrapper.className = 'overflow-x-auto';
  
  const table = document.createElement('table');
  table.className = 'w-full';
  
  // Header
  const thead = document.createElement('thead');
  thead.className = 'border-b border-gray-200 dark:border-gray-700';
  
  const headerRow = document.createElement('tr');
  
  columns.forEach(col => {
    const th = document.createElement('th');
    th.className = `px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : ''}`;
    th.style.width = col.width || 'auto';
    th.textContent = col.label;
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Body
  const tbody = document.createElement('tbody');
  tbody.className = 'divide-y divide-gray-200 dark:divide-gray-700';
  
  data.forEach((row, index) => {
    const tr = document.createElement('tr');
    tr.className = `hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`;
    
    if (onRowClick) {
      tr.addEventListener('click', () => onRowClick(row, index));
    }
    
    columns.forEach(col => {
      const td = document.createElement('td');
      td.className = `px-4 py-3.5 text-sm ${col.align === 'right' ? 'text-right' : 'text-left'}`;
      
      if (col.render) {
        const content = col.render(row[col.key], row, index);
        if (content instanceof HTMLElement) {
          td.appendChild(content);
        } else {
          td.textContent = content;
        }
      } else {
        td.textContent = row[col.key] ?? '';
      }
      
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);
  
  return container;
}

/**
 * Create a transaction row element (for mobile card view)
 * @param {Object} transaction
 * @param {Object} options
 * @param {Function} options.onClick
 * @param {Function} options.formatCurrency
 * @returns {HTMLElement}
 */
export function TransactionRow(transaction, options = {}) {
  const {
    onClick = null,
    formatCurrency = (amount) => `${amount}`
  } = options;
  
  const row = document.createElement('div');
  row.className = 'flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg';
  
  if (onClick) {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => onClick(transaction));
  }
  
  // Type indicator
  const typeIndicator = document.createElement('div');
  const isIncome = transaction.tipe === 'masuk';
  const isTransfer = transaction.tipe === 'transfer';
  
  typeIndicator.className = `w-10 h-10 rounded-full flex items-center justify-center ${
    isIncome ? 'bg-success-100 dark:bg-success-900/30' : 
    isTransfer ? 'bg-info-100 dark:bg-info-900/30' : 
    'bg-gray-100 dark:bg-gray-800'
  }`;
  
  const icon = isIncome ? 'arrow-down-left' : isTransfer ? 'arrow-left-right' : 'arrow-up-right';
  const iconColor = isIncome ? 'text-success-600' : isTransfer ? 'text-info-600' : 'text-gray-600';
  
  typeIndicator.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 ${iconColor}"></i>`;
  
  // Content
  const content = document.createElement('div');
  content.className = 'flex-1 min-w-0';
  
  const description = document.createElement('p');
  description.className = 'font-medium text-gray-900 dark:text-white truncate';
  description.textContent = transaction.keterangan || 'Untitled';
  
  const meta = document.createElement('p');
  meta.className = 'text-sm text-gray-500 dark:text-gray-400';
  meta.textContent = `${transaction.kategori || ''} • ${formatDate(transaction.tanggal)}`;
  
  content.appendChild(description);
  content.appendChild(meta);
  
  // Amount
  const amount = document.createElement('div');
  amount.className = `text-right font-semibold ${
    isIncome ? 'text-success-600' : 'text-gray-900 dark:text-white'
  }`;
  amount.textContent = `${isIncome ? '+' : isTransfer ? '' : '-'}${formatCurrency(transaction.jumlah)}`;
  
  row.appendChild(typeIndicator);
  row.appendChild(content);
  row.appendChild(amount);
  
  return row;
}

/**
 * Format date for display
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}
