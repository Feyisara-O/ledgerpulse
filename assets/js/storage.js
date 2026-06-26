/**
 * TradeFlow — Storage Manager
 * ============================
 * Centralised LocalStorage interface for the entire application.
 * All data persistence operations must go through this module.
 *
 * Key design decisions:
 * - All keys are namespaced under 'tf_' to avoid collisions
 * - Every read/write is wrapped in try/catch for resilience
 * - Data is always stored as JSON strings
 * - Helper methods handle serialisation / deserialisation transparently
 *
 * Storage Schema (keys):
 *  tf_users         → Array of user objects
 *  tf_session       → Current logged-in user object (or null)
 *  tf_products      → Array of product objects
 *  tf_categories    → Array of category objects
 *  tf_sales         → Array of sale objects
 *  tf_settings      → Business settings object
 *  tf_theme         → 'light' | 'dark'
 *  tf_stock_moves   → Array of stock movement objects
 *  tf_alerts        → Array of alert objects
 *  tf_receipt_seq   → Integer counter for receipt numbers
 */

const Storage = (() => {

  // ─── Namespace Prefix ────────────────────────────────────────────────────────
  const PREFIX = 'tf_';

  /**
   * Build a namespaced key.
   * @param {string} key
   * @returns {string}
   */
  const ns = (key) => `${PREFIX}${key}`;

  // ─── Core Primitives ─────────────────────────────────────────────────────────

  /**
   * Write a value to localStorage as JSON.
   * @param {string} key  — storage key (without prefix)
   * @param {*}      value — any serialisable value
   * @returns {boolean} true on success, false on failure (e.g. storage full)
   */
  function set(key, value) {
    try {
      localStorage.setItem(ns(key), JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[Storage] Failed to write key "${key}":`, err);
      return false;
    }
  }

  /**
   * Read a value from localStorage and parse it.
   * @param {string} key          — storage key (without prefix)
   * @param {*}      defaultValue — returned if key is absent or parse fails
   * @returns {*}
   */
  function get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(ns(key));
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[Storage] Failed to read key "${key}":`, err);
      return defaultValue;
    }
  }

  /**
   * Remove a single key from localStorage.
   * @param {string} key
   */
  function remove(key) {
    try {
      localStorage.removeItem(ns(key));
    } catch (err) {
      console.error(`[Storage] Failed to remove key "${key}":`, err);
    }
  }

  /**
   * Clear ALL TradeFlow keys from localStorage (full reset).
   * Does NOT remove unrelated localStorage entries.
   */
  function clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      return true;
    } catch (err) {
      console.error('[Storage] Failed to clear all:', err);
      return false;
    }
  }

  // ─── Domain-specific helpers ──────────────────────────────────────────────────

  // ── Users ──
  const getUsers      = ()          => get('users', []);
  const setUsers      = (users)     => set('users', users);

  const getUserByEmail = (email)    =>
    getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;

  /**
   * Add a new user. Prevents duplicate emails.
   * @param {Object} user
   * @returns {boolean}
   */
  function addUser(user) {
    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === user.email.toLowerCase())) {
      return false; // duplicate
    }
    users.push({ ...user, id: generateId('usr') });
    return setUsers(users);
  }

  // ── Session (currently logged-in user) ──
  const getSession    = ()          => get('session', null);
  const setSession    = (user)      => set('session', user);
  const clearSession  = ()          => remove('session');
  const isLoggedIn    = ()          => getSession() !== null;

  // ── Products ──
  const getProducts   = ()          => get('products', []);
  const setProducts   = (products)  => set('products', products);

  /**
   * Get a single product by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  const getProductById = (id) =>
    getProducts().find((p) => p.id === id) || null;

  /**
   * Add a new product.
   * @param {Object} product — product data (without id)
   * @returns {Object} the new product with generated id
   */
  function addProduct(product) {
    const products = getProducts();
    const newProduct = {
      ...product,
      id:        generateId('prd'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    setProducts(products);
    return newProduct;
  }

  /**
   * Update a product by ID with partial data.
   * @param {string} id
   * @param {Object} updates
   * @returns {Object|null} the updated product or null if not found
   */
  function updateProduct(id, updates) {
    const products = getProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    products[idx] = { ...products[idx], ...updates, updatedAt: new Date().toISOString() };
    setProducts(products);
    return products[idx];
  }

  /**
   * Soft-delete a product (sets active: false).
   * We never hard-delete products to preserve sales history integrity.
   * @param {string} id
   * @returns {boolean}
   */
  function deactivateProduct(id) {
    return updateProduct(id, { active: false }) !== null;
  }

  // ── Categories ──
  const getCategories  = ()          => get('categories', []);
  const setCategories  = (cats)      => set('categories', cats);

  function addCategory(category) {
    const cats = getCategories();
    const newCat = { ...category, id: generateId('cat') };
    cats.push(newCat);
    setCategories(cats);
    return newCat;
  }

  // ── Sales ──
  const getSales      = ()          => get('sales', []);
  const setSales      = (sales)     => set('sales', sales);

  /**
   * Record a completed sale and decrement product stock.
   * @param {Object} sale — sale payload from POS
   * @returns {Object} the saved sale with receipt number
   */
  function recordSale(sale) {
    const sales = getSales();
    const receiptNumber = generateReceiptNumber();

    const newSale = {
      ...sale,
      id:            generateId('sal'),
      receiptNumber,
      createdAt:     new Date().toISOString(),
    };

    sales.push(newSale);
    setSales(sales);

    // Decrement stock for each item sold
    sale.items.forEach(({ productId, quantity }) => {
      const product = getProductById(productId);
      if (!product) return;
      const newQty = Math.max(0, (product.stock || 0) - quantity);
      updateProduct(productId, { stock: newQty });

      // Record stock movement
      addStockMovement({
        productId,
        productName: product.name,
        type:        'sale',
        quantity:    -quantity,
        note:        `Sold in receipt ${receiptNumber}`,
        balanceAfter: newQty,
      });
    });

    return newSale;
  }

  /**
   * Get sales filtered by date range.
   * @param {string} from — ISO date string (start)
   * @param {string} to   — ISO date string (end)
   * @returns {Array}
   */
  function getSalesByRange(from, to) {
    const fromDate = from ? new Date(from) : null;
    const toDate   = to   ? new Date(to)   : null;

    return getSales().filter(({ createdAt }) => {
      const d = new Date(createdAt);
      if (fromDate && d < fromDate) return false;
      if (toDate   && d > new Date(toDate.setHours(23,59,59,999))) return false;
      return true;
    });
  }

  // ── Settings ──
  const defaultSettings = {
    businessName:    'My Shop',
    businessAddress: 'Lagos, Nigeria',
    businessPhone:   '+234 800 000 0000',
    businessEmail:   '',
    currency:        'NGN',
    currencySymbol:  '₦',
    vatRate:         7.5,
    vatEnabled:      true,
    lowStockThreshold: 10,
    timezone:        'Africa/Lagos',
  };

  const getSettings   = ()            => get('settings', defaultSettings);
  const saveSettings  = (settings)    => set('settings', { ...defaultSettings, ...settings });

  // ── Theme ──
  const getTheme      = ()            => get('theme', 'light');
  const saveTheme     = (theme)       => set('theme', theme);

  // ── Stock Movements ──
  const getStockMovements  = ()       => get('stock_moves', []);
  const setStockMovements  = (moves)  => set('stock_moves', moves);

  /**
   * Add a stock movement record.
   * @param {Object} move — { productId, type, quantity, note, balanceAfter }
   * @returns {Object}
   */
  function addStockMovement(move) {
    const moves = getStockMovements();
    const newMove = {
      ...move,
      id:        generateId('mov'),
      createdAt: new Date().toISOString(),
      createdBy: getSession()?.name || 'System',
    };
    moves.push(newMove);
    setStockMovements(moves);
    return newMove;
  }

  /**
   * Get stock movements for a specific product.
   * @param {string} productId
   * @returns {Array}
   */
  const getMovementsForProduct = (productId) =>
    getStockMovements().filter((m) => m.productId === productId);

  // ── Alerts ──
  const getAlerts     = ()            => get('alerts', []);
  const setAlerts     = (alerts)      => set('alerts', alerts);

  function addAlert(alert) {
    const alerts = getAlerts();
    const newAlert = {
      ...alert,
      id:        generateId('alt'),
      createdAt: new Date().toISOString(),
      read:      false,
    };
    alerts.unshift(newAlert); // newest first
    setAlerts(alerts);
    return newAlert;
  }

  const markAlertRead = (id) => {
    const alerts = getAlerts().map((a) => a.id === id ? { ...a, read: true } : a);
    setAlerts(alerts);
  };

  const getUnreadAlertCount = () => getAlerts().filter((a) => !a.read).length;

  // ── Receipt Sequence ──
  function generateReceiptNumber() {
    const seq  = get('receipt_seq', 1000);
    const next = seq + 1;
    set('receipt_seq', next);
    // Format: TF-2024-1001
    const year = new Date().getFullYear();
    return `TF-${year}-${next}`;
  }

  // ─── Utility Functions ────────────────────────────────────────────────────────

  /**
   * Generate a unique ID with a prefix.
   * Combines a timestamp base-36 string with random chars for collision-resistance.
   * @param {string} prefix
   * @returns {string} e.g. "prd_lx5k2a_r7f"
   */
  function generateId(prefix = 'id') {
    const ts   = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return `${prefix}_${ts}_${rand}`;
  }

  /**
   * Export all app data as a JSON string for backup.
   * @returns {string} JSON backup blob
   */
  function exportBackup() {
    const backup = {
      version:     '1.0.0',
      exportedAt:  new Date().toISOString(),
      products:    getProducts(),
      categories:  getCategories(),
      sales:       getSales(),
      settings:    getSettings(),
      stockMoves:  getStockMovements(),
      alerts:      getAlerts(),
    };
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Import a backup JSON blob back into storage.
   * Users (for security) and session are NOT restored.
   * @param {string} jsonString
   * @returns {{ success: boolean, error?: string }}
   */
  function importBackup(jsonString) {
    try {
      const backup = JSON.parse(jsonString);
      if (!backup.version) throw new Error('Invalid backup format');

      if (backup.products)   setProducts(backup.products);
      if (backup.categories) setCategories(backup.categories);
      if (backup.sales)      setSales(backup.sales);
      if (backup.settings)   saveSettings(backup.settings);
      if (backup.stockMoves) setStockMovements(backup.stockMoves);

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ─── Seeding: Default Data ────────────────────────────────────────────────────

  /**
   * Seed the application with demo users and sample products.
   * Only runs once on first launch (checks tf_seeded flag).
   */
  function seedDefaultData() {
    if (get('seeded', false)) return; // already seeded

    // Default users
    const defaultUsers = [
      {
        id:       generateId('usr'),
        name:     'Admin User',
        email:    'admin@tradeflow.ng',
        password: 'admin123',       // In production this would be hashed
        role:     'admin',
        active:   true,
        createdAt: new Date().toISOString(),
      },
      {
        id:       generateId('usr'),
        name:     'Sales Staff',
        email:    'staff@tradeflow.ng',
        password: 'staff123',
        role:     'staff',
        active:   true,
        createdAt: new Date().toISOString(),
      },
    ];
    setUsers(defaultUsers);

    // Default categories
    const categories = [
      { id: generateId('cat'), name: 'Food & Beverages',  icon: 'fa-utensils',   color: '#10b981' },
      { id: generateId('cat'), name: 'Household Items',   icon: 'fa-home',       color: '#6366f1' },
      { id: generateId('cat'), name: 'Personal Care',     icon: 'fa-heart',      color: '#f43f5e' },
      { id: generateId('cat'), name: 'Grains & Staples',  icon: 'fa-seedling',   color: '#f59e0b' },
      { id: generateId('cat'), name: 'Drinks & Juices',   icon: 'fa-glass-water',color: '#06b6d4' },
    ];
    setCategories(categories);

    const [foodCat, houseCat, careCat, grainCat, drinkCat] = categories;

    // Default products (Nigerian SME context)
    const products = [
      {
        id:          generateId('prd'),
        name:        'Indomie Noodles (Chicken)',
        sku:         'IND-CHK-001',
        category:    foodCat.id,
        categoryName: foodCat.name,
        price:       150,
        costPrice:   110,
        stock:       245,
        reorderLevel: 50,
        unit:         'Pack',
        description: 'Indomie Instant Noodles — Chicken Flavour, 70g',
        supplier:    'Dufil Prima Foods',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Peak Milk (Tin)',
        sku:         'PKM-TIN-001',
        category:    foodCat.id,
        categoryName: foodCat.name,
        price:       1850,
        costPrice:   1400,
        stock:       80,
        reorderLevel: 20,
        unit:         'Tin',
        description: 'Peak Full Cream Evaporated Milk, 400g tin',
        supplier:    'FrieslandCampina WAMCO',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Milo Chocolate Drink',
        sku:         'MIL-CHO-001',
        category:    foodCat.id,
        categoryName: foodCat.name,
        price:       2200,
        costPrice:   1700,
        stock:       12,
        reorderLevel: 15,
        unit:         'Tin',
        description: 'Nestlé Milo Energy Drink, 400g tin',
        supplier:    'Nestlé Nigeria',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Coca-Cola (50cl)',
        sku:         'COC-50CL-001',
        category:    drinkCat.id,
        categoryName: drinkCat.name,
        price:       300,
        costPrice:   220,
        stock:       180,
        reorderLevel: 48,
        unit:         'Bottle',
        description: 'Coca-Cola Carbonated Soft Drink, 500ml PET',
        supplier:    'Nigerian Bottling Company',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Golden Penny Pasta',
        sku:         'GPP-STR-001',
        category:    grainCat.id,
        categoryName: grainCat.name,
        price:       650,
        costPrice:   500,
        stock:       95,
        reorderLevel: 30,
        unit:         'Pack',
        description: 'Golden Penny Spaghetti, 500g',
        supplier:    'Flour Mills of Nigeria',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Dangote Sugar (1kg)',
        sku:         'DNG-SUG-001',
        category:    grainCat.id,
        categoryName: grainCat.name,
        price:       1100,
        costPrice:   850,
        stock:       8,
        reorderLevel: 20,
        unit:         'Bag',
        description: 'Dangote Refined Sugar, 1kg pack',
        supplier:    'Dangote Sugar Refinery',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Stallion Rice (5kg)',
        sku:         'STA-RIC-005',
        category:    grainCat.id,
        categoryName: grainCat.name,
        price:       7500,
        costPrice:   6000,
        stock:       35,
        reorderLevel: 10,
        unit:         'Bag',
        description: 'Stallion Long Grain Parboiled Rice, 5kg',
        supplier:    'Stallion Group',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Dettol Original (250ml)',
        sku:         'DTL-ORG-250',
        category:    careCat.id,
        categoryName: careCat.name,
        price:       950,
        costPrice:   720,
        stock:       0,
        reorderLevel: 10,
        unit:         'Bottle',
        description: 'Dettol Antiseptic Liquid, 250ml',
        supplier:    'Reckitt Benckiser Nigeria',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Omo Washing Powder (500g)',
        sku:         'OMO-WAS-500',
        category:    houseCat.id,
        categoryName: houseCat.name,
        price:       750,
        costPrice:   570,
        stock:       60,
        reorderLevel: 20,
        unit:         'Pack',
        description: 'Omo Multi-Active Washing Powder, 500g',
        supplier:    'Unilever Nigeria',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
      {
        id:          generateId('prd'),
        name:        'Honeywell Semolina (2kg)',
        sku:         'HNW-SEM-002',
        category:    grainCat.id,
        categoryName: grainCat.name,
        price:       1400,
        costPrice:   1100,
        stock:       50,
        reorderLevel: 15,
        unit:         'Pack',
        description: 'Honeywell Semovita Semolina, 2kg pack',
        supplier:    'Honeywell Flour Mills',
        active:      true,
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      },
    ];
    setProducts(products);

    // Default settings
    saveSettings({
      businessName:    'Adekunle General Stores',
      businessAddress: '15 Broad Street, Lagos Island, Lagos State',
      businessPhone:   '+234 802 345 6789',
      businessEmail:   'info@adekunlestores.ng',
      currency:        'NGN',
      currencySymbol:  '₦',
      vatRate:         7.5,
      vatEnabled:      true,
      lowStockThreshold: 10,
      timezone:        'Africa/Lagos',
    });
    
    // Seed some sample sales history (last 7 days)
    seedSampleSales(products);

    // Mark as seeded
    set('seeded', true);
    console.log('[Storage] Default data seeded successfully.');
  }

  /**
   * Generate realistic sample sales for dashboard charts.
   * @param {Array} products
   */
  function seedSampleSales(products) {
    const sales   = [];
    const now     = new Date();
    let   seq     = 1000;

    // 7 days of sales, 3-8 transactions per day
    for (let daysAgo = 7; daysAgo >= 0; daysAgo--) {
      const dayDate = new Date(now);
      dayDate.setDate(now.getDate() - daysAgo);

      const txCount = 3 + Math.floor(Math.random() * 6);

      for (let t = 0; t < txCount; t++) {
        // Pick 1-4 random products
        const itemCount    = 1 + Math.floor(Math.random() * 3);
        const shuffled     = [...products].sort(() => 0.5 - Math.random());
        const selectedProds = shuffled.slice(0, itemCount);

        const items = selectedProds.map((p) => {
          const qty = 1 + Math.floor(Math.random() * 3);
          return {
            productId:    p.id,
            productName:  p.name,
            sku:          p.sku,
            price:        p.price,
            quantity:     qty,
            subtotal:     p.price * qty,
          };
        });

        const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
        const vatRate  = 7.5;
        const vatAmt   = (subtotal * vatRate) / 100;
        const discount = 0;
        const total    = subtotal + vatAmt - discount;

        const saleDate = new Date(dayDate);
        saleDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

        seq++;
        const year = saleDate.getFullYear();

        sales.push({
          id:            generateId('sal'),
          receiptNumber: `TF-${year}-${seq}`,
          items,
          subtotal,
          discount,
          vatRate,
          vatAmount:     vatAmt,
          total,
          paymentMethod: ['cash','transfer','card'][Math.floor(Math.random() * 3)],
          customerName:  '',
          createdAt:     saleDate.toISOString(),
          cashier:       'Admin User',
        });
      }
    }

    setSales(sales);
    set('receipt_seq', seq);
  }

  // ─── Public API ───────────────────────────────────────────────────────────────
  return {
    // Core
    set, get, remove, clearAll,

    // Users & Auth
    getUsers, setUsers, getUserByEmail, addUser,
    getSession, setSession, clearSession, isLoggedIn,

    // Products
    getProducts, setProducts, getProductById,
    addProduct, updateProduct, deactivateProduct,

    // Categories
    getCategories, setCategories, addCategory,

    // Sales
    getSales, setSales, recordSale, getSalesByRange,

    // Settings
    getSettings, saveSettings,

    // Theme
    getTheme, saveTheme,

    // Stock movements
    getStockMovements, addStockMovement, getMovementsForProduct,

    // Alerts
    getAlerts, addAlert, markAlertRead, getUnreadAlertCount,

    // Receipt
    generateReceiptNumber,

    // Utilities
    generateId, exportBackup, importBackup, seedDefaultData,
  };

})();

// Make Storage globally available (ES module alternative for SPCK Editor)
window.Storage = Storage;

