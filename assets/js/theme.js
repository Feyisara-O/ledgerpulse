/**
 * TradeFlow — Theme Manager
 * ==========================
 * Manages light/dark mode toggling, persistence via localStorage,
 * and DOM application of the correct theme.
 *
 * Usage:
 *   Theme.init()              — call once on page load
 *   Theme.toggle()            — switch between light and dark
 *   Theme.set('dark')         — set a specific theme
 *   Theme.current()           — returns 'light' or 'dark'
 */

const Theme = (() => {

  // The HTML attribute we use to drive all CSS variable switching
  const ATTR = 'data-theme';

  /**
   * Get the currently active theme.
   * @returns {'light'|'dark'}
   */
  function current() {
    return document.documentElement.getAttribute(ATTR) || 'light';
  }

  /**
   * Apply a theme to the document root.
   * Also updates all toggle button icons on the page.
   * @param {'light'|'dark'} theme
   */
  function apply(theme) {
    const validTheme = theme === 'dark' ? 'dark' : 'light';

    // Apply to document
    document.documentElement.setAttribute(ATTR, validTheme);

    // Persist
    window.Storage?.saveTheme(validTheme);

    // Update all theme toggle buttons on the page
    _updateToggleButtons(validTheme);
  }

  /**
   * Toggle between light and dark.
   */
  function toggle() {
    apply(current() === 'dark' ? 'light' : 'dark');
  }

  /**
   * Set a specific theme.
   * @param {'light'|'dark'} theme
   */
  function set(theme) {
    apply(theme);
  }

  /**
   * Initialise theme on page load.
   * Reads from storage, falls back to system preference, then defaults to light.
   */
  function init() {
    // 1. Try stored preference
    const stored = window.Storage?.getTheme();
    if (stored === 'light' || stored === 'dark') {
      apply(stored);
      return;
    }

    // 2. Fall back to OS/browser preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      apply('dark');
      return;
    }

    // 3. Default to light
    apply('light');
  }

  /**
   * Update all .theme-toggle buttons with the correct icon.
   * @param {'light'|'dark'} theme
   * @private
   */
  function _updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle');
    buttons.forEach((btn) => {
      const icon = btn.querySelector('i');
      if (!icon) return;

      if (theme === 'dark') {
        // Show sun icon — click will switch to light
        icon.className = 'fa-solid fa-sun';
        btn.setAttribute('title', 'Switch to light mode');
        btn.setAttribute('aria-label', 'Switch to light mode');
      } else {
        // Show moon icon — click will switch to dark
        icon.className = 'fa-solid fa-moon';
        btn.setAttribute('title', 'Switch to dark mode');
        btn.setAttribute('aria-label', 'Switch to dark mode');
      }
    });
  }

  /**
   * Bind click events to all .theme-toggle buttons.
   * Call after DOM is ready.
   */
  function bindToggleButtons() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-toggle')) {
        toggle();
      }
    });
  }

  // Public API
  return { init, apply, toggle, set, current, bindToggleButtons };

})();

window.Theme = Theme;