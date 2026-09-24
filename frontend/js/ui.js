export const el = (id) => document.getElementById(id);

export function showToast(message, type = "info") {
  const container = el("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<div class="toast-message">${escapeHtml(message)}</div><button class="toast-close" aria-label="Close">&times;</button>`;
  toast.querySelector(".toast-close").onclick = () => toast.remove();
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function escapeHtml(str) {
  return str == null ? "" : String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0);
}
