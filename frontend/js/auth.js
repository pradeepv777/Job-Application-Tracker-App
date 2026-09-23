/**
 * Job Application Tracker - Authentication Module
 * Manages user registration, login with OAuth2 password request,
 * logout, token storage persistence, and auth view toggling.
 */

import { Api, AuthStorage } from "./api.js";
import { showToast } from "./ui.js";

/**
 * Display the unauthenticated view (Login/Register forms)
 */
export function renderAuthView() {
  document.getElementById("auth-section").classList.add("active");
  document.getElementById("dashboard-section").classList.remove("active");
  document.getElementById("analytics-section").classList.remove("active");
  const header = document.getElementById("app-header");
  if (header) header.style.display = "none";
  document.getElementById("nav-links").style.display = "none";
  document.getElementById("user-profile").style.display = "none";
}

/**
 * Display the authenticated application view (Dashboard/Analytics)
 */
export function renderAppView() {
  document.getElementById("auth-section").classList.remove("active");
  document.getElementById("dashboard-section").classList.add("active");
  document.getElementById("analytics-section").classList.remove("active");
  const header = document.getElementById("app-header");
  if (header) header.style.display = "block";
  document.getElementById("nav-links").style.display = "flex";
  document.getElementById("user-profile").style.display = "flex";

  const userEmailSpan = document.getElementById("current-user-email");
  if (userEmailSpan) {
    userEmailSpan.textContent = AuthStorage.getUserEmail() || "Logged In";
  }
}

/**
 * Initialize authentication event listeners and form submissions
 * @param {object} callbacks
 * @param {Function} callbacks.onLoginSuccess - Callback invoked after successful login
 * @param {Function} callbacks.onLogout - Callback invoked after logout
 */
export function initAuth({ onLoginSuccess, onLogout } = {}) {
  const tabLogin = document.getElementById("tab-login-btn");
  const tabRegister = document.getElementById("tab-register-btn");
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const logoutBtn = document.getElementById("btn-logout");

  // Tab Switching: Sign In vs Register
  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    formLogin.style.display = "block";
    formRegister.style.display = "none";
  });

  tabRegister.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    formLogin.style.display = "none";
    formRegister.style.display = "block";
  });

  // Login Form Submission
  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const submitBtn = formLogin.querySelector("button[type='submit']");

    if (!email || !password) {
      showToast("Please enter both email and password.", "warning");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";
      await Api.login(email, password);
      showToast("Logged in successfully!", "success");
      formLogin.reset();
      renderAppView();
      if (typeof onLoginSuccess === "function") {
        onLoginSuccess();
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
    }
  });

  // Register Form Submission
  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const submitBtn = formRegister.querySelector("button[type='submit']");

    if (password.length < 8) {
      showToast("Password must be at least 8 characters long.", "warning");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = "Registering...";
      const res = await Api.register(name, email, password);
      showToast(res.message || "Registration successful! You can now log in.", "success");
      formRegister.reset();
      tabLogin.click(); // Switch to login tab
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";
    }
  });

  // Logout Handler
  logoutBtn.addEventListener("click", () => {
    Api.logout();
    showToast("You have been logged out.", "info");
    renderAuthView();
    if (typeof onLogout === "function") {
      onLogout();
    }
  });
}
