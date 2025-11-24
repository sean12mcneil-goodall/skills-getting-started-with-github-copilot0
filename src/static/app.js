document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to avoid HTML injection when inserting participant names
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
    );
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

        // Attach unregister event handlers for this activity's buttons
        const unregisterButtons = activityCard.querySelectorAll(".unregister-btn");
        unregisterButtons.forEach((btn) => {
          btn.addEventListener("click", async (event) => {
            const activityName = btn.dataset.activity;
            const email = btn.dataset.email;

            // Confirm with the user before unregistering
            const confirmed = window.confirm(
              `Are you sure you want to unregister ${email} from "${activityName}"?`
            );

            if (!confirmed) {
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
                messageDiv.textContent = result.message;
                messageDiv.className = "success";
                messageDiv.classList.remove("hidden");
                // refresh activities to reflect change
                fetchActivities();
              } else {
                messageDiv.textContent = result.detail || "Failed to unregister";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }

              setTimeout(() => {
                messageDiv.classList.add("hidden");
              }, 4000);
            } catch (err) {
              messageDiv.textContent = "Failed to unregister. Please try again.";
              messageDiv.className = "error";
              messageDiv.classList.remove("hidden");
              console.error("Error unregistering:", err);
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
