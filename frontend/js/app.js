/**
 * Job Application Tracker - Main Application Orchestrator
 * Bootstraps the application, coordinates specialized domain modules
 * (Auth, Applications, Interviews, Resume, Analytics), handles global view routing,
 * and sets up cross-module communication.
 */

import { AuthStorage, setOnAuthExpired } from "./api.js";
import { showToast } from "./ui.js";
import { initAuth, renderAuthView, renderAppView } from "./auth.js";
import { initApplications, loadApplications, loadDashboardStats } from "./applications.js";
import { initInterviews, openInterviewsModal } from "./interviews.js";
import { initResume } from "./resume.js";
import { initAnalytics, loadAnalytics } from "./analytics.js";

// Global navigation state
let activeView = "dashboard";

/**
 * Switch the primary view between Dashboard and Analytics
 * @param {'dashboard' | 'analytics'} viewName
 */
function switchTab(viewName) {
  activeView = viewName;

  const navBtns = document.querySelectorAll(".nav-btn[data-view]");
  navBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  const dashSection = document.getElementById("dashboard-section");
  const analyticsSection = document.getElementById("analytics-section");

  if (viewName === "dashboard") {
    dashSection.classList.add("active");
    analyticsSection.classList.remove("active");
  } else if (viewName === "analytics") {
    dashSection.classList.remove("active");
    analyticsSection.classList.add("active");
    loadAnalytics();
  }
}

/**
 * Check authentication on initial page load and hydrate corresponding view
 */
function bootstrapSession() {
  if (AuthStorage.isAuthenticated()) {
    renderAppView();
    loadDashboardStats();
    loadApplications();
  } else {
    renderAuthView();
  }
}

// Global hook for invalid or expired JWT tokens (HTTP 401)
setOnAuthExpired((message) => {
  showToast(message, "error");
  renderAuthView();
});

/**
 * Initialize application modules and DOM event listeners
 */
document.addEventListener("DOMContentLoaded", () => {
  // Navigation tab click listeners
  const navBtns = document.querySelectorAll(".nav-btn[data-view]");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.view));
  });

  // Initialize Authentication module
  initAuth({
    onLoginSuccess: () => {
      loadDashboardStats();
      loadApplications();
      switchTab("dashboard");
    },
    onLogout: () => {
      activeView = "dashboard";
    }
  });

  // Initialize Applications module with hooks for interviews & data change events
  initApplications({
    onOpenInterviews: (app) => openInterviewsModal(app),
    onDataChanged: () => {
      loadDashboardStats();
      if (activeView === "analytics") {
        loadAnalytics();
      }
    }
  });

  // Initialize remaining modules
  initInterviews();
  initResume();
  initAnalytics();

  // Hydrate initial user state
  bootstrapSession();
});
