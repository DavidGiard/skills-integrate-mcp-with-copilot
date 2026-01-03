document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const loginModal = document.getElementById("login-modal");
  const userInfoModal = document.getElementById("user-info-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const logoutBtn = document.getElementById("logout-btn");
  const userDisplayName = document.getElementById("user-display-name");
  const authMessage = document.getElementById("auth-message");

  // Authentication state
  let authToken = localStorage.getItem("authToken");
  let currentUser = null;

  // Close modals when clicking the X
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", () => {
      loginModal.classList.remove("show");
      loginModal.classList.add("hidden");
      userInfoModal.classList.remove("show");
      userInfoModal.classList.add("hidden");
    });
  });

  // Close modals when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.remove("show");
      loginModal.classList.add("hidden");
    }
    if (event.target === userInfoModal) {
      userInfoModal.classList.remove("show");
      userInfoModal.classList.add("hidden");
    }
  });

  // User icon click handler
  userIcon.addEventListener("click", () => {
    if (currentUser) {
      // Show user info modal if logged in
      userDisplayName.textContent = currentUser.name;
      userInfoModal.classList.remove("hidden");
      userInfoModal.classList.add("show");
    } else {
      // Show login modal if not logged in
      loginModal.classList.remove("hidden");
      loginModal.classList.add("show");
    }
  });

  // Login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Store token and update UI
        authToken = result.token;
        localStorage.setItem("authToken", authToken);
        currentUser = {
          username: result.username,
          name: result.name,
        };

        loginMessage.textContent = result.message;
        loginMessage.className = "success";
        loginMessage.classList.remove("hidden");

        // Update UI
        updateAuthUI();

        // Close modal after short delay
        setTimeout(() => {
          loginModal.classList.remove("show");
          loginModal.classList.add("hidden");
          loginForm.reset();
          loginMessage.classList.add("hidden");
        }, 1000);
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    // Clear auth state
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");

    // Update UI
    updateAuthUI();

    // Close modal
    userInfoModal.classList.remove("show");
    userInfoModal.classList.add("hidden");
  });

  // Update UI based on auth state
  function updateAuthUI() {
    if (currentUser) {
      userIcon.classList.add("logged-in");
      userIcon.title = `Logged in as ${currentUser.name}`;
      authMessage.classList.add("hidden");
      signupForm.querySelector('button[type="submit"]').disabled = false;
    } else {
      userIcon.classList.remove("logged-in");
      userIcon.title = "Login";
      authMessage.classList.remove("hidden");
      signupForm.querySelector('button[type="submit"]').disabled = true;
    }
  }

  // Verify session on page load
  async function verifySession() {
    if (!authToken) {
      updateAuthUI();
      return;
    }

    try {
      const response = await fetch("/auth/verify", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const result = await response.json();

      if (result.authenticated) {
        currentUser = {
          username: result.username,
          name: result.name,
        };
        updateAuthUI();
      } else {
        // Token is invalid, clear it
        authToken = null;
        currentUser = null;
        localStorage.removeItem("authToken");
        updateAuthUI();
      }
    } catch (error) {
      console.error("Error verifying session:", error);
      authToken = null;
      currentUser = null;
      localStorage.removeItem("authToken");
      updateAuthUI();
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    // Check if user is authenticated
    if (!authToken) {
      messageDiv.textContent = "Please log in to unregister students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 3000);
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
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
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Check if user is authenticated
    if (!authToken) {
      messageDiv.textContent = "Please log in to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 3000);
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
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
  verifySession();
  fetchActivities();
});
