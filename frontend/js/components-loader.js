/**
 * Job Application Tracker - Component Loader Utility
 * Asynchronously loads modular HTML component partials into placeholder containers
 * before initializing the application lifecycle.
 */

/**
 * Load HTML component into target element
 * @param {string} selector - CSS selector of container element
 * @param {string} componentPath - Path to the component HTML file
 */
export async function loadComponent(selector, componentPath) {
  const target = document.querySelector(selector);
  if (!target) {
    throw new Error(`Target container '${selector}' not found`);
  }

  const response = await fetch(componentPath);
  if (!response.ok) {
    throw new Error(`Failed to load component '${componentPath}': ${response.statusText}`);
  }

  const html = await response.text();
  target.innerHTML = html;
}

/**
 * Load all core UI components in parallel
 */
export async function loadAllComponents() {
  await Promise.all([
    loadComponent("#header-container-slot", "components/header.html"),
    loadComponent("#auth-container-slot", "components/auth-view.html"),
    loadComponent("#dashboard-container-slot", "components/dashboard-view.html"),
    loadComponent("#analytics-container-slot", "components/analytics-view.html"),
    loadComponent("#modals-container-slot", "components/modals.html"),
  ]);
}
