import { Api } from "./api.js";
import { showToast, el } from "./ui.js";

const resumeState = { filename: null };

export async function loadResumeStatus() {
  try {
    const data = await Api.getResumeMetadata();
    resumeState.filename = data.filename;
    el("resume-current-filename").textContent = data.filename;
    el("resume-current-info").style.display = "block";
    el("resume-none-msg").style.display = "none";
  } catch {
    resumeState.filename = null;
    el("resume-current-info").style.display = "none";
    el("resume-none-msg").style.display = "block";
  }
}

export async function openResumeModal() {
  el("resume-modal-overlay").classList.add("active");
  await loadResumeStatus();
}

export function initResume() {
  const modal = el("resume-modal-overlay"), form = el("form-resume-upload");
  const closeModal = () => { modal.classList.remove("active"); form.reset(); };

  el("btn-open-resume")?.addEventListener("click", openResumeModal);
  el("resume-modal-close")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => e.target === modal && closeModal());

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = el("resume-file-input").files[0];
    if (!file) return showToast("Please select a PDF resume file to upload.", "warning");
    if (file.type !== "application/pdf") return showToast("Only PDF files are allowed.", "warning");
    if (file.size > 5 * 1024 * 1024) return showToast("File size exceeds 5 MB limit.", "warning");

    const btn = form.querySelector("button[type='submit']");
    try {
      btn.disabled = true; btn.textContent = "Uploading...";
      const res = await Api.uploadResume(file);
      showToast(res.message || "Resume uploaded successfully!", "success");
      form.reset();
      await loadResumeStatus();
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      btn.disabled = false; btn.textContent = "Upload PDF";
    }
  });

  el("btn-resume-download")?.addEventListener("click", async () => {
    const btn = el("btn-resume-download");
    try {
      btn.disabled = true;
      const blob = await Api.downloadResume();
      const url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = resumeState.filename || "resume.pdf";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      showToast("Resume downloaded.", "info");
    } catch (err) {
      showToast(`Download failed: ${err.message}`, "error");
    } finally {
      btn.disabled = false;
    }
  });

  el("btn-resume-delete")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to delete your uploaded resume?")) return;
    try {
      await Api.deleteResume();
      showToast("Resume deleted successfully.", "info");
      await loadResumeStatus();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}
