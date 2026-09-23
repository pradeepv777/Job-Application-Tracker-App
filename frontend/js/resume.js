/**
 * Job Application Tracker - Resume Management Module
 * Handles PDF resume upload with client-side 5 MB size validation,
 * metadata retrieval, file download blob creation, and deletion.
 */

import { Api } from "./api.js";
import { showToast } from "./ui.js";

const resumeState = {
  filename: null
};

/**
 * Fetch current uploaded resume status and display metadata
 */
export async function loadResumeStatus() {
  const currentResumeInfo = document.getElementById("resume-current-info");
  const filenameSpan = document.getElementById("resume-current-filename");
  const noResumeMsg = document.getElementById("resume-none-msg");

  try {
    const data = await Api.getResumeMetadata();
    resumeState.filename = data.filename;
    filenameSpan.textContent = data.filename;
    currentResumeInfo.style.display = "block";
    noResumeMsg.style.display = "none";
  } catch (error) {
    // HTTP 404 indicates no resume is currently uploaded
    resumeState.filename = null;
    currentResumeInfo.style.display = "none";
    noResumeMsg.style.display = "block";
  }
}

/**
 * Open the resume management modal
 */
export async function openResumeModal() {
  const modalOverlay = document.getElementById("resume-modal-overlay");
  modalOverlay.classList.add("active");
  await loadResumeStatus();
}

/**
 * Initialize resume modal events and upload/download/delete handlers
 */
export function initResume() {
  const modalOverlay = document.getElementById("resume-modal-overlay");
  const openBtn = document.getElementById("btn-open-resume");
  const closeBtn = document.getElementById("resume-modal-close");
  const form = document.getElementById("form-resume-upload");
  const fileInput = document.getElementById("resume-file-input");
  const downloadBtn = document.getElementById("btn-resume-download");
  const deleteBtn = document.getElementById("btn-resume-delete");

  const closeModal = () => {
    modalOverlay.classList.remove("active");
    form.reset();
  };

  openBtn.addEventListener("click", openResumeModal);
  closeBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Resume Upload Handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) {
      showToast("Please select a PDF resume file to upload.", "warning");
      return;
    }

    if (file.type !== "application/pdf") {
      showToast("Only PDF files are allowed.", "warning");
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      showToast("File size exceeds 5 MB limit.", "warning");
      return;
    }

    const uploadBtn = form.querySelector("button[type='submit']");
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";

    try {
      const res = await Api.uploadResume(file);
      showToast(res.message || "Resume uploaded successfully!", "success");
      form.reset();
      await loadResumeStatus();
    } catch (error) {
      showToast(`Upload failed: ${error.message}`, "error");
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "Upload PDF";
    }
  });

  // Resume Download Handler
  downloadBtn.addEventListener("click", async () => {
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Downloading...";
    try {
      const blob = await Api.downloadResume();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resumeState.filename || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Resume downloaded.", "info");
    } catch (error) {
      showToast(`Download failed: ${error.message}`, "error");
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.textContent = "Download Resume";
    }
  });

  // Resume Delete Handler
  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to delete your uploaded resume?")) {
      return;
    }
    deleteBtn.disabled = true;
    try {
      await Api.deleteResume();
      showToast("Resume deleted successfully.", "info");
      await loadResumeStatus();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      deleteBtn.disabled = false;
    }
  });
}
