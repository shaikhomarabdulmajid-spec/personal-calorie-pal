const BASE_URL = "https://nutriwalk-prototype.onrender.com";

const analyzeBtn = document.getElementById("analyzeBtn");
const imageUpload = document.getElementById("imageUpload");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const foodList = document.getElementById("foodList");
const totalCalories = document.getElementById("totalCalories");

const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const fileNameDisplay = document.getElementById("fileNameDisplay");

imageUpload.addEventListener("change", () => {
  const file = imageUpload.files[0];
  fileNameDisplay.textContent = file ? `Selected: ${file.name}` : "No file selected";
});


// -------------------
// ANALYZE FOOD IMAGE
// -------------------
analyzeBtn.onclick = async () => {
  const file = imageUpload.files[0];
  if (!file) {
    alert("Please upload an image first!");
    return;
  }

  loading.classList.remove("hidden");
  result.classList.add("hidden");

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    loading.classList.add("hidden");

    if (!data.success) {
      alert(data.message || "Analysis failed");
      return;
    }

    result.classList.remove("hidden");
    foodList.innerHTML = "";
    data.foods.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = `${f.name} — ${f.calories} kcal`;
      foodList.appendChild(li);
    });

    totalCalories.textContent = `Total: ${data.total_calories} kcal`;
    const stepsNeeded = Math.round(data.total_calories * 20);
    const stepsNote = document.createElement("p");
    stepsNote.style.marginTop = "10px";
    stepsNote.style.fontSize = "1rem";
    stepsNote.style.color = "#333";
    stepsNote.textContent = `To balance this, you might aim for about ${stepsNeeded.toLocaleString()} steps today.`;
    result.appendChild(stepsNote);
  } catch (err) {
    console.error(err);
    loading.classList.add("hidden");
    alert("Error connecting to backend");
  }
};

// -------------------
// LOGIN / REGISTER
// -------------------
loginBtn.onclick = () => {
  loginForm.classList.toggle("show");
  loginForm.classList.toggle("hidden");
  registerForm.classList.add("hidden");
  registerForm.classList.remove("show");
};

registerBtn.onclick = () => {
  registerForm.classList.toggle("show");
  registerForm.classList.toggle("hidden");
  loginForm.classList.add("hidden");
  loginForm.classList.remove("show");
};

// Cancel buttons
document.getElementById("cancelLogin").onclick = () => {
  loginForm.classList.add("hidden");
  loginForm.classList.remove("show");
};

document.getElementById("cancelRegister").onclick = () => {
  registerForm.classList.add("hidden");
  registerForm.classList.remove("show");
};

// Confirm login
document.getElementById("confirmLogin").onclick = async () => {
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      alert("Login successful!");
      localStorage.setItem("username", username);
      loginForm.classList.add("hidden");
      loginBtn.classList.add("hidden");
      registerBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    alert("Error connecting to backend");
  }
};

// Confirm register
document.getElementById("confirmRegister").onclick = async () => {
  const username = document.getElementById("registerUsername").value;
  const password = document.getElementById("registerPassword").value;

  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (data.success) {
      alert("Registration successful!");
      registerForm.classList.add("hidden");
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (err) {
    alert("Error connecting to backend");
  }
};
