/* ============================================================================
   MindBridge — patient dashboard wiring for the games hub.

   Drop-in: it needs no edits to patient.js. It takes over the existing
   "Start Games" button and the existing modal, and refreshes the dashboard
   once a score has been saved.

   Load order in patient.html:
       app.js  ->  patient.js  ->  games-hub.js  ->  games-integration.js
   ==========================================================================*/

(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var startBtn = document.getElementById("startBtn");
    var modalBg = document.getElementById("modalBg");
    var modalContent = document.getElementById("modalContent");
    var closeBtn = document.getElementById("closeModal");

    if (!startBtn || !modalBg || !modalContent) {
      console.warn("[MindBridge games] patient.html markup not found — hub not attached.");
      return;
    }

    /* patient.js may already have bound its own handler to this button.
       Replacing the node with a clone drops those listeners, so the old
       three-game flow does not fire alongside the new hub. */
    var fresh = startBtn.cloneNode(true);
    startBtn.parentNode.replaceChild(fresh, startBtn);

    function openHub() {
      modalBg.classList.add("show");
      modalBg.style.display = "flex";
      document.body.style.overflow = "hidden";
      window.MBGamesHub.open(modalContent, { onClose: closeHub });
    }

    function closeHub() {
      modalBg.classList.remove("show");
      modalBg.style.display = "";
      document.body.style.overflow = "";
      modalContent.innerHTML = "";
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }

    fresh.addEventListener("click", openHub);

    if (closeBtn) closeBtn.addEventListener("click", closeHub);

    modalBg.addEventListener("click", function (event) {
      if (event.target === modalBg) closeHub();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modalBg.classList.contains("show")) closeHub();
    });

    /* ------------------------------------------------- after a score saves */

    document.addEventListener("mb:game-saved", function (event) {
      var pill = document.getElementById("syncPill");
      var label = document.getElementById("syncLabel");
      if (pill) pill.classList.remove("offline");
      if (label) label.textContent = "Synced";

      /* Reuse patient.js's own loader if it exposed one; otherwise pull the
         stats directly so the cards update without a page reload. */
      if (typeof window.loadPatientDashboard === "function") {
        window.loadPatientDashboard();
        return;
      }
      if (window.MB && typeof window.MB.api === "function") {
        window.MB.api("/api/summary?days=7").then(function (summary) {
          if (!summary || !summary.totals) return;
          var set = window.MB.setText;
          if (summary.totals.average != null) set("avgScore", summary.totals.average + "%");
          if (summary.totals.best != null) set("bestScore", summary.totals.best + "%");
          if (summary.totals.minutes != null) set("minsActive", summary.totals.minutes);
        }).catch(function () { /* the score is saved; the cards catch up on reload */ });
      }
    });

    document.addEventListener("mb:game-save-failed", function () {
      var pill = document.getElementById("syncPill");
      var label = document.getElementById("syncLabel");
      if (pill) pill.classList.add("offline");
      if (label) label.textContent = "Saved on device";
    });
  });
})();
