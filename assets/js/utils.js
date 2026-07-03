/**
 * LedgerPulse — Utilities
 * ======================
 * Shared helper functions used across all modules.
 *
 * Sections:
 *  - Toast Notifications
 *  - Currency & Number Formatting
 *  - Date & Time Formatting
 *  - String Utilities
 *  - DOM Helpers
 *  - Validation
 *  - Debounce / Throttle
 */

const Utils = (() => {

  // ═══════════════════════════════════════════════════════════════════════════
  // TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // Duration each toast is visible (ms) before auto-dismiss
  const TOAST_DURATION = 4000;

  /**
   * Ensure the toast container exists in the DOM.
   * Creates it if not present.
   * @returns {HTMLElement}
   */
  function _getToastContainer() {
    let container = document.getElementById('tf-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tf-toast-container';
      container.className = 'toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Icon map for each toast type.
   */
  const TOAST_ICONS = {
    success: 'fa-solid fa-circle-check',
    danger:  'fa-solid fa-circle-xmark',
    warning: 'fa-solid fa-triangle-exclamation',
    info:    'fa-solid fa-circle-info',
  };

  /**
   * Show a toast notification.
   * @param {Object} options
   * @param {string} options.title    — bold heading
   * @param {string} options.message  — body text (optional)
   * @param {'success'|'danger'|'warning'|'info'} options.type
   * @param {number} options.duration — ms before auto-close (default 4000)
   */
  function toast({ title, message = '', type = 'info', duration = TOAST_DURATION }) {
    const container = _getToastContainer();

    // Build toast element
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <div class="toast-icon">
        <i class="${TOAST_ICONS[type] || TOAST_ICONS.info}"></i>
      </div>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(title)}</div>
        ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close notification">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    // Close button
    el.querySelector('.toast-close').addEventListener('click', () => _dismissToast(el));

    container.appendChild(el);

    // Auto-dismiss after duration
    const timer = setTimeout(() => _dismissToast(el), duration);

    // Store timer reference so manual close can cancel it
    el._dismissTimer = timer;
  }

  /**
   * Animate out and remove a toast element.
   * @param {HTMLElement} el
   * @private
   */
  function _dismissToast(el) {
    if (!el || el._dismissed) return;
    el._dismissed = true;
    clearTimeout(el._dismissTimer);
    el.classList.add('toast-exit');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    // Fallback removal after 500ms if animation doesn't fire
    setTimeout(() => el.remove(), 500);
  }

  // Convenience wrappers
  const toastSuccess = (title, message) => toast({ title, message, type: 'success' });
  const toastError   = (title, message) => toast({ title, message, type: 'danger'  });
  const toastWarning = (title, message) => toast({ title, message, type: 'warning' });
  const toastInfo    = (title, message) => toast({ title, message, type: 'info'    });

  // ═══════════════════════════════════════════════════════════════════════════
  // CURRENCY & NUMBER FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Format a number as Nigerian Naira currency.
   * @param {number} amount
   * @param {boolean} compact — use compact notation (e.g. ₦1.2M) for large numbers
   * @returns {string}
   */
  function formatCurrency(amount, compact = false) {
    const settings = window.Storage?.getSettings() || {};
    const symbol   = settings.currencySymbol || '₦';
    const num      = Number(amount) || 0;

    if (compact && num >= 1_000_000) {
      return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
    }
    if (compact && num >= 1_000) {
      return `${symbol}${(num / 1_000).toFixed(1)}K`;
    }

    return `${symbol}${num.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Format a plain number with locale-aware commas.
   * @param {number} num
   * @returns {string}
   */
  function formatNumber(num) {
    return Number(num || 0).toLocaleString('en-NG');
  }

  /**
   * Format a percentage.
   * @param {number} value
   * @param {number} decimals
   * @returns {string}
   */
  function formatPercent(value, decimals = 1) {
    return `${Number(value || 0).toFixed(decimals)}%`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE & TIME FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Format an ISO date string to a human-readable date.
   * @param {string} isoString
   * @returns {string} e.g. "25 Jun 2024"
   */
  function formatDate(isoString) {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-NG', {
        day:   'numeric',
        month: 'short',
        year:  'numeric',
      });
    } catch { return '—'; }
  }

  /**
   * Format an ISO date string to a time string.
   * @param {string} isoString
   * @returns {string} e.g. "2:34 PM"
   */
  function formatTime(isoString) {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleTimeString('en-NG', {
        hour:   '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch { return '—'; }
  }

  /**
   * Format date + time together.
   * @param {string} isoString
   * @returns {string} e.g. "25 Jun 2024, 2:34 PM"
   */
  function formatDateTime(isoString) {
    if (!isoString) return '—';
    return `${formatDate(isoString)}, ${formatTime(isoString)}`;
  }

  /**
   * Return a relative time string.
   * @param {string} isoString
   * @returns {string} e.g. "3 hours ago", "yesterday", "just now"
   */
  function timeAgo(isoString) {
    if (!isoString) return '—';
    const diff  = Date.now() - new Date(isoString).getTime();
    const secs  = Math.floor(diff / 1000);
    const mins  = Math.floor(secs  / 60);
    const hours = Math.floor(mins  / 60);
    const days  = Math.floor(hours / 24);

    if (secs  < 60)    return 'just now';
    if (mins  < 60)    return `${mins}m ago`;
    if (hours < 24)    return `${hours}h ago`;
    if (days  === 1)   return 'yesterday';
    if (days  < 7)     return `${days}d ago`;
    return formatDate(isoString);
  }

  /**
   * Get the current date as a YYYY-MM-DD string (for input[type=date]).
   * @returns {string}
   */
  function todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get a date N days ago as YYYY-MM-DD.
   * @param {number} n
   * @returns {string}
   */
  function daysAgoISO(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Escape HTML special characters to prevent XSS.
   * Must be used whenever inserting user data into innerHTML.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#039;');
  }

  /**
   * Truncate a string to maxLength, appending ellipsis if needed.
   * @param {string} str
   * @param {number} maxLength
   * @returns {string}
   */
  function truncate(str, maxLength = 40) {
    if (!str) return '';
    return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
  }

  /**
   * Capitalise first letter of a string.
   * @param {string} str
   * @returns {string}
   */
  function capitalise(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Get initials from a full name (up to 2 characters).
   * @param {string} name
   * @returns {string} e.g. "AU" from "Admin User"
   */
  function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Generate a slug from a string (lowercase, hyphens).
   * @param {string} str
   * @returns {string}
   */
  function slugify(str) {
    return String(str || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOM HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Shorthand querySelector.
   * @param {string} selector
   * @param {HTMLElement} context
   * @returns {HTMLElement|null}
   */
  const $ = (selector, context = document) => context.querySelector(selector);

  /**
   * Shorthand querySelectorAll returning Array.
   * @param {string} selector
   * @param {HTMLElement} context
   * @returns {HTMLElement[]}
   */
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  /**
   * Show a DOM element (removes d-none class).
   * @param {HTMLElement|string} el
   */
  function show(el) {
    const node = typeof el === 'string' ? $(el) : el;
    node?.classList.remove('d-none');
  }

  /**
   * Hide a DOM element (adds d-none class).
   * @param {HTMLElement|string} el
   */
  function hide(el) {
    const node = typeof el === 'string' ? $(el) : el;
    node?.classList.add('d-none');
  }

  /**
   * Toggle visibility of a DOM element.
   * @param {HTMLElement|string} el
   */
  function toggle(el) {
    const node = typeof el === 'string' ? $(el) : el;
    node?.classList.toggle('d-none');
  }

  /**
   * Render an empty state into a container.
   * @param {HTMLElement} container
   * @param {Object} options
   * @param {string} options.icon    — FA icon class
   * @param {string} options.title
   * @param {string} options.desc
   * @param {string} options.action  — optional CTA button HTML
   */
  function renderEmptyState(container, { icon = 'fa-box-open', title, desc, action = '' }) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in">
        <div class="empty-state-icon">
          <i class="fa-solid ${icon}"></i>
        </div>
        <p class="empty-state-title">${escapeHtml(title)}</p>
        <p class="empty-state-desc">${escapeHtml(desc)}</p>
        ${action}
      </div>
    `;
  }

  /**
   * Render skeleton loader rows into a table body.
   * @param {HTMLElement} tbody
   * @param {number} rows
   * @param {number} cols
   */
  function renderTableSkeleton(tbody, rows = 5, cols = 5) {
    tbody.innerHTML = Array.from({ length: rows }, () => `
      <tr>
        ${Array.from({ length: cols }, () => `
          <td><div class="skeleton" style="height:16px;border-radius:4px;"></div></td>
        `).join('')}
      </tr>
    `).join('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate an email address format.
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Check if a value is a non-negative number.
   * @param {*} value
   * @returns {boolean}
   */
  function isPositiveNumber(value) {
    return !isNaN(value) && Number(value) >= 0;
  }

  /**
   * Validate a product form. Returns { valid, errors }.
   * @param {Object} data
   * @returns {{ valid: boolean, errors: Object }}
   */
  function validateProduct(data) {
    const errors = {};
    if (!data.name?.trim())         errors.name      = 'Product name is required';
    if (!data.sku?.trim())          errors.sku       = 'SKU is required';
    if (!isPositiveNumber(data.price))  errors.price = 'Valid selling price required';
    if (!isPositiveNumber(data.stock))  errors.stock = 'Valid stock quantity required';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Debounce: delays execution until after `wait` ms of inactivity.
   * Ideal for search inputs.
   * @param {Function} fn
   * @param {number} wait — ms
   * @returns {Function}
   */
  function debounce(fn, wait = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /**
   * Throttle: ensures `fn` is called at most once per `limit` ms.
   * @param {Function} fn
   * @param {number} limit — ms
   * @returns {Function}
   */
  function throttle(fn, limit = 300) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get stock status for a product.
   * @param {Object} product — { stock, reorderLevel }
   * @returns {{ label: string, badgeClass: string, dotClass: string }}
   */
  function getStockStatus(product) {
    const stock   = product.stock || 0;
    const reorder = product.reorderLevel || 10;

    if (stock === 0) {
      return { label: 'Out of Stock',  badgeClass: 'badge-danger',  dotClass: 'dot-danger'  };
    }
    if (stock <= reorder) {
      return { label: 'Low Stock',     badgeClass: 'badge-warning', dotClass: 'dot-warning' };
    }
    return   { label: 'In Stock',      badgeClass: 'badge-success', dotClass: 'dot-success' };
  }

  /**
   * Check for low-stock products and create alerts.
   * Runs automatically after any stock change.
   */
  function checkLowStockAlerts() {
    const products  = window.Storage?.getProducts() || [];
    const settings  = window.Storage?.getSettings() || {};
    const threshold = settings.lowStockThreshold || 10;

    products.forEach((product) => {
      if (!product.active) return;
      const stock = product.stock || 0;

      if (stock === 0) {
        window.Storage?.addAlert({
          type:        'danger',
          title:       'Out of Stock',
          message:     `${product.name} is completely out of stock.`,
          productId:   product.id,
          productName: product.name,
        });
      } else if (stock <= product.reorderLevel || stock <= threshold) {
        window.Storage?.addAlert({
          type:        'warning',
          title:       'Low Stock Alert',
          message:     `${product.name} has only ${stock} ${product.unit || 'units'} remaining.`,
          productId:   product.id,
          productName: product.name,
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORT / ANALYTICS HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Summarise a sales array into key metrics.
   * @param {Array} sales
   * @returns {Object}
   */
  function summariseSales(sales) {
    const totalRevenue   = sales.reduce((s, sale) => s + (sale.total    || 0), 0);
    const totalVAT       = sales.reduce((s, sale) => s + (sale.vatAmount|| 0), 0);
    const totalDiscount  = sales.reduce((s, sale) => s + (sale.discount  || 0), 0);
    const avgTransaction = sales.length ? totalRevenue / sales.length : 0;
    const totalItems     = sales.reduce((s, sale) =>
      s + (sale.items?.reduce((si, i) => si + i.quantity, 0) || 0), 0);

    return {
      transactions:   sales.length,
      totalRevenue,
      totalVAT,
      totalDiscount,
      avgTransaction,
      totalItems,
    };
  }

  /**
   * Get the top N selling products by quantity sold.
   * @param {Array} sales
   * @param {number} topN
   * @returns {Array} sorted array of { productId, productName, totalQty, totalRevenue }
   */
  function getTopProducts(sales, topN = 5) {
    const map = {};

    sales.forEach((sale) => {
      (sale.items || []).forEach(({ productId, productName, quantity, subtotal }) => {
        if (!map[productId]) {
          map[productId] = { productId, productName, totalQty: 0, totalRevenue: 0 };
        }
        map[productId].totalQty     += quantity;
        map[productId].totalRevenue += subtotal;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, topN);
  }

  /**
   * Group sales by day, returning an array of { date, revenue, count }.
   * @param {Array} sales
   * @param {number} days — number of days to include
   * @returns {Array}
   */
  function groupSalesByDay(sales, days = 7) {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];

      const daySales = sales.filter((s) => s.createdAt?.startsWith(dateKey));
      result.push({
        date:    dateKey,
        label:   d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric' }),
        revenue: daySales.reduce((s, x) => s + (x.total || 0), 0),
        count:   daySales.length,
      });
    }
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  return {
    // Toasts
    toast, toastSuccess, toastError, toastWarning, toastInfo,

    // Formatting
    formatCurrency, formatNumber, formatPercent,
    formatDate, formatTime, formatDateTime, timeAgo, todayISO, daysAgoISO,

    // Strings
    escapeHtml, truncate, capitalise, getInitials, slugify,

    // DOM
    $, $$, show, hide, toggle,
    renderEmptyState, renderTableSkeleton,

    // Validation
    isValidEmail, isPositiveNumber, validateProduct,

    // Performance
    debounce, throttle,

    // Inventory
    getStockStatus, checkLowStockAlerts,

    // Analytics
    summariseSales, getTopProducts, groupSalesByDay,
  };

})();

window.Utils = Utils;