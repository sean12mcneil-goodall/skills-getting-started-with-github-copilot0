// Constants for message timeouts
const MESSAGE_TIMEOUT = 5000;
const UNREGISTER_TIMEOUT = 4000;

document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  let messageTimeoutId = null;

  // small helper to avoid HTML injection when inserting participant names
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
    );
  }

  // Helper to display messages with auto-hide
  function showMessage(text, type, timeout = MESSAGE_TIMEOUT) {
    // Clear previous timeout to prevent overlapping timers
    if (messageTimeoutId) clearTimeout(messageTimeoutId);

    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    messageTimeoutId = setTimeout(() => {
      messageDiv.classList.add("hidden");
      messageTimeoutId = null;
    }, timeout);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // reset select so repeated calls don't duplicate options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants section (list without bullets) with unregister buttons
        let participantsHtml = "";
        if (details.participants && details.participants.length > 0) {
          participantsHtml = `<ul class="participants-list">${details.participants
            .map((p) => `<li class="participant-item"><span class="participant-email">${escapeHtml(
              p
            )}</span><button class="unregister-btn" data-activity="${escapeHtml(
              name
            )}" data-email="${escapeHtml(p)}" aria-label="Unregister ${escapeHtml(
              p
            )}">&times;</button></li>`)
            .join("")}</ul>`;
        } else {
          participantsHtml = `<p class="no-participants">No participants yet</p>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section">
            <strong>Participants:</strong>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Attach unregister handler using event delegation (one listener, not one per button)
      attachUnregisterHandlers();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Event delegation for unregister buttons (more efficient than attaching listener to each button)
  function attachUnregisterHandlers() {
    activitiesList.addEventListener("click", handleUnregisterClick);
  }

  async function handleUnregisterClick(event) {
    // Check if the clicked element is an unregister button
    if (!event.target.classList.contains("unregister-btn")) {
      return;
    }

    const btn = event.target;
    const activityName = btn.dataset.activity;
    const email = btn.dataset.email;

    // Escape data in confirmation message to prevent any injection
    const confirmMessage = `Are you sure you want to unregister ${escapeHtml(
      email
    )} from "${escapeHtml(activityName)}"?`;

    // Confirm with the user before unregistering
    if (!window.confirm(confirmMessage)) {
      return; // user cancelled
    }

    try {
      const resp = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(
          email
        )}`,
        { method: "DELETE" }
      );

      const result = await resp.json();

      if (resp.ok) {
        showMessage(result.message, "success", UNREGISTER_TIMEOUT);
        // refresh activities to reflect change
        fetchActivities();
      } else {
        showMessage(result.detail || "Failed to unregister", "error", UNREGISTER_TIMEOUT);
      }
    } catch (err) {
      showMessage("Failed to unregister. Please try again.", "error", UNREGISTER_TIMEOUT);
      console.error("Error unregistering:", err);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    // Validate that activity is selected
    if (!activity) {
      showMessage("Please select an activity", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success", MESSAGE_TIMEOUT);
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
