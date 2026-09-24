import { Api } from "./api.js";
import { showToast, formatCurrency, el } from "./ui.js";

export async function loadAnalytics() {
  const loading = el("analytics-loading"), content = el("analytics-content");
  try {
    loading.style.display = "block";
    content.style.display = "none";
    const data = await Api.getAnalytics();

    el("analytics-avg-salary").textContent = formatCurrency(data.salary.average);
    el("analytics-highest-salary").textContent = formatCurrency(data.salary.highest);
    el("analytics-lowest-salary").textContent = formatCurrency(data.salary.lowest);

    ["total", "applied", "interview", "offer", "rejected"].forEach(s => {
      el(`analytics-${s}-apps`).textContent = data.applications[s] ?? 0;
    });

    const rate = data.success_rate || 0;
    el("analytics-success-rate").textContent = `${rate}%`;
    el("analytics-success-progress").style.width = `${Math.min(100, Math.max(0, rate))}%`;

    ["total", "scheduled", "completed", "upcoming"].forEach(k => {
      el(`analytics-${k}-interviews`).textContent = data.interviews[k] ?? 0;
    });

    content.style.display = "block";
  } catch (err) {
    showToast(`Failed to load analytics: ${err.message}`, "error");
  } finally {
    loading.style.display = "none";
  }
}

export function initAnalytics() {
  el("btn-refresh-analytics")?.addEventListener("click", loadAnalytics);
}
