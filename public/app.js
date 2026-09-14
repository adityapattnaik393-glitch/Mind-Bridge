const API_BASE_URL = window.location.port === "5000"
  ? ""
  : `${window.location.protocol}//${window.location.hostname}:5000`;

let patient = null;
let authMode = "login";

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function getToken() {
  return localStorage.getItem("mindbridge_access_token");
}

function setAuthMessage(message = "") {
  setText("authError", message);
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(apiUrl(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function showDashboard() {
  document.getElementById("authShell")?.classList.add("is-hidden");
  document.getElementById("dashboardApp")?.classList.remove("is-hidden");
}

function showAuth() {
  document.getElementById("authShell")?.classList.remove("is-hidden");
  document.getElementById("dashboardApp")?.classList.add("is-hidden");
}

function updateAuthMode() {
  const signup = authMode === "signup";
  setText("authTitle", signup ? "Create your account" : "Welcome back");
  setText("authCopy", signup ? "Set up a private space for your cognitive care journey." : "Sign in to continue to your cognitive care dashboard.");
  setText("authSubmit", signup ? "Create account" : "Sign in");
  setText("authSwitchText", signup ? "Already have an account?" : "New to MindBridge?");
  setText("authSwitch", signup ? "Sign in" : "Create account");
  document.getElementById("nameField")?.classList.toggle("is-hidden", !signup);
  document.getElementById("authPassword")?.setAttribute("autocomplete", signup ? "new-password" : "current-password");
  setAuthMessage();
}

async function loadPatient() {
  patient = await apiFetch("/api/patient");
  window.currentPatient = patient;
  setText("patientName", patient.name || "Patient");
  setText("patientAge", `♡ ${patient.age || 72} years`);
  setText("patientRegion", `📍 ${patient.region || "Imphal, Manipur"}`);
  setText("patientLanguage", `🌐 ${patient.preferredLanguage || "English"}`);
  setText("streakNum", patient.streak || 0);
}

function updateStats(scores) {
  if (!scores.length) return;
  const values = scores.map((item) => Number(item.score) || 0);
  const average = Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  setText("avgScore", `${average}%`);
  setText("sessionCount", scores.length);
  setText("bestScore", `${Math.max(...values)}%`);
}

function updateChart(scores) {
  if (!scores.length || typeof window.setWeeklyScores !== "function") return;
  const values = scores.slice(0, 5).reverse().map((item) => Number(item.score) || 0);
  while (values.length < 5) values.unshift(0);
  window.setWeeklyScores(values);
}

async function loadScores() {
  const scores = await apiFetch("/api/scores");
  updateStats(scores);
  updateChart(scores);
}

window.recordScore = async ({ name, score, attempts = 1 }) => {
  try {
    await apiFetch("/api/scores", {
      method: "POST",
      body: JSON.stringify({ name, score, attempts })
    });
    await loadScores();
  } catch (error) {
    console.warn("Could not save score:", error.message);
  }
};

async function signInOrSignUp(event) {
  event.preventDefault();
  const submit = document.getElementById("authSubmit");
  submit.disabled = true;
  setAuthMessage();

  const payload = {
    email: document.getElementById("authEmail").value.trim(),
    password: document.getElementById("authPassword").value
  };
  if (authMode === "signup") payload.name = document.getElementById("authName").value.trim();

  try {
    const data = await apiFetch(`/api/auth/${authMode}`, { method: "POST", body: JSON.stringify(payload) });
    if (!data.session) {
      setAuthMessage("Check your email to confirm your account, then sign in.");
      return;
    }
    localStorage.setItem("mindbridge_access_token", data.session.access_token);
    showDashboard();
    await loadPatient();
    await loadScores();
  } catch (error) {
    setAuthMessage(error.message);
  } finally {
    submit.disabled = false;
  }
}

async function initializeApp() {
  document.getElementById("authForm")?.addEventListener("submit", signInOrSignUp);
  document.getElementById("authSwitch")?.addEventListener("click", () => {
    authMode = authMode === "login" ? "signup" : "login";
    updateAuthMode();
  });
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("mindbridge_access_token");
    patient = null;
    showAuth();
    authMode = "login";
    updateAuthMode();
  });

  updateAuthMode();
  if (!getToken()) return;

  try {
    showDashboard();
    await loadPatient();
    await loadScores();
  } catch (error) {
    localStorage.removeItem("mindbridge_access_token");
    showAuth();
    setAuthMessage(error.message);
  }
}

initializeApp();
