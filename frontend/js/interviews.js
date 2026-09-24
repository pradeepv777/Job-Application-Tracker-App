import { Api } from "./api.js";
import { showToast, escapeHtml, el } from "./ui.js";

const interviewState = { activeApplication: null, currentEditingInterviewId: null };

export async function openInterviewsModal(app) {
  interviewState.activeApplication = app;
  interviewState.currentEditingInterviewId = null;
  el("interview-modal-title").textContent = `Interviews: ${app.company} — ${app.role}`;
  el("interview-modal-overlay").classList.add("active");
  resetInterviewFormState();
  el("form-interview").reset();
  await loadInterviewsForActiveApp();
}

async function loadInterviewsForActiveApp() {
  const container = el("interview-list-container");
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
      card.innerHTML = `
        <div class="interview-card-header">
          <span class="interview-round">${escapeHtml(interview.round)}</span>
          <span class="badge badge-${interview.result.toLowerCase()}">${escapeHtml(interview.result)}</span>
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
      card.querySelector(".btn-int-edit").onclick = () => populateInterviewEdit(interview);
      card.querySelector(".btn-int-delete").onclick = () => handleDeleteInterview(interview.id, interview.round);
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p class="form-hint" style="color: var(--danger)">Failed to load interviews: ${escapeHtml(err.message)}</p>`;
  }
}

function populateInterviewEdit(interview) {
  interviewState.currentEditingInterviewId = interview.id;
  el("interview-form-title").textContent = `Edit Round: ${interview.round}`;
  el("int-round").value = interview.round;
  el("int-date").value = interview.date;
  el("int-time").value = interview.time.slice(0, 5);
  el("int-interviewer").value = interview.interviewer || "";
  el("int-notes").value = interview.notes || "";
  el("int-result").value = interview.result;
  el("btn-interview-submit").textContent = "Update Round";
  el("btn-interview-cancel-edit").style.display = "inline-block";
}

function resetInterviewFormState() {
  interviewState.currentEditingInterviewId = null;
  el("interview-form-title").textContent = "Schedule Interview Round";
  el("btn-interview-submit").textContent = "Schedule Round";
  el("btn-interview-cancel-edit").style.display = "none";
}

async function handleDeleteInterview(id, roundName) {
  if (!confirm(`Are you sure you want to delete the interview round "${roundName}"?`)) return;
  try {
    await Api.deleteInterview(id);
    showToast(`Interview round "${roundName}" deleted.`, "info");
    await loadInterviewsForActiveApp();
  } catch (err) {
    showToast(err.message, "error");
  }
}

export function initInterviews() {
  const modal = el("interview-modal-overlay"), form = el("form-interview");
  const closeModal = () => {
    modal.classList.remove("active");
    interviewState.activeApplication = null;
    form.reset();
    resetInterviewFormState();
  };

  el("interview-modal-close")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => e.target === modal && closeModal());
  el("btn-interview-cancel-edit")?.addEventListener("click", () => { resetInterviewFormState(); form.reset(); });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!interviewState.activeApplication) return;

    const round = el("int-round").value.trim(), date = el("int-date").value, timeVal = el("int-time").value;
    if (round.length < 2) return showToast("Interview round name must be at least 2 characters.", "warning");
    if (!date || !timeVal) return showToast("Please provide both interview date and time.", "warning");

    const payload = {
      round, date,
      time: timeVal.length === 5 ? `${timeVal}:00` : timeVal,
      interviewer: el("int-interviewer").value.trim(),
      notes: el("int-notes").value.trim(),
      result: el("int-result").value
    };

    const submitBtn = el("btn-interview-submit");
    submitBtn.disabled = true;

    try {
      if (interviewState.currentEditingInterviewId) {
        await Api.updateInterview(interviewState.currentEditingInterviewId, payload);
        showToast("Interview round updated!", "success");
      } else {
        await Api.createInterview({ applicationId: interviewState.activeApplication.id, ...payload });
        showToast("Interview round scheduled!", "success");
      }
      form.reset();
      resetInterviewFormState();
      await loadInterviewsForActiveApp();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}
