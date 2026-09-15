/* ============================================================================
   MindBridge — shared front-end core.
   Session handling, API calls with silent token refresh, and small helpers
   used by the auth pages and both dashboards.
   ==========================================================================*/

(function () {
  "use strict";

  var ACCESS_KEY = "mindbridge_access_token";
  var REFRESH_KEY = "mindbridge_refresh_token";

  /* The Node server serves these pages, so the API lives on the same origin.
     Only set window.MINDBRIDGE_API_BASE if you host the front-end separately
     (e.g. VS Code Live Server on :5500 talking to the API on :5000). */
  var API_BASE = typeof window.MINDBRIDGE_API_BASE === "string"
    ? window.MINDBRIDGE_API_BASE.replace(/\/$/, "")
    : "";

  var session = {
    get access() { return localStorage.getItem(ACCESS_KEY); },
    get refresh() { return localStorage.getItem(REFRESH_KEY); },
    save: function (supabaseSession) {
      if (!supabaseSession) return;
      localStorage.setItem(ACCESS_KEY, supabaseSession.access_token);
      if (supabaseSession.refresh_token) {
        localStorage.setItem(REFRESH_KEY, supabaseSession.refresh_token);
      }
    },
    clear: function () {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  };

  /* Remove confirmation tokens without creating a session automatically. */
  function consumeAuthRedirect() {
    var params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    var accessToken = params.get("access_token");
    if (!accessToken) return;

    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  }

  consumeAuthRedirect();

  function url(path) {
    return API_BASE + path;
  }

  async function rawFetch(path, options, token) {
    var headers = new Headers((options && options.headers) || {});
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", "Bearer " + token);
    var response = await fetch(url(path), Object.assign({}, options, { headers: headers }));
    var body = await response.json().catch(function () { return {}; });
    return { response: response, body: body };
  }

  /** Refresh the access token once, using the stored refresh token. */
  async function refreshSession() {
    var refreshToken = session.refresh;
    if (!refreshToken) return false;
    var result = await rawFetch("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: refreshToken })
    });
    if (!result.response.ok || !result.body.session) return false;
    session.save(result.body.session);
    return true;
  }

  /** Authenticated JSON call. Retries once after a silent token refresh. */
  async function api(path, options) {
    options = options || {};
    var attempt = await rawFetch(path, options, session.access);

    if (attempt.response.status === 401 && session.refresh) {
      var refreshed = await refreshSession();
      if (refreshed) attempt = await rawFetch(path, options, session.access);
    }

    if (!attempt.response.ok) {
      var error = new Error(attempt.body.error || "Something went wrong. Please try again.");
      error.status = attempt.response.status;
      error.expired = attempt.response.status === 401;
      throw error;
    }
    return attempt.body;
  }

  /** Unauthenticated JSON call (sign in / sign up). */
  async function publicApi(path, options) {
    var attempt = await rawFetch(path, options || {}, null);
    if (!attempt.response.ok) {
      var error = new Error(attempt.body.error || "Something went wrong. Please try again.");
      error.status = attempt.response.status;
      throw error;
    }
    return attempt.body;
  }

  function signOut() {
    session.clear();
    window.location.href = "index.html";
  }

  /** Dashboards call this first: no token means back to the sign-in page. */
  function requireSession() {
    if (!session.access) {
      window.location.replace("index.html");
      return false;
    }
    return true;
  }

  /** Auth pages call this: an existing session skips straight to the app. */
  function redirectIfSignedIn() {
    if (session.access) {
      window.location.replace("patient.html");
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------- helpers */

  function setText(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function relativeTime(value) {
    if (!value) return "";

    /* Use the language pack when it is loaded, otherwise plain English. */
    var translate = (window.I18N && window.I18N.t) || function (key, values) {
      var fallback = {
        justNow: "just now", minsAgo: "{n}m ago", hoursAgo: "{n}h ago",
        yesterday: "yesterday", daysAgo: "{n}d ago"
      }[key];
      return values ? fallback.replace("{n}", values.n) : fallback;
    };

    var minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
    if (minutes < 1) return translate("justNow");
    if (minutes < 60) return translate("minsAgo", { n: minutes });

    var hours = Math.round(minutes / 60);
    if (hours < 24) return translate("hoursAgo", { n: hours });

    var days = Math.round(hours / 24);
    if (days === 1) return translate("yesterday");
    return translate("daysAgo", { n: days });
  }

  function scoreClass(score) {
    if (score >= 90) return "high";
    if (score >= 70) return "mid";
    return "low";
  }

  var GAME_META = {
    "Word Garden":  { emoji: "🌱", category: "Language", key: "word" },
    "Memory Match": { emoji: "🧠", category: "Memory",   key: "memory" },
    "Picture Path": { emoji: "🔍", category: "Focus",    key: "picture" },
    "Color Clash":  { emoji: "🎨", category: "Executive Function", key: "color" }
  };

  function gameMeta(name) {
    return GAME_META[name] || { emoji: "✦", category: "Cognitive", key: "word" };
  }

  function greeting() {
    var hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  window.MB = {
    api: api,
    publicApi: publicApi,
    session: session,
    signOut: signOut,
    requireSession: requireSession,
    redirectIfSignedIn: redirectIfSignedIn,
    setText: setText,
    relativeTime: relativeTime,
    scoreClass: scoreClass,
    gameMeta: gameMeta,
    greeting: greeting,
    escapeHtml: escapeHtml
  };
})();
