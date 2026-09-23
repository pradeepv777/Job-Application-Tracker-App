/**
 * Job Application Tracker - Interviews Module
 * Manages interview rounds linked to job applications:
 * viewing round history, scheduling, editing, and deleting interview rounds.
 */

import { Api } from "./api.js";
import { showToast, escapeHtml } from "./ui.js";

// Internal Interviews State
const interviewState = {
  activeApplication: null, // { id, company, role }
  currentEditingInterviewId: null
};

/**
 * Open the interview management modal for a specific application
 * @param {object} app - Application object { id, company, role }
 */
export async function openInterviewsModal(app) {
  interviewState.activeApplication = app;
  interviewState.currentEditingInterviewId = null;

  document.getElementById("interview-modal-title").textContent =
    `Interviews: ${app.company} — ${app.role}`;

  document.getElementById("interview-modal-overlay").classList.add("active");
  resetInterviewFormState();
  document.getElementById("form-interview").reset();

  await loadInterviewsForActiveApp();
}

/**
 * Fetch and render all interview rounds for the active application
 */
async function loadInterviewsForActiveApp() {
  const container = document.getElementById("interview-list-container");
  container.innerHTML = "<p class='form-hint'>Loading interview rounds...</p>";

  try {
    const interviews = await Api.getInterviewsByApplication(interviewState.activeApplication.id);
    container.innerHTML = "";

    if (!interviews || interviews.length === 0) {
      container.innerHTML = "<p class='form-hint'>No interview rounds scheduled yet for this application.</p>";
      return;
    }

    interviews.forEach(interview => {
      const card = document.createElement("div");
      card.className = "interview-card";

      const badgeClass = `badge-${interview.result.toLowerCase()}`;

      card.innerHTML = `
        <div class="interview-card-header">
          <span class="interview-round">${escapeHtml(interview.round)}</span>
          <span class="badge ${badgeClass}">${escapeHtml(interview.result)}</span>
        </div>
        <div class="interview-meta">
          <span><strong>Date:</strong> ${escapeHtml(interview.date)}</span>
          <span><strong>Time:</strong> ${escapeHtml(interview.time)}</span>
          <span><strong>Interviewer:</strong> ${escapeHtml(interview.interviewer || "Not specified")}</span>
        </div>
        ${interview.notes ? `<div class="interview-notes"><strong>Notes:</strong> ${escapeHtml(interview.notes)}</div>` : ""}
        <div class="interview-actions">
          <button class="btn btn-secondary btn-sm btn-int-edit">Edit</button>
          <button class="btn btn-danger btn-sm btn-int-delete">Delete</button>
        </div>
      `;

      card.querySelector(".btn-int-edit").addEventListener("click", () => populateInterviewEdit(interview));
      card.querySelector(".btn-int-delete").addEventListener("click", () => handleDeleteInterview(interview.id, interview.round));

      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p class="form-hint" style="color: var(--danger)">Failed to load interviews: ${escapeHtml(error.message)}</p>`;
  }
}

/**
 * Pre-populate form fields when editing an interview round
 */
function populateInterviewEdit(interview) {
  interviewState.currentEditingInterviewId = interview.id;
  document.getElementById("interview-form-title").textContent = `Edit Round: ${interview.round}`;
  document.getElementById("int-round").value = interview.round;
  document.getElementById("int-date").value = interview.date;
  document.getElementById("int-time").value = interview.time.slice(0, 5); // Format HH:MM
  document.getElementById("int-interviewer").value = interview.interviewer || "";
  document.getElementById("int-notes").value = interview.notes || "";
  document.getElementById("int-result").value = interview.result;

  document.getElementById("btn-interview-submit").textContent = "Update Round";
  document.getElementById("btn-interview-cancel-edit").style.display = "inline-block";
}

function resetInterviewFormState() {
  interviewState.currentEditingInterviewId = null;
  document.getElementById("interview-form-title").textContent = "Schedule Interview Round";
  document.getElementById("btn-interview-submit").textContent = "Schedule Round";
  document.getElementById("btn-interview-cancel-edit").style.display = "none";
}

async function handleDeleteInterview(id, roundName) {
  if (!confirm(`Are you sure you want to delete the interview round "${roundName}"?`)) {
    return;
  }

  try {
    await Api.deleteInterview(id);
    showToast(`Interview round "${roundName}" deleted.`, "info");
    await loadInterviewsForActiveApp();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Initialize interview modal and form submission handlers
 */
export function initInterviews() {
  const modalOverlay = document.getElementById("interview-modal-overlay");
  const closeBtn = document.getElementById("interview-modal-close");
  const form = document.getElementById("form-interview");
  const cancelEditBtn = document.getElementById("btn-interview-cancel-edit");

  const closeModal = () => {
    modalOverlay.classList.remove("active");
    interviewState.activeApplication = null;
    interviewState.currentEditingInterviewId = null;
    form.reset();
    resetInterviewFormState();
  };

  closeBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  cancelEditBtn.addEventListener("click", () => {
    resetInterviewFormState();
    form.reset();
  });

  // Submit Handler: Schedule or Update Round
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!interviewState.activeApplication) return;

    const round = document.getElementById("int-round").value.trim();
    const date = document.getElementById("int-date").value;
    const timeInput = document.getElementById("int-time").value;
    const interviewer = document.getElementById("int-interviewer").value.trim();
    const notes = document.getElementById("int-notes").value.trim();
    const result = document.getElementById("int-result").value;

    if (round.length < 2) {
      showToast("Interview round name must be at least 2 characters.", "warning");
      return;
    }
    if (!date || !timeInput) {
      showToast("Please provide both interview date and time.", "warning");
      return;
    }

    // Ensure seconds are included (HH:MM:SS)
    const time = timeInput.length === 5 ? `${timeInput}:00` : timeInput;

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;

    try {
      if (interviewState.currentEditingInterviewId) {
        await Api.updateInterview(interviewState.currentEditingInterviewId, {
          round, date, time, interviewer, notes, result
        });
        showToast("Interview round updated!", "success");
      } else {
        await Api.createInterview({
          applicationId: interviewState.activeApplication.id,
          round, date, time, interviewer, notes, result
        });
        showToast("Interview round scheduled!", "success");
      }

      form.reset();
      resetInterviewFormState();
      await loadInterviewsForActiveApp();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
