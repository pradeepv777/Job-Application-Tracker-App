/**
 * Job Application Tracker - Analytics Module
 * Fetches and renders aggregated placement pipeline analytics:
 * salary ranges, application status counts, success rates, and interview funnel.
 */

import { Api } from "./api.js";
import { showToast, formatCurrency } from "./ui.js";

/**
 * Fetch and render analytics data
 */
export async function loadAnalytics() {
  const loading = document.getElementById("analytics-loading");
  const content = document.getElementById("analytics-content");

  try {
    loading.style.display = "block";
    content.style.display = "none";

    const data = await Api.getAnalytics();

    // Salary statistics
    document.getElementById("analytics-avg-salary").textContent = formatCurrency(data.salary.average || 0);
    document.getElementById("analytics-highest-salary").textContent = formatCurrency(data.salary.highest || 0);
    document.getElementById("analytics-lowest-salary").textContent = formatCurrency(data.salary.lowest || 0);

    // Applications & Success Rate
    document.getElementById("analytics-total-apps").textContent = data.applications.total || 0;
    document.getElementById("analytics-applied-apps").textContent = data.applications.applied || 0;
    document.getElementById("analytics-interview-apps").textContent = data.applications.interview || 0;
    document.getElementById("analytics-offer-apps").textContent = data.applications.offer || 0;
    document.getElementById("analytics-rejected-apps").textContent = data.applications.rejected || 0;

    const successRate = data.success_rate || 0;
    document.getElementById("analytics-success-rate").textContent = `${successRate}%`;
    document.getElementById("analytics-success-progress").style.width = `${Math.min(100, Math.max(0, successRate))}%`;

    // Interviews Funnel Metrics
    document.getElementById("analytics-total-interviews").textContent = data.interviews.total || 0;
    document.getElementById("analytics-scheduled-interviews").textContent = data.interviews.scheduled || 0;
    document.getElementById("analytics-completed-interviews").textContent = data.interviews.completed || 0;
    document.getElementById("analytics-upcoming-interviews").textContent = data.interviews.upcoming || 0;

    content.style.display = "block";
  } catch (error) {
    showToast(`Failed to load analytics: ${error.message}`, "error");
  } finally {
    loading.style.display = "none";
  }
}

/**
 * Initialize analytics view controls
 */
export function initAnalytics() {
  const refreshBtn = document.getElementById("btn-refresh-analytics");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadAnalytics);
  }
}
