/**
 * Job Application Tracker - API Service Client
 * Pure Vanilla JavaScript module for interacting with the FastAPI backend REST API.
 * Handles JWT token storage, request authentication, unified error extraction,
 * and automatic session expiration handling.
 */

// Determine API base URL dynamically:
// If frontend is served directly by FastAPI on port 8000, relative URLs ('') are used.
// If frontend is run on a standalone dev server (e.g. port 5173, 5500, 3000), default to http://localhost:8000.
const API_BASE_URL = (window.location.port === "8000" || window.location.port === "")
  ? ""
  : "http://localhost:8000";

const TOKEN_KEY = "job_tracker_jwt";
const USER_KEY = "job_tracker_user_email";

/**
 * Authentication & Storage Helpers
 */
export const AuthStorage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  getUserEmail() {
    return localStorage.getItem(USER_KEY) || "";
  },

  setUserEmail(email) {
    localStorage.setItem(USER_KEY, email);
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  }
};

// Event callback to notify app controller when session expires or user logs out
let onAuthExpiredHandler = null;

export function setOnAuthExpired(handler) {
  onAuthExpiredHandler = handler;
}

/**
 * Core unified fetch wrapper for API communication.
 * Automatically injects JWT Bearer token, formats request bodies,
 * handles Pydantic and FastAPI validation errors, and triggers session expiration.
 *
 * @param {string} endpoint - API route (e.g. '/applications')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} - Parsed response data
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  // Attach JWT Bearer Authorization header if token exists
  const token = AuthStorage.getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Format request body if needed
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body,
    });

    // 204 No Content has no body
    if (response.status === 204) {
      return null;
    }

    // Check for HTTP 401 Unauthorized (Expired or invalid token)
    if (response.status === 401) {
      // If user had a token, it means their session has expired or is invalid
      if (token) {
        AuthStorage.clear();
        if (typeof onAuthExpiredHandler === "function") {
          onAuthExpiredHandler("Your session has expired or is invalid. Please log in again.");
        }
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Unauthorized access. Please log in.");
    }

    // Check for non-2xx responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            // Pydantic validation error array: format nicely
            errorMessage = errorData.detail
              .map(err => `${err.loc ? err.loc.join(" -> ") : "Field"}: ${err.msg}`)
              .join("; ");
          } else {
            errorMessage = String(errorData.detail);
          }
        }
      } catch {
        // Fallback to text status
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Check if the response is a downloadable file or JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/pdf")) {
      return await response.blob();
    }

    return await response.json();
  } catch (error) {
    // Re-throw to let callers handle UI notification
    throw error;
  }
}

/**
 * =========================================================================
 * API Endpoints Modules
 * =========================================================================
 */

export const Api = {
  // --- Authentication ---
  /**
   * Register a new user
   * @param {string} name
   * @param {string} email
   * @param {string} password (min 8 chars)
   */
  async register(name, email, password) {
    return apiFetch("/auth/register", {
      method: "POST",
      body: { name, email, password }
    });
  },

  /**
   * Log in user using OAuth2PasswordRequestForm urlencoded format
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const data = await apiFetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData
    });

    if (data.access_token) {
      AuthStorage.setToken(data.access_token);
      AuthStorage.setUserEmail(email);
    }
    return data;
  },

  logout() {
    AuthStorage.clear();
  },

  // --- Dashboard Statistics ---
  async getDashboard() {
    return apiFetch("/dashboard");
  },

  // --- Applications CRUD & Search/Filter/Pagination ---
  /**
   * Fetch paginated applications with search, status filtering, and sorting
   */
  async getApplications({ search = "", status = "", page = 1, limit = 10, sortBy = "id", order = "asc" } = {}) {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (status) params.append("status", status);
    if (page) params.append("page", String(page));
    if (limit) params.append("limit", String(limit));
    if (sortBy) params.append("sort_by", sortBy);
    if (order) params.append("order", order);

    return apiFetch(`/applications?${params.toString()}`);
  },

  async getApplicationById(id) {
    return apiFetch(`/applications/${id}`);
  },

  async createApplication({ company, role, salary, status = "Applied" }) {
    return apiFetch("/applications", {
      method: "POST",
      body: {
        company: company.trim(),
        role: role.trim(),
        salary: parseInt(salary, 10),
        status
      }
    });
  },

  async updateApplication(id, { company, role, salary, status }) {
    return apiFetch(`/applications/${id}`, {
      method: "PUT",
      body: {
        company: company.trim(),
        role: role.trim(),
        salary: parseInt(salary, 10),
        status
      }
    });
  },

  async deleteApplication(id) {
    return apiFetch(`/applications/${id}`, {
      method: "DELETE"
    });
  },

  // --- Interviews Management ---
  async getInterviewsByApplication(applicationId) {
    return apiFetch(`/interviews/application/${applicationId}`);
  },

  async createInterview({ applicationId, round, date, time, interviewer, notes, result }) {
    return apiFetch("/interviews", {
      method: "POST",
      body: {
        application_id: parseInt(applicationId, 10),
        round: round.trim(),
        date,
        time,
        interviewer: interviewer.trim(),
        notes: notes.trim(),
        result
      }
    });
  },

  async updateInterview(id, { round, date, time, interviewer, notes, result }) {
    return apiFetch(`/interviews/${id}`, {
      method: "PUT",
      body: {
        round: round.trim(),
        date,
        time,
        interviewer: interviewer.trim(),
        notes: notes.trim(),
        result
      }
    });
  },

  async deleteInterview(id) {
    return apiFetch(`/interviews/${id}`, {
      method: "DELETE"
    });
  },

  // --- Resume Upload / Download / Delete ---
  async getResumeMetadata() {
    return apiFetch("/resume");
  },

  async uploadResume(file) {
    const formData = new FormData();
    formData.append("file", file);

    return apiFetch("/resume/upload", {
      method: "POST",
      body: formData
    });
  },

  async downloadResume() {
    return apiFetch("/resume/download");
  },

  async deleteResume() {
    return apiFetch("/resume", {
      method: "DELETE"
    });
  },

  // --- Analytics ---
  async getAnalytics() {
    return apiFetch("/analytics");
  }
};
