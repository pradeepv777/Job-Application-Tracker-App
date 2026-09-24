import { Api, AuthStorage } from "./api.js";
import { showToast, el } from "./ui.js";

export function renderAuthView() {
  el("auth-section").classList.add("active");
  el("dashboard-section").classList.remove("active");
  el("analytics-section").classList.remove("active");
  const header = el("app-header");
  if (header) header.style.display = "none";
  el("nav-links").style.display = "none";
  el("user-profile").style.display = "none";
}

export function renderAppView() {
  el("auth-section").classList.remove("active");
  el("dashboard-section").classList.add("active");
  el("analytics-section").classList.remove("active");
  const header = el("app-header");
  if (header) header.style.display = "block";
  el("nav-links").style.display = "flex";
  el("user-profile").style.display = "flex";
  const userEmail = el("current-user-email");
  if (userEmail) userEmail.textContent = AuthStorage.getUserEmail() || "Logged In";
}

export function initAuth({ onLoginSuccess, onLogout } = {}) {
  const formLogin = el("form-login"), formRegister = el("form-register");

  const toggleAuth = (showLogin) => {
    formLogin.style.display = showLogin ? "block" : "none";
    formRegister.style.display = showLogin ? "none" : "block";
  };

  el("tab-login-btn")?.addEventListener("click", () => toggleAuth(true));
  el("tab-register-btn")?.addEventListener("click", () => toggleAuth(false));

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = el("login-email").value.trim(), password = el("login-password").value;
    const btn = formLogin.querySelector("button[type='submit']");
    try {
      btn.disabled = true;
      btn.textContent = "Logging in...";
      await Api.login(email, password);
      showToast("Logged in successfully!", "success");
      formLogin.reset();
      renderAppView();
      onLoginSuccess?.();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign in";
    }
  });

  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = el("reg-name").value.trim(), email = el("reg-email").value.trim(), password = el("reg-password").value;
    if (password.length < 8) return showToast("Password must be at least 8 characters long.", "warning");
    const btn = formRegister.querySelector("button[type='submit']");
    try {
      btn.disabled = true;
      btn.textContent = "Registering...";
      const res = await Api.register(name, email, password);
      showToast(res.message || "Registration successful! You can now log in.", "success");
      formRegister.reset();
      toggleAuth(true);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Create Account";
    }
  });

  el("btn-logout")?.addEventListener("click", () => {
    Api.logout();
    showToast("You have been logged out.", "info");
    renderAuthView();
    onLogout?.();
  });
}
