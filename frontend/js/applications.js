/**
 * Job Application Tracker - Applications Module
 * Handles application CRUD, dashboard status metric cards,
 * search, filtering, sorting, pagination, and modal dialogs.
 */

import { Api } from "./api.js";
import { showToast, escapeHtml, formatCurrency } from "./ui.js";

// Internal Applications State
const appState = {
  items: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  search: "",
  status: "",
  sortBy: "id",
  order: "asc",
  currentEditingAppId: null,
  callbacks: {
    onOpenInterviews: null,
    onDataChanged: null
  }
};

/**
 * Fetch and render dashboard overview statistics cards
 */
export async function loadDashboardStats() {
  try {
    const stats = await Api.getDashboard();
    document.getElementById("stat-total").textContent = stats.total_applications ?? 0;
    document.getElementById("stat-applied").textContent = stats.applied ?? 0;
    document.getElementById("stat-interview").textContent = stats.interview ?? 0;
    document.getElementById("stat-offer").textContent = stats.offer ?? 0;
    document.getElementById("stat-rejected").textContent = stats.rejected ?? 0;
  } catch (error) {
    console.error("Failed to load dashboard statistics:", error);
  }
}

/**
 * Fetch and render the paginated application list
 */
export async function loadApplications() {
  const tbody = document.getElementById("applications-table-body");
  const loadingState = document.getElementById("table-loading");
  const emptyState = document.getElementById("table-empty");

  try {
    tbody.innerHTML = "";
    loadingState.style.display = "block";
    emptyState.style.display = "none";

    const data = await Api.getApplications({
      search: appState.search,
      status: appState.status,
      page: appState.page,
      limit: appState.limit,
      sortBy: appState.sortBy,
      order: appState.order
    });

    appState.items = data.items || [];
    appState.page = data.page || 1;
    appState.limit = data.limit || 10;
    appState.total = data.total || 0;
    appState.totalPages = data.total_pages || 1;

    renderApplicationsTable();
    renderPagination();
  } catch (error) {
    showToast(`Failed to load applications: ${error.message}`, "error");
  } finally {
    loadingState.style.display = "none";
  }
}

/**
 * Render table rows for current applications
 */
function renderApplicationsTable() {
  const tbody = document.getElementById("applications-table-body");
  const emptyState = document.getElementById("table-empty");
  tbody.innerHTML = "";

  if (appState.items.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  appState.items.forEach(app => {
    const tr = document.createElement("tr");
    const statusBadgeClass = `badge-${app.status.toLowerCase()}`;

    tr.innerHTML = `
      <td><strong>#${app.id}</strong></td>
      <td><strong>${escapeHtml(app.company)}</strong></td>
      <td>${escapeHtml(app.role)}</td>
      <td>${formatCurrency(app.salary)}</td>
      <td><span class="badge ${statusBadgeClass}">${escapeHtml(app.status)}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-secondary btn-sm btn-action-interview" data-id="${app.id}" title="Manage Interviews">
            Interviews
          </button>
          <button class="btn btn-secondary btn-sm btn-action-edit" data-id="${app.id}" title="Edit Application">
            Edit
          </button>
          <button class="btn btn-danger btn-sm btn-action-delete" data-id="${app.id}" title="Delete Application">
            Delete
          </button>
        </div>
      </td>
    `;

    // Button event listeners
    tr.querySelector(".btn-action-interview").addEventListener("click", () => {
      if (typeof appState.callbacks.onOpenInterviews === "function") {
        appState.callbacks.onOpenInterviews(app);
      }
    });

    tr.querySelector(".btn-action-edit").addEventListener("click", () => openEditAppModal(app));
    tr.querySelector(".btn-action-delete").addEventListener("click", () => handleDeleteApplication(app.id, app.company));

    tbody.appendChild(tr);
  });
}

/**
 * Render pagination controls and summary text
 */
function renderPagination() {
  const pageInfo = document.getElementById("pagination-info");
  const prevBtn = document.getElementById("btn-prev-page");
  const nextBtn = document.getElementById("btn-next-page");

  const { page, totalPages, total, limit } = appState;
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  pageInfo.textContent = `Showing ${startItem}–${endItem} of ${total} applications (Page ${page} of ${totalPages})`;
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
}

/**
 * Setup toolbar controls (Search, Status Filter, Sort By, Sort Order, Page Limit)
 */
function setupTableControls() {
  const searchInput = document.getElementById("search-input");
  const statusFilter = document.getElementById("filter-status");
  const sortBySelect = document.getElementById("sort-by");
  const sortOrderBtn = document.getElementById("btn-sort-order");
  const limitSelect = document.getElementById("page-limit-select");
  const prevBtn = document.getElementById("btn-prev-page");
  const nextBtn = document.getElementById("btn-next-page");

  // Debounced search
  let searchTimeout = null;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      appState.search = e.target.value;
      appState.page = 1;
      loadApplications();
    }, 300);
  });

  // Status Filter Dropdown
  statusFilter.addEventListener("change", (e) => {
    appState.status = e.target.value;
    appState.page = 1;
    loadApplications();
  });

  // Sort Field Dropdown
  sortBySelect.addEventListener("change", (e) => {
    appState.sortBy = e.target.value;
    loadApplications();
  });

  // Sort Direction Toggle
  sortOrderBtn.addEventListener("click", () => {
    const isAsc = appState.order === "asc";
    appState.order = isAsc ? "desc" : "asc";
    sortOrderBtn.textContent = appState.order.toUpperCase();
    loadApplications();
  });

  // Page Size Selector
  limitSelect.addEventListener("change", (e) => {
    appState.limit = parseInt(e.target.value, 10);
    appState.page = 1;
    loadApplications();
  });

  // Pagination navigation
  prevBtn.addEventListener("click", () => {
    if (appState.page > 1) {
      appState.page--;
      loadApplications();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (appState.page < appState.totalPages) {
      appState.page++;
      loadApplications();
    }
  });
}

/**
 * Setup Application Create & Edit Modal Dialog
 */
function setupApplicationModal() {
  const modalOverlay = document.getElementById("app-modal-overlay");
  const openNewBtn = document.getElementById("btn-new-application");
  const closeBtn = document.getElementById("app-modal-close");
  const cancelBtn = document.getElementById("app-modal-cancel");
  const form = document.getElementById("form-application");

  openNewBtn.addEventListener("click", () => {
    appState.currentEditingAppId = null;
    document.getElementById("app-modal-title").textContent = "New Job Application";
    form.reset();
    document.getElementById("app-status").value = "Applied";
    modalOverlay.classList.add("active");
  });

  const closeModal = () => {
    modalOverlay.classList.remove("active");
    appState.currentEditingAppId = null;
    form.reset();
  };

  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Submit Handler for Create / Update
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const company = document.getElementById("app-company").value.trim();
    const role = document.getElementById("app-role").value.trim();
    const salary = parseInt(document.getElementById("app-salary").value, 10);
    const status = document.getElementById("app-status").value;

    if (company.length < 2) {
      showToast("Company name must be at least 2 characters.", "warning");
      return;
    }
    if (role.length < 3) {
      showToast("Role title must be at least 3 characters.", "warning");
      return;
    }
    if (isNaN(salary) || salary <= 10000) {
      showToast("Salary must be a number greater than 10,000.", "warning");
      return;
    }

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

      if (typeof appState.callbacks.onDataChanged === "function") {
        appState.callbacks.onDataChanged();
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function openEditAppModal(app) {
  appState.currentEditingAppId = app.id;
  document.getElementById("app-modal-title").textContent = `Edit Application #${app.id}`;
  document.getElementById("app-company").value = app.company;
  document.getElementById("app-role").value = app.role;
  document.getElementById("app-salary").value = app.salary;
  document.getElementById("app-status").value = app.status;

  document.getElementById("app-modal-overlay").classList.add("active");
}

async function handleDeleteApplication(id, company) {
  if (!confirm(`Are you sure you want to delete the application for "${company}"? All related interviews will also be deleted.`)) {
    return;
  }

  try {
    await Api.deleteApplication(id);
    showToast(`Application for ${company} deleted.`, "info");
    await loadApplications();
    await loadDashboardStats();

    if (typeof appState.callbacks.onDataChanged === "function") {
      appState.callbacks.onDataChanged();
    }
  } catch (error) {
    showToast(`Failed to delete application: ${error.message}`, "error");
  }
}

/**
 * Initialize application module
 * @param {object} options
 * @param {Function} options.onOpenInterviews - Invoked when user clicks "Interviews" on an application row
 * @param {Function} options.onDataChanged - Invoked when applications are added, edited, or removed
 */
export function initApplications({ onOpenInterviews, onDataChanged } = {}) {
  appState.callbacks.onOpenInterviews = onOpenInterviews;
  appState.callbacks.onDataChanged = onDataChanged;

  setupTableControls();
  setupApplicationModal();
}
