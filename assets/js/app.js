/**
 * TradeFlow — App Bootstrapper
 * ==============================
 * Entry point for all authenticated pages (NOT the login page).
 * Responsibilities:
 *  - Register the service worker
 *  - Run auth guard (redirect to login if no session)
 *  - Inject the shared sidebar HTML
 *  - Set up sidebar toggle (collapse / mobile overlay)
 *  - Bind theme toggle
 *  - Set active nav link based on current page
 *  - Populate topbar user info
 *  - Role-based navigation (hide admin-only items for staff)
 *  - Expose a global App.init() for page-level modules to call
 */

const App = (() => {

  // ─── Navigation Items Configuration ──────────────────────────────────────
  // Each item defines: label, icon, href, roles (which roles can see it), badgeId (optional)
  const NAV_ITEMS = [
    {
      section: 'Main',
      items: [
        { label: 'Dashboard',   icon: 'fa-gauge-high',    href: 'dashboard.html',  roles: ['admin', 'staff'] },
        { label: 'Point of Sale', icon: 'fa-cash-register', href: 'pos.html',        roles: ['admin', 'staff'] },
      ]
    },
    {
      section: 'Inventory',
      items: [
        { label: 'Inventory',   icon: 'fa-boxes-stacked', href: 'inventory.html',  roles: ['admin', 'staff'] },
        { label: 'Products',    icon: 'fa-tag',           href: 'products.html',   roles: ['admin'] },
      ]
    },
    {
      section: 'Reports',
      items: [
        { label: 'Sales History', icon: 'fa-receipt',     href: 'sales.html',      roles: ['admin', 'staff'] },
        { label: 'Reports',       icon: 'fa-chart-bar',   href: 'reports.html',    roles: ['admin'] },
      ]
    },
    {
      section: 'System',
      items: [
        { label: 'Settings',    icon: 'fa-gear',          href: 'settings.html',   roles: ['admin'] },
      ]
    },
  ];

  // ─── Auth Guard ───────────────────────────────────────────────────────────

  /**
   * Redirect to login if no valid session exists.
   * Called immediately on every authenticated page.
   */
  function authGuard() {
    const session = window.Storage?.getSession();
    if (!session) {
      // Redirect to login, preserving intended destination
      const current = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `../index.html?redirect=${current}`;
      return false;
    }
    return true;
  }

  // ─── Sidebar HTML Builder ─────────────────────────────────────────────────

  /**
   * Build and inject the sidebar into #app-sidebar.
   * @param {Object} session — the current user session
   */
  function buildSidebar(session) {
    const sidebarEl = document.getElementById('app-sidebar');
    if (!sidebarEl) return;

    const currentPage = window.location.pathname.split('/').pop();
    const userRole    = session.role || 'staff';

    // Build nav sections HTML
    const navHtml = NAV_ITEMS.map(({ section, items }) => {
      // Filter items by role
      const visibleItems = items.filter((item) => item.roles.includes(userRole));
      if (visibleItems.length === 0) return '';

      const itemsHtml = visibleItems.map(({ label, icon, href, badgeId }) => {
        const isActive = currentPage === href;
        const badge    = badgeId
          ? `<span class="nav-badge" id="${badgeId}">0</span>`
          : '';

        return `
          <li class="nav-item">
            <a href="${href}" class="nav-link ${isActive ? 'active' : ''}" title="${label}">
              <span class="nav-icon"><i class="fa-solid ${icon}"></i></span>
              <span class="nav-label">${label}</span>
              ${badge}
            </a>
          </li>
        `;
      }).join('');

      return `
        <div class="nav-section-label">${section}</div>
        <ul class="list-unstyled mb-0">
          ${itemsHtml}
        </ul>
      `;
    }).join('');

    // User initials for avatar
    const initials = Utils.getInitials(session.name);
    const roleBadge = session.role === 'admin'
      ? '<span class="badge badge-primary" style="font-size:0.6rem;">Admin</span>'
      : '<span class="badge badge-neutral" style="font-size:0.6rem;">Staff</span>';

    sidebarEl.innerHTML = `
      <!-- Brand -->
      <a href="dashboard.html" class="sidebar-brand">
        <div class="sidebar-logo-icon">TF</div>
        <div class="sidebar-brand-text">
          <div class="sidebar-brand-name">TradeFlow</div>
          <div class="sidebar-brand-tagline">Management Platform</div>
        </div>
      </a>

      <!-- Navigation -->
      <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
        ${navHtml}
      </nav>

      <!-- Footer: User info -->
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar" style="background:linear-gradient(135deg,#2563EB,#7c3aed);color:white;font-size:0.75rem;">
            ${Utils.escapeHtml(initials)}
          </div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${Utils.escapeHtml(session.name)}</div>
            <div class="sidebar-user-role">${roleBadge}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Topbar Builder ───────────────────────────────────────────────────────

  /**
   * Populate the topbar with user info and action buttons.
   * @param {Object} session
   * @param {string} pageTitle — the title shown in topbar
   */
  function buildTopbar(session, pageTitle = 'Dashboard') {
    // Set page title
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = pageTitle;

    // Set avatar initials
    const avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) avatarEl.textContent = Utils.getInitials(session.name);

    // Set user name in dropdown
    const nameEl = document.getElementById('topbar-username');
    if (nameEl) nameEl.textContent = session.name;

    const roleEl = document.getElementById('topbar-userrole');
    if (roleEl) roleEl.textContent = Utils.capitalise(session.role);
  }

  // ─── Sidebar Toggle Logic ─────────────────────────────────────────────────

  /**
   * Set up sidebar collapse (desktop) and mobile overlay behaviour.
   */
  function initSidebarToggle() {
    const sidebar      = document.getElementById('app-sidebar');
    const appMain      = document.getElementById('app-main');
    const topbar       = document.getElementById('app-topbar');
    const toggleBtn    = document.getElementById('sidebar-toggle-btn');
    const overlay      = document.getElementById('sidebar-overlay');

    if (!sidebar) return;

    const isMobile = () => window.innerWidth <= 768;

    // Read persisted collapsed state (desktop only)
    const wasCollapsed = window.Storage?.get('sidebar_collapsed', false);
    if (wasCollapsed && !isMobile()) {
      sidebar.classList.add('collapsed');
      appMain?.classList.add('sidebar-collapsed');
      topbar?.classList.add('sidebar-collapsed');
    }

    // Toggle button click
    toggleBtn?.addEventListener('click', () => {
      if (isMobile()) {
        // Mobile: show/hide sidebar with overlay
        const isOpen = sidebar.classList.contains('mobile-open');
        sidebar.classList.toggle('mobile-open', !isOpen);
        overlay?.classList.toggle('active', !isOpen);
      } else {
        // Desktop: collapse/expand
        const collapsed = sidebar.classList.toggle('collapsed');
        appMain?.classList.toggle('sidebar-collapsed', collapsed);
        topbar?.classList.toggle('sidebar-collapsed', collapsed);
        window.Storage?.set('sidebar_collapsed', collapsed);
      }
    });

    // Close sidebar on overlay click (mobile)
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });

    // Close sidebar on navigation link click (mobile)
    sidebar.addEventListener('click', (e) => {
      if (isMobile() && e.target.closest('.nav-link')) {
        setTimeout(() => {
          sidebar.classList.remove('mobile-open');
          overlay?.classList.remove('active');
        }, 150);
      }
    });
  }

  // ─── Logout Handler ───────────────────────────────────────────────────────

  /**
   * Log the current user out and redirect to login page.
   */
  function logout() {
    window.Storage?.clearSession();
    window.location.href = '../index.html';
  }

  /**
   * Bind the logout button / link.
   */
  function initLogout() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#logout-btn') || e.target.closest('.logout-btn')) {
        e.preventDefault();
        logout();
      }
    });
  }

  // ─── Alert Badge Updater ──────────────────────────────────────────────────

  /**
   * Update the unread alert badge count in the topbar.
   */
  function updateAlertBadge() {
    const count   = window.Storage?.getUnreadAlertCount() || 0;
    const badge   = document.getElementById('alert-badge');
    if (!badge) return;

    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // ─── Service Worker Registration ─────────────────────────────────────────

  /**
   * Register the service worker for PWA functionality.
   * Fails silently if not supported.
   */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // Path is relative to root, not pages/
    const swPath = window.location.pathname.includes('/pages/')
      ? '../sw.js'
      : './sw.js';

    navigator.serviceWorker
      .register(swPath)
      .then((reg) => console.log('[App] Service Worker registered:', reg.scope))
      .catch((err) => console.warn('[App] Service Worker registration failed:', err));
  }

  // ─── Main Init ────────────────────────────────────────────────────────────

  /**
   * Initialise the app shell. Call this on every authenticated page.
   * @param {Object} options
   * @param {string} options.pageTitle — display name in the topbar
   * @param {Function} options.onReady — called after shell is ready (page-specific init)
   */
  function init({ pageTitle = 'Dashboard', onReady } = {}) {
    // 1. Ensure default data is seeded
    window.Storage?.seedDefaultData();

    // 2. Auth guard — abort if not logged in
    if (!authGuard()) return;

    const session = window.Storage?.getSession();

    // 3. Apply theme immediately (before render to avoid flash)
    window.Theme?.init();
    window.Theme?.bindToggleButtons();

    // 4. Build sidebar
    buildSidebar(session);

    // 5. Build topbar
    buildTopbar(session, pageTitle);

    // 6. Sidebar toggle
    initSidebarToggle();

    // 7. Logout
    initLogout();

    // 8. Alert badge
    updateAlertBadge();

    // 9. Register PWA service worker
    registerServiceWorker();

    // 10. Call page-specific init
    if (typeof onReady === 'function') {
      onReady(session);
    }

    console.log(`[App] Shell ready — Page: ${pageTitle} | User: ${session.name} (${session.role})`);
  }

  // Public API
  return { init, logout, authGuard, updateAlertBadge };

})();

window.App = App;