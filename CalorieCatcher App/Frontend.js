const BACKEND_URL = "https://nutriwalk-prototype.onrender.com";

// PAGE LOAD ANIMATION
window.onload = () => {
  setTimeout(() => {
    document.getElementById("glassCard").classList.add("show");
  }, 300);
};



// POPUP HANDLING
function showPopup(element) {
  element.classList.remove("hidden");
  console.log("Spinner should now be visible"); // Changed
  setTimeout(() => element.classList.add("show"), 10);
}

function hidePopup(element) {
  element.classList.remove("show");
  setTimeout(() => element.classList.add("hidden"), 300);
}

// Login + Register popup show/hide
loginBtn.onclick = () => { hidePopup(registerForm); showPopup(loginForm); };
registerBtn.onclick = () => { hidePopup(loginForm); showPopup(registerForm); };
cancelLogin.onclick = () => hidePopup(loginForm);
cancelRegister.onclick = () => hidePopup(registerForm);

// FILE NAME DISPLAY

const imageUpload = document.getElementById("imageUpload");
const fileNameDisplay = document.getElementById("fileNameDisplay");

imageUpload.addEventListener("change", () => {
  const file = imageUpload.files[0];
  fileNameDisplay.textContent = file ? `Selected: ${file.name}` : "No file selected";
});


// LOGIN FUNCTION
confirmLogin.addEventListener("click", async () => {
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    showToast("All fields are required to be filled");
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      showToast("Logged in!");
      hidePopup(loginForm);
    } else {
      showToast("Login failed: " + data.message);
    }
  } catch {
    showToast("Cannot reach backend");
  }
});


// REGISTER FUNCTION
confirmRegister.addEventListener("click", async () => {
  const username = registerUsername.value.trim();
  const password = registerPassword.value.trim();

  if (!username || !password) {
    showToast("All fields are required to be filled");
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      showToast("Registered!");
      hidePopup(registerForm);
      loadHistory(username); // Change
    } else {
      showToast("Register failed: " + data.message);
    }
  } catch {
    showToast("Cannot reach backend");
  }
});

// ANALYZE BUTTON — IMAGE UPLOAD
document.getElementById("analyzeBtn").addEventListener("click", async () => {
  console.log("Analyze button clicked");

  const file = imageUpload.files[0];
  const spinner = document.getElementById("inlineSpinner");

  if (!file) {
    showToast("Please upload an image first!");
    return;
  }

  spinner.classList.remove("hidden"); // SHOW SPINNER

  const formData = new FormData();
  formData.append("image", file);

  try {
    const res = await fetch(`${BACKEND_URL}/analyze`, {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    spinner.classList.add("hidden"); // HIDE SPINNER

    if (!data.success) {
      result.innerHTML = "Error: " + data.message;
      return;
    }

    result.innerHTML = `
      <h3>${data.food}</h3>
      <p>Calories: ${data.calories}</p>
      <p>Steps Required: ${data.steps} steps</p>
    `;

  } catch {
    spinner.classList.add("hidden"); // HIDE SPINNER ON ERROR
    result.innerHTML = "Server error. Check backend.";
  }
});

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  document.getElementById("toastContainer").appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function loadHistory(username) {
  const historySection = document.getElementById("historySection");
  const historyList = document.getElementById("historyList");

  historyList.innerHTML = "<li>Loading history…</li>";
  historySection.classList.remove("hidden");

  try {
    const res = await fetch(`${BACKEND_URL}/history?username=${username}`);
    const data = await res.json();

    if (!data.success || !Array.isArray(data.history)) {
      historyList.innerHTML = "<li>No history found.</li>";
      return;
    }

    // Build list
    historyList.innerHTML = "";
    data.history.forEach(entry => {
      const li = document.createElement("li");
      li.textContent = `${entry.food} — ${entry.calories} calories`;
      historyList.appendChild(li);
    });

  } catch (err) {
    historyList.innerHTML = "<li>Error loading history.</li>";
  }
}
