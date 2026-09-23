/**
 * Job Application Tracker - Shared UI Utilities
 * Reusable presentation helpers, toast notifications, string sanitization,
 * and currency formatting.
 */

/**
 * Display a temporary floating toast notification
 * @param {string} message - Text to display
 * @param {'success' | 'error' | 'warning' | 'info'} type - Toast variant
 */
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-message">${escapeHtml(message)}</div>
    <button class="toast-close" title="Close" aria-label="Close notification">&times;</button>
  `;

  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => toast.remove());

  container.appendChild(toast);

  // Automatically dismiss after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

/**
 * Escape HTML characters to prevent XSS injection in dynamic DOM content
 * @param {string|number} str - Content to sanitize
 * @returns {string} - Escaped string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format numerical salary amounts as currency (INR - Indian Rupees)
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}
