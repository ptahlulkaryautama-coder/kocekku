/**
 * Application State Management
 * Centralized state for Sakku
 */

/**
 * Application state store
 * Uses a simple observable pattern for state management
 */
class AppState {
  constructor() {
    this._state = {
      // Navigation
      currentTab: 'home',
      sidebarOpen: true,
      mobileMenuOpen: false,
      
      // Data
      accounts: [],
      transactions: [],
      budgets: [],
      goals: [],
      bills: [],
      familyMembers: [],
      
      // UI State
      isLoading: true,
      isDarkMode: false,
      themeStyle: 'gold',
      language: 'id',
      currency: 'IDR',
      
      // Modal State
      activeModal: null,
      modalData: null,
      
      // Toast State
      toasts: [],
      
      // User Preferences
      user: {
        name: '',
        avatar: ''
      }
    };
    
    this._listeners = new Map();
  }
  
  /**
   * Get current state value
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    if (key) {
      return this._state[key];
    }
    return { ...this._state };
  }
  
  /**
   * Set state value
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    const oldValue = this._state[key];
    this._state[key] = value;
    this._notifyListeners(key, value, oldValue);
  }
  
  /**
   * Update multiple state values
   * @param {Object} updates
   */
  update(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
  
  /**
   * Subscribe to state changes
   * @param {string} key - state key to watch
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(key, callback) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(callback);
    
    return () => {
      this._listeners.get(key)?.delete(callback);
    };
  }
  
  /**
   * Notify listeners of state change
   * @private
   */
  _notifyListeners(key, newValue, oldValue) {
    const listeners = this._listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in state listener for "${key}":`, error);
        }
      });
    }
  }
  
  /**
   * Show a toast notification
   * @param {Object} toast - { type, message, duration }
   */
  showToast(toast) {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast = {
      id,
      type: 'info',
      duration: 3000,
      ...toast
    };
    
    const toasts = [...this._state.toasts, newToast];
    this.set('toasts', toasts);
    
    // Auto-remove after duration
    setTimeout(() => {
      this.removeToast(id);
    }, newToast.duration);
    
    return id;
  }
  
  /**
   * Remove a toast notification
   * @param {string} id
   */
  removeToast(id) {
    const toasts = this._state.toasts.filter(t => t.id !== id);
    this.set('toasts', toasts);
  }
  
  /**
   * Show a modal
   * @param {string} modalName
   * @param {Object} data
   */
  showModal(modalName, data = null) {
    this.update({
      activeModal: modalName,
      modalData: data
    });
  }
  
  /**
   * Close the current modal
   */
  closeModal() {
    this.update({
      activeModal: null,
      modalData: null
    });
  }
  
  /**
   * Confirm action (returns promise)
   * @param {Object} options - { title, message, confirmText, cancelText, type }
   * @returns {Promise<boolean>}
   */
  confirm(options = {}) {
    return new Promise((resolve) => {
      const confirmData = {
        title: options.title || 'Confirm',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        onConfirm: () => {
          this.closeModal();
          resolve(true);
        },
        onCancel: () => {
          this.closeModal();
          resolve(false);
        }
      };
      
      this.showModal('confirm', confirmData);
    });
  }
  
  /**
   * Navigate to a tab
   * @param {string} tab
   */
  navigateTo(tab) {
    this.set('currentTab', tab);
    this.set('mobileMenuOpen', false);
  }
  
  /**
   * Toggle dark mode
   */
  toggleDarkMode() {
    const isDark = !this._state.isDarkMode;
    this.set('isDarkMode', isDark);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('sakku-dark-mode', isDark);
    this.updateWordmarks();
  }

  /**
   * Set theme visual style ('gold' or 'coral')
   */
  setThemeStyle(style) {
    this.set('themeStyle', style);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme-style', style);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sakku-theme-style', style);
    }
  }

  /**
   * Swap all wordmark images between light and dark variants
   */
  updateWordmarks() {
    const isDark = this._state.isDarkMode;
    const src = isDark ? './sakku_wordmark-dark.png' : './sakku_wordmark.png';
    if (typeof document !== 'undefined') {
      document.querySelectorAll('img[data-wordmark]').forEach(img => {
        img.src = src;
      });
    }
  }
  
  /**
   * Initialize state from localStorage
   */
  initialize() {
    // Load theme visual style (Imperial Gold by default)
    let savedThemeStyle = typeof localStorage !== 'undefined' ? localStorage.getItem('sakku-theme-style') : null;
    if (!savedThemeStyle) savedThemeStyle = 'gold';
    this.set('themeStyle', savedThemeStyle);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme-style', savedThemeStyle);
    }

    // Load dark mode preference (bridge: read old key if new key not set)
    let savedDarkMode = typeof localStorage !== 'undefined' ? localStorage.getItem('sakku-dark-mode') : null;
    if (savedDarkMode === null && typeof localStorage !== 'undefined') savedDarkMode = localStorage.getItem('kocekku-dark-mode');
    if (savedDarkMode === 'true') {
      this.set('isDarkMode', true);
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.classList.add('dark');
      }
    }
    this.updateWordmarks();
    
    // Load language preference (bridge)
    let savedLanguage = localStorage.getItem('sakku-language');
    if (savedLanguage === null) savedLanguage = localStorage.getItem('kocekku-language');
    if (savedLanguage) {
      this.set('language', savedLanguage);
    } else {
      this.set('language', 'id');
    }
    
    // Load currency preference (bridge)
    let savedCurrency = localStorage.getItem('sakku-currency');
    if (savedCurrency === null) savedCurrency = localStorage.getItem('kocekku-currency');
    if (savedCurrency) {
      this.set('currency', savedCurrency);
    }
  }
}

// Singleton instance
export const appState = new AppState();
export default appState;
