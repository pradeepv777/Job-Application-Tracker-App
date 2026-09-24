import { Api } from "./api.js";
import { showToast, escapeHtml, formatCurrency, el } from "./ui.js";

const appState = {
  items: [], page: 1, limit: 10, total: 0, totalPages: 1,
  search: "", status: "", sortBy: "id", order: "asc",
  currentEditingAppId: null,
  callbacks: { onOpenInterviews: null, onDataChanged: null }
};

export async function loadDashboardStats() {
  try {
    const stats = await Api.getDashboard();
    ["total", "applied", "interview", "offer", "rejected"].forEach(k => {
      el(`stat-${k}`).textContent = (k === "total" ? stats.total_applications : stats[k]) ?? 0;
    });
  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }
}

export async function loadApplications() {
  const tbody = el("applications-table-body"), loading = el("table-loading"), empty = el("table-empty");
  try {
    tbody.innerHTML = ""; loading.style.display = "block"; empty.style.display = "none";
    const data = await Api.getApplications({
      search: appState.search, status: appState.status,
      page: appState.page, limit: appState.limit,
      sortBy: appState.sortBy, order: appState.order
    });

    Object.assign(appState, {
      items: data.items || [], page: data.page || 1, limit: data.limit || 10,
      total: data.total || 0, totalPages: data.total_pages || 1
    });

    renderApplicationsTable();
    renderPagination();
  } catch (err) {
    showToast(`Failed to load applications: ${err.message}`, "error");
  } finally {
    loading.style.display = "none";
  }
}

function renderApplicationsTable() {
  const tbody = el("applications-table-body"), empty = el("table-empty");
  tbody.innerHTML = "";

  if (appState.items.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  appState.items.forEach(app => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>#${app.id}</strong></td>
      <td><strong>${escapeHtml(app.company)}</strong></td>
      <td>${escapeHtml(app.role)}</td>
      <td>${formatCurrency(app.salary)}</td>
      <td><span class="badge badge-${app.status.toLowerCase()}">${escapeHtml(app.status)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-secondary btn-sm btn-int" title="Manage Interviews">Interviews</button>
          <button class="btn btn-secondary btn-sm btn-edit" title="Edit Application">Edit</button>
          <button class="btn btn-danger btn-sm btn-del" title="Delete Application">Delete</button>
        </div>
      </td>
    `;
    tr.querySelector(".btn-int").onclick = () => appState.callbacks.onOpenInterviews?.(app);
    tr.querySelector(".btn-edit").onclick = () => openEditAppModal(app);
    tr.querySelector(".btn-del").onclick = () => handleDeleteApplication(app.id, app.company);
    tbody.appendChild(tr);
  });
}

function renderPagination() {
  const { page, totalPages, total, limit } = appState;
  const start = total === 0 ? 0 : (page - 1) * limit + 1, end = Math.min(page * limit, total);
  el("pagination-info").textContent = `Showing ${start}–${end} of ${total} applications (Page ${page} of ${totalPages})`;
  el("btn-prev-page").disabled = page <= 1;
  el("btn-next-page").disabled = page >= totalPages;
}

function setupTableControls() {
  let timeout = null;
  el("search-input")?.addEventListener("input", (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => { appState.search = e.target.value; appState.page = 1; loadApplications(); }, 300);
  });

  el("filter-status")?.addEventListener("change", (e) => {
    appState.status = e.target.value; appState.page = 1; loadApplications();
  });

  el("sort-by")?.addEventListener("change", (e) => {
    appState.sortBy = e.target.value; loadApplications();
  });

  el("btn-sort-order")?.addEventListener("click", () => {
    appState.order = appState.order === "asc" ? "desc" : "asc";
    el("btn-sort-order").textContent = appState.order.toUpperCase();
    loadApplications();
  });

  el("page-limit-select")?.addEventListener("change", (e) => {
    appState.limit = parseInt(e.target.value, 10); appState.page = 1; loadApplications();
  });

  el("btn-prev-page")?.addEventListener("click", () => {
    if (appState.page > 1) { appState.page--; loadApplications(); }
  });

  el("btn-next-page")?.addEventListener("click", () => {
    if (appState.page < appState.totalPages) { appState.page++; loadApplications(); }
  });
}

function setupApplicationModal() {
  const modal = el("app-modal-overlay"), form = el("form-application");
  const closeModal = () => { modal.classList.remove("active"); appState.currentEditingAppId = null; form.reset(); };

  el("btn-new-application")?.addEventListener("click", () => {
    appState.currentEditingAppId = null;
    el("app-modal-title").textContent = "New Job Application";
    form.reset();
    el("app-status").value = "Applied";
    modal.classList.add("active");
  });

  el("app-modal-close")?.addEventListener("click", closeModal);
  el("app-modal-cancel")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => e.target === modal && closeModal());

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const company = el("app-company").value.trim(), role = el("app-role").value.trim();
    const salary = parseInt(el("app-salary").value, 10), status = el("app-status").value;

    if (company.length < 2) return showToast("Company name must be at least 2 characters.", "warning");
    if (role.length < 3) return showToast("Role title must be at least 3 characters.", "warning");
    if (isNaN(salary) || salary <= 10000) return showToast("Salary must be greater than 10,000.", "warning");

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;

    try {
      if (appState.currentEditingAppId) {
        await Api.updateApplication(appState.currentEditingAppId, { company, role, salary, status });
        showToast(`Application for ${company} updated!`, "success");
      } else {
        await Api.createApplication({ company, role, salary, status });
        showToast(`Application for ${company} submitted!`, "success");
      }
      closeModal();
      await loadApplications();
      await loadDashboardStats();
      appState.callbacks.onDataChanged?.();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function openEditAppModal(app) {
  appState.currentEditingAppId = app.id;
  el("app-modal-title").textContent = `Edit Application #${app.id}`;
  el("app-company").value = app.company;
  el("app-role").value = app.role;
  el("app-salary").value = app.salary;
  el("app-status").value = app.status;
  el("app-modal-overlay").classList.add("active");
}

async function handleDeleteApplication(id, company) {
  if (!confirm(`Are you sure you want to delete the application for "${company}"? All related interviews will also be deleted.`)) return;
  try {
    await Api.deleteApplication(id);
    showToast(`Application for ${company} deleted.`, "info");
    await loadApplications();
    await loadDashboardStats();
    appState.callbacks.onDataChanged?.();
  } catch (err) {
    showToast(`Failed to delete application: ${err.message}`, "error");
  }
}

export function initApplications({ onOpenInterviews, onDataChanged } = {}) {
  appState.callbacks.onOpenInterviews = onOpenInterviews;
  appState.callbacks.onDataChanged = onDataChanged;
  setupTableControls();
  setupApplicationModal();
}
