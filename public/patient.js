/* ============================================================================
   MindBridge — patient dashboard.
   Everything on this page comes from Supabase through /api/summary and
   /api/alerts. Finishing a game writes a row to game_scores and the whole
   dashboard re-reads from the database.
   ==========================================================================*/

(function () {
  "use strict";

  //if (!MB.requireSession()) return;

  var t = I18N.t;
  var state = {
    profile: null,
    summary: null,
    alerts: { pending: [], logged: [] }
  };

  /* =========================================================
     MOBILE / GAME UI STYLES
     These styles are inserted from patient.js so the game
     interface stays readable on phones even without changing
     the existing stylesheet.
     ========================================================= */

  function ensurePatientGameStyles() {
    if (document.getElementById("mindbridgePatientGameStyles")) return;

    var style = document.createElement("style");
    style.id = "mindbridgePatientGameStyles";

    style.textContent = `
      /* GAME CHOOSER */

      .mobile-game-grid {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 10px;
      }

      .mb-game-choice {
        position: relative;
        min-height: 135px !important;
        width: 100% !important;
        padding: 14px 8px !important;

        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 9px !important;

        border-radius: 18px !important;
        background: #ffffff !important;

        box-shadow: 0 5px 16px rgba(30, 32, 30, 0.08);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      }

      .mb-game-choice:active {
        transform: scale(0.96);
      }

      .mb-game-icon {
        display: block;
        font-size: 46px !important;
        line-height: 1 !important;
      }

      .mb-game-name {
        display: block;
        font-size: 16px !important;
        line-height: 1.2 !important;
        font-weight: 900 !important;
        text-align: center;
      }

      .mb-game-completed {
        position: absolute;
        right: 8px;
        bottom: 7px;
        width: 23px;
        height: 23px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #d7eadc;
        color: #155249;
        font-size: 14px;
        font-weight: 900;
      }

      /* LARGE INSTRUCTIONS */

      #modalContent .game-instructions {
        font-size: 21px !important;
        line-height: 1.55 !important;
        font-weight: 900 !important;
        color: #1d2521 !important;
        margin: 10px 0 18px !important;
      }

      #modalContent .game-question {
        font-size: 23px !important;
        line-height: 1.5 !important;
        font-weight: 900 !important;
        color: #1d2521 !important;
        margin: 14px 0 !important;
      }

      /* SOLITAIRE */

      .solitaire-top {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 7px;
        margin: 10px auto 15px;
        width: 100%;
        max-width: 620px;
      }

      .solitaire-pile {
        min-height: 58px;
        border-radius: 10px;
        padding: 4px;
        background: rgba(21, 82, 73, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .solitaire-stock,
      .solitaire-waste {
        min-height: 62px;
        border-radius: 10px;
        border: 2px dashed rgba(21, 82, 73, 0.28);
        background: #f7faf8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        cursor: pointer;
      }

      .solitaire-foundation {
        min-height: 62px;
        border-radius: 10px;
        border: 2px dashed rgba(21, 82, 73, 0.28);
        background: #f7faf8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 27px;
        cursor: pointer;
      }

      .solitaire-tableau {
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 5px;
        align-items: start;
      }

      .solitaire-column {
        min-height: 180px;
        border-radius: 10px;
        background: rgba(21, 82, 73, 0.055);
        padding: 3px;
      }

      .solitaire-card {
        width: 100%;
        min-height: 55px;
        margin: 0 0 3px 0;
        border-radius: 8px;
        border: 1px solid #cfd8d3;
        background: #ffffff;
        box-shadow: 0 2px 5px rgba(0,0,0,.08);
        font-size: clamp(15px, 3.4vw, 24px);
        font-weight: 900;
        cursor: pointer;
        touch-action: manipulation;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }

      .solitaire-card.face-down {
        background: #155249;
        color: #ffffff;
        border-color: #0f4038;
      }

      .solitaire-card.red-card {
        color: #c62828;
      }

      .solitaire-card.black-card {
        color: #1d2521;
      }

      .solitaire-card.selected-card {
        box-shadow: 0 0 0 3px #f2b84b, 0 3px 8px rgba(0,0,0,.12);
        transform: translateY(-2px);
      }

      @media (max-width: 600px) {

        .mobile-game-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .mb-game-choice {
          min-height: 128px !important;
          border-radius: 16px !important;
        }

        .mb-game-icon {
          font-size: 42px !important;
        }

        .mb-game-name {
          font-size: 15px !important;
        }

        #modalContent .game-instructions {
          font-size: 20px !important;
          line-height: 1.55 !important;
        }

        #modalContent .game-question {
          font-size: 22px !important;
        }

        .solitaire-tableau {
          gap: 3px;
        }

        .solitaire-card {
          min-height: 48px;
          font-size: clamp(13px, 3.6vw, 21px);
          border-radius: 7px;
        }

        .solitaire-column {
          min-height: 150px;
          padding: 2px;
        }

        .solitaire-top {
          gap: 4px;
        }
      }

      @media (max-width: 390px) {

        .mobile-game-grid {
          gap: 8px;
        }

        .mb-game-choice {
          min-height: 120px !important;
          padding: 10px 5px !important;
        }

        .mb-game-icon {
          font-size: 38px !important;
        }

        .mb-game-name {
          font-size: 14px !important;
        }

        #modalContent .game-instructions {
          font-size: 19px !important;
        }

        #modalContent .game-question {
          font-size: 20px !important;
        }

        .solitaire-card {
          min-height: 44px;
          font-size: 13px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  ensurePatientGameStyles();

  /* ===================================================== voice narration */

  var soundOn = true;
  var canSpeak = "speechSynthesis" in window;
  var soundBtn = document.getElementById("soundBtn");
  var voiceIndicator = document.getElementById("voiceIndicator");

  var SPEAKER_ON =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D2521" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';

  var SPEAKER_OFF =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D2521" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><line x1="16" y1="9" x2="21" y2="14"/><line x1="21" y1="9" x2="16" y2="14"/></svg>';

  if (soundBtn) {
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      this.innerHTML = soundOn ? SPEAKER_ON : SPEAKER_OFF;

      if (!soundOn && canSpeak) {
        window.speechSynthesis.cancel();
      }
    });
  }

  function speak(text) {
    if (!soundOn || !canSpeak || !text) return;

    window.speechSynthesis.cancel();

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.lang = I18N.speech;

    utterance.onstart = function () {
      if (voiceIndicator) voiceIndicator.classList.add("active");
      if (soundBtn) soundBtn.classList.add("speaking");
    };

    function done() {
      if (voiceIndicator) voiceIndicator.classList.remove("active");
      if (soundBtn) soundBtn.classList.remove("speaking");
    }

    utterance.onend = done;
    utterance.onerror = done;

    window.speechSynthesis.speak(utterance);
  }

  /* ============================================================== modal */

  var modalBg = document.getElementById("modalBg");
  var modalContent = document.getElementById("modalContent");
  var modal = modalBg ? modalBg.querySelector(".modal") : null;

  var gameScreenOpen = false;

  function closeModal() {
    if (!modalBg || !modal) return;

    modalBg.classList.remove("show");
    gameScreenOpen = false;

    modal.style.maxWidth = "";
    modal.style.width = "";
    modal.style.height = "";
    modal.style.maxHeight = "";
    modal.style.borderRadius = "";
    modal.style.padding = "";
    modal.style.overflowY = "";
    modalBg.style.padding = "";

    if (canSpeak) {
      window.speechSynthesis.cancel();
    }
  }

  function openModal(html) {
    if (!modalBg || !modalContent || !modal) return;

    if (gameScreenOpen) {
      modal.style.maxWidth = "1100px";
      modal.style.width = "100%";
      modal.style.height = "100%";
      modal.style.maxHeight = "100vh";
      modal.style.borderRadius = "0";
      modal.style.padding = "32px clamp(16px, 5vw, 56px)";
      modal.style.overflowY = "auto";
      modalBg.style.padding = "0";
    }

    modalContent.innerHTML = html;
    modalBg.classList.add("show");
  }

  var closeModalButton = document.getElementById("closeModal");

  if (closeModalButton) {
    closeModalButton.addEventListener("click", closeModal);
  }

  if (modalBg) {
    modalBg.addEventListener("click", function (event) {
      if (event.target === modalBg) {
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      modalBg &&
      modalBg.classList.contains("show")
    ) {
      closeModal();
    }
  });

  /* ============================================================ rendering */

  function applyLanguage(language) {
    I18N.setLanguage(language.code, language.speech);

    MB.setText("tagline", t("tagline"));
    MB.setText("navPatient", t("patientView"));
    MB.setText("navCaretaker", t("caretakerView"));
    MB.setText("syncLabel", t("synced"));
    MB.setText("logoutBtn", t("signOut"));
    MB.setText("streakLabel", t("dayStreak"));

    /* These remain safe even if the corresponding HTML was removed. */
    MB.setText("wellbeingTitle", t("wellbeing"));
    MB.setText("wellbeingSub", t("wellbeingSub"));
    MB.setText("wellbeingOutOf", t("outOf"));

    MB.setText("activityTitle", t("recentActivity"));
    MB.setText("activitySub", t("recentActivitySub"));
    MB.setText("startLabel", t("start"));
    MB.setText("alertsTitle", t("caregiverAlerts"));
    MB.setText("alertsSub", t("alertsSub"));
    MB.setText("minsLabel", t("minutesActive") + " · " + t("thisWeek"));
    MB.setText("bestLabel", t("bestScore") + " · " + t("personalBest"));

    var hour = new Date().getHours();
    var greetKey =
      hour < 12 ? "morning" :
      hour < 18 ? "afternoon" :
      "evening";

    MB.setText("greetTime", t(greetKey));
  }

  function renderProfile(profile) {
    MB.setText("patientName", profile.patientName);
    MB.setText("patientAge", "♡ " + profile.age + " " + t("years"));
    MB.setText("patientRegion", "📍 " + profile.region);
    MB.setText("patientLanguage", "🌐 " + profile.language.native);
    MB.setText("streakNum", profile.streak);
  }

  function renderStats(totals) {
    MB.setText("avgScore", totals.avgScore + "%");
    MB.setText(
      "avgLabel",
      t("avgScore") +
        " · " +
        t("acrossSessions", { n: totals.sessions })
    );

    MB.setText("minsActive", totals.minutesInWindow);
    MB.setText("bestScore", totals.bestScore + "%");
    MB.setText("streakNum", totals.streak);
  }

  var CIRCUMFERENCE = 2 * Math.PI * 72;

  function renderWellbeing(wellbeing, series) {
    /*
      The wellbeing section may have been removed from patient.html.
      Keep this function for compatibility with the old backend data,
      but safely do nothing when the UI element does not exist.
    */

    var donutRing = document.getElementById("donutRing");

    if (!donutRing || !wellbeing) {
      return;
    }

    var score = wellbeing.score;

    donutRing.style.strokeDashoffset =
      CIRCUMFERENCE * (1 - score / 100);

    MB.setText("wellbeingNum", score);

    var tags = [];

    tags.push(
      score >= 75
        ? '<span class="tag alt">' + t("stable") + "</span>"
        : '<span class="tag warn">' + t("needsSupport") + "</span>"
    );

    tags.push(
      wellbeing.trend > 0
        ? '<span class="tag">' + t("memoryImproving") + "</span>"
        : '<span class="tag">' + t("memorySteady") + "</span>"
    );

    tags.push(
      score >= 70
        ? '<span class="tag alt">' + t("moodPositive") + "</span>"
        : '<span class="tag warn">' + t("moodWatchful") + "</span>"
    );

    var tagsWrap = document.getElementById("tagsWrap");

    if (tagsWrap) {
      tagsWrap.innerHTML = tags.join("");
    }
  }

  function localisedGameName(name) {
    if (name === "Word Garden") return t("wordGarden");
    if (name === "Memory Match") return t("memoryMatch");
    if (name === "Picture Path") return t("picturePath");
    if (name === "Color Clash") return t("colorClash");
    return name;
  }

  function localisedCategory(category) {
    if (category === "Language") return t("language");
    if (category === "Memory") return t("memory");
    if (category === "Focus") return t("focus");
    if (category === "Executive Function") return t("executiveFunction");
    return category;
  }

  function renderActivity(recent) {
    var list = document.getElementById("activityList");

    if (!list) return;

    if (!recent.length) {
      list.innerHTML =
        '<p class="empty-state">' +
        t("noSessions") +
        "</p>";

      return;
    }

    list.innerHTML = recent
      .slice(0, 4)
      .map(function (row, index) {
        var meta = MB.gameMeta(row.game_type);

        return (
          '<div class="activity-row' +
          (index === 0 ? " fresh" : "") +
          '" data-game="' +
          meta.key +
          '">' +

          '<div class="activity-left">' +

          '<div class="activity-ic">' +
          meta.emoji +
          "</div>" +

          "<div>" +

          '<p class="activity-name">' +
          MB.escapeHtml(localisedGameName(row.game_type)) +
          "</p>" +

          '<p class="activity-sub">' +
          MB.escapeHtml(localisedCategory(row.category)) +
          " · " +
          MB.relativeTime(row.created_at) +
          "</p>" +

          "</div>" +

          "</div>" +

          '<span class="activity-score">' +
          row.score +
          "%" +
          "</span>" +

          "</div>"
        );
      })
      .join("");

    Array.prototype.forEach.call(
      list.querySelectorAll(".activity-row"),
      function (row) {
        row.addEventListener("click", function () {
          launchGame(row.dataset.game);
        });
      }
    );
  }

  var ALERT_ICONS = {
    medicine: "💊",
    hydration: "💧",
    appointment: "🗓️",
    activity: "✓"
  };

  function alertIcon(alert) {
    var title = alert.title.toLowerCase();

    if (title.indexOf("medicine") > -1) {
      return ALERT_ICONS.medicine;
    }

    if (
      title.indexOf("hydration") > -1 ||
      title.indexOf("water") > -1
    ) {
      return ALERT_ICONS.hydration;
    }

    if (title.indexOf("appointment") > -1) {
      return ALERT_ICONS.appointment;
    }

    return ALERT_ICONS.activity;
  }

  function renderAlerts(alerts) {
    var list = document.getElementById("alertsList");

    if (!list) return;

    var rows = [];

    alerts.pending.forEach(function (alert) {
      rows.push(
        '<div class="alert-row" data-pending="1" data-title="' +
        MB.escapeHtml(alert.title) +
        '" data-body="' +
        MB.escapeHtml(alert.body) +
        '" style="cursor:pointer;">' +

        '<div class="alert-ic bell">' +
        alertIcon(alert) +
        "</div>" +

        "<div>" +

        '<p class="alert-title">' +
        MB.escapeHtml(alert.title) +
        "</p>" +

        '<p class="alert-body">' +
        MB.escapeHtml(alert.body) +
        "</p>" +

        '<p class="alert-time">Tap to acknowledge</p>' +

        "</div></div>"
      );
    });

    alerts.logged.slice(0, 4).forEach(function (alert) {
      rows.push(
        '<div class="alert-row">' +

        '<div class="alert-ic ok">✓</div>' +

        "<div>" +

        '<p class="alert-title">' +
        MB.escapeHtml(alert.title) +
        "</p>" +

        '<p class="alert-body">' +
        MB.escapeHtml(alert.body) +
        "</p>" +

        '<p class="alert-time">' +
        MB.relativeTime(alert.createdAt) +
        "</p>" +

        "</div></div>"
      );
    });

    list.innerHTML = rows.length
      ? rows.join("")
      : '<p class="empty-state">' +
        t("noAlerts") +
        "</p>";

    Array.prototype.forEach.call(
      list.querySelectorAll('[data-pending="1"]'),
      function (row) {
        row.addEventListener("click", function () {
          acknowledgeAlert(row);
        });
      }
    );
  }

  function renderGifts(payload) {
    var list = document.getElementById("patientGifts");

    /*
      Gifts section may no longer be present in the new dashboard.
      Keep backend functionality but don't crash when the section is absent.
    */

    if (!list || !payload) {
      return;
    }

    if (!payload.gifts.length) {
      list.innerHTML =
        '<div class="gift-card locked">' +
        '<div class="gift-lock">⌑</div>' +
        "<h4>A gift is waiting</h4>" +
        "<p>Your caretaker can add an audio message or photo for you.</p>" +
        "</div>";

      return;
    }

    list.innerHTML = payload.gifts
      .map(function (gift) {
        if (!payload.unlocked) {
          return (
            '<div class="gift-card locked">' +
            '<div class="gift-lock">🔒</div>' +
            "<h4>Locked gift</h4>" +
            "<p>Reach 80% or higher in a game to unlock this gift.</p>" +
            "</div>"
          );
        }

        var media =
          gift.gift_type === "audio"
            ? '<audio controls preload="metadata" src="' +
              MB.escapeHtml(gift.media_data) +
              '"></audio>'
            : '<img src="' +
              MB.escapeHtml(gift.media_data) +
              '" alt="A gift from your caretaker">';

        return (
          '<div class="gift-card unlocked">' +
          media +
          "<h4>" +
          MB.escapeHtml(gift.title) +
          "</h4>" +
          '<span class="gift-badge">Unlocked</span>' +
          "</div>"
        );
      })
      .join("");

    MB.setText(
      "giftsSub",
      payload.unlocked
        ? "Your caretaker left you a special gift."
        : "Reach 80% or higher in a game to unlock a gift."
    );
  }

  async function acknowledgeAlert(row) {
    var title = row.dataset.title;
    var body = row.dataset.body;

    row.style.pointerEvents = "none";

    speak(title + " " + t("acknowledged"));

    try {
      await MB.api("/api/alerts", {
        method: "POST",
        body: JSON.stringify({
          alertTitle: title,
          alertBody: body,
          status: "Acknowledged"
        })
      });

      row.style.transition =
        "opacity .35s ease, transform .35s ease";

      row.style.opacity = "0";
      row.style.transform = "translateX(18px)";

      setTimeout(loadAlerts, 350);
    } catch (error) {
      row.style.pointerEvents = "";
      handleError(error);
    }
  }

  function bump(id) {
    var element = document.getElementById(id);

    if (!element) return;

    element.classList.add("bump");

    setTimeout(function () {
      element.classList.remove("bump");
    }, 500);
  }

  /* ============================================================== GAMES */

  var sessionStartedAt = 0;

  var difficultyOrder = [
    "easy",
    "medium",
    "hard"
  ];

  var difficultyLabels = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard"
  };

  var difficultyIcons = {
    easy: "🌱",
    medium: "🌿",
    hard: "🌳"
  };

  var selectedDifficulty = "easy";
  var difficultyInitialised = false;

  var completedGames = {
    easy: {},
    medium: {},
    hard: {}
  };

  var unlockedDifficulty = "easy";
  var cycleStartedAt = 0;

  /*
    GAMES AVAILABLE PER STAGE.

    No category labels are shown in the game chooser.
  */

  var GAME_CATALOG = {

    easy: [
      {
        key: "word",
        icon: "🌱",
        name: "Word Garden",
        category: "Language"
      },
      {
        key: "memory",
        icon: "🧠",
        name: "Memory Match",
        category: "Memory"
      },
      {
        key: "picture",
        icon: "🔍",
        name: "Picture Path",
        category: "Focus"
      },
      {
        key: "category",
        icon: "🧺",
        name: "Sort & Match",
        category: "Reasoning"
      },
    ],

    medium: [
      {
        key: "word",
        icon: "🌿",
        name: "Word Garden",
        category: "Language"
      },
      {
        key: "memory",
        icon: "🧩",
        name: "Memory Match",
        category: "Memory"
      },
      {
        key: "color",
        icon: "🎨",
        name: "Color Clash",
        category: "Executive Function"
      },
      {
        key: "sequence",
        icon: "🔢",
        name: "Pattern Recall",
        category: "Working Memory"
      },
      {
        key: "scramble",
        icon: "🔤",
        name: "Letter Scramble",
        category: "Language"
      }
    ],

    hard: [
      {
        key: "memory",
        icon: "🧠",
        name: "Memory Match",
        category: "Memory"
      },
      {
        key: "color",
        icon: "🎨",
        name: "Color Clash",
        category: "Executive Function"
      },
      {
        key: "odd",
        icon: "🟡",
        name: "Odd One Out",
        category: "Reasoning"
      },
      {
        key: "sequence",
        icon: "🔢",
        name: "Pattern Recall",
        category: "Working Memory"
      },
      {
        key: "chess",
        icon: "♟️",
        name: "Chess",
        category: "Planning"
      }
    ]
  };

  function configuredDifficulty(profile) {
    var configured =
      profile &&
      (profile.difficulty ||
        profile.stage ||
        profile.difficultyLevel);

    var stored =
      window.localStorage.getItem("mindbridgeDifficulty");

    configured = String(
      configured ||
      stored ||
      "easy"
    ).toLowerCase();

    return difficultyOrder.indexOf(configured) > -1
      ? configured
      : "easy";
  }

  function progressStorageKey() {
    return (
      "mindbridgeGameProgress:" +
      (state.profile && state.profile.id
        ? state.profile.id
        : "guest")
    );
  }

  function loadGameProgress() {
    var now = Date.now();

    try {
      var saved = JSON.parse(
        window.localStorage.getItem(
          progressStorageKey()
        ) || "null"
      );

      if (
        saved &&
        saved.completed &&
        saved.cycleStartedAt
      ) {
        cycleStartedAt = Number(
          saved.cycleStartedAt
        );

        if (
          now - cycleStartedAt <
          24 * 60 * 60 * 1000
        ) {
          completedGames = saved.completed;

          unlockedDifficulty =
            difficultyOrder.indexOf(
              saved.unlockedDifficulty
            ) > -1
              ? saved.unlockedDifficulty
              : "easy";

          selectedDifficulty =
            unlockedDifficulty;

          return;
        }
      } else if (
        saved &&
        saved.easy &&
        saved.medium &&
        saved.hard
      ) {
        completedGames = saved;
      }
    } catch (error) {
      console.error(
        "Invalid game progress. Starting clean.",
        error
      );
    }

    resetDailyProgress();
  }

  function saveGameProgress() {
    window.localStorage.setItem(
      progressStorageKey(),
      JSON.stringify({
        completed: completedGames,
        unlockedDifficulty: unlockedDifficulty,
        cycleStartedAt:
          cycleStartedAt || Date.now()
      })
    );
  }

  function resetDailyProgress() {
    completedGames = {
      easy: {},
      medium: {},
      hard: {}
    };

    unlockedDifficulty = "easy";
    selectedDifficulty = "easy";
    cycleStartedAt = Date.now();

    saveGameProgress();
  }

  function refreshDailyCycle() {
    if (
      cycleStartedAt &&
      Date.now() - cycleStartedAt >=
        24 * 60 * 60 * 1000
    ) {
      resetDailyProgress();
    }
  }

  function stageComplete(stage) {
    return GAME_CATALOG[stage].every(
      function (game) {
        return completedGames[stage][game.key];
      }
    );
  }

  function markGameComplete(gameKey) {
    completedGames[selectedDifficulty][gameKey] =
      true;

    saveGameProgress();

    if (!stageComplete(selectedDifficulty)) {
      return;
    }

    var currentIndex =
      difficultyOrder.indexOf(
        selectedDifficulty
      );

    if (
      currentIndex <
      difficultyOrder.length - 1
    ) {
      selectedDifficulty =
        difficultyOrder[currentIndex + 1];

      unlockedDifficulty =
        selectedDifficulty;

      saveGameProgress();

      openModal(
        "<h3>Stage complete!</h3>" +

        '<p class="game-instructions">' +
        "All " +
        difficultyLabels[
          difficultyOrder[currentIndex]
        ] +
        " exercises are complete." +
        "</p>" +

        '<button class="btn full" id="nextStageBtn" type="button">' +
        difficultyIcons[
          selectedDifficulty
        ] +
        " Continue to " +
        difficultyLabels[
          selectedDifficulty
        ] +
        "</button>"
      );

      speak(
        "Stage complete. Continue to " +
        difficultyLabels[selectedDifficulty] +
        "."
      );

      document
        .getElementById("nextStageBtn")
        .addEventListener(
          "click",
          showGameChooser
        );

    } else {
      openModal(
        "<h3>Today’s games complete!</h3>" +

        '<p class="game-instructions">' +
        "You completed Easy, Medium, and Hard. " +
        "New games will open after the 24-hour daily reset." +
        "</p>"
      );

      speak(
        "Today's games are complete. " +
        "New games will open after the daily reset."
      );
    }
  }

  function showRetry(name, score) {
    openModal(
      "<h3>Try again</h3>" +

      '<p class="game-instructions">' +
      localisedGameName(name) +
      " scored " +
      score +
      "%. You need 80% or higher to complete this exercise." +
      "</p>" +

      '<button class="btn full" id="retryGameBtn" type="button">' +
      "Play again" +
      "</button>"
    );

    speak(
      "Please try again. " +
      "You need 80 percent or higher to complete this exercise."
    );

    document
      .getElementById("retryGameBtn")
      .addEventListener(
        "click",
        function () {
          launchGame(
            gameKeyForName(name)
          );
        }
      );
  }

  function gameKeyForName(name) {
    var game =
      GAME_CATALOG[selectedDifficulty].filter(
        function (item) {
          return item.name === name;
        }
      )[0];

    return game ? game.key : "word";
  }

  /* =========================================================
     WORD GARDEN
     ========================================================= */

  async function startWordGarden() {
    var questions = I18N.wordSets();
    var difficulty = "easy";

    try {
      var generated = await MB.api(
        "/api/ai/word-question",
        {
          method: "POST",
          body: JSON.stringify({
            usedWords: [],
            difficulty: selectedDifficulty
          })
        }
      );

      if (
        generated.prompt &&
        Array.isArray(generated.options) &&
        generated.options.length === 4
      ) {
        questions = [
          generated
        ].concat(
          questions.slice(1)
        );
      }

      difficulty =
        generated.difficulty ||
        difficulty;

    } catch (error) {
      console.error(
        "Word Garden AI question unavailable:",
        error.message
      );
    }

    questions = questions.slice(
      0,
      selectedDifficulty === "easy"
        ? 3
        : selectedDifficulty === "medium"
        ? 4
        : 5
    );

    var index = 0;
    var correct = 0;

    sessionStartedAt = Date.now();

    function renderQuestion() {
      var question = questions[index];

      openModal(
        "<h3>🌱 " +
        t("wordGarden") +
        "</h3>" +

        '<p class="game-instructions">' +
        t("questionOf", {
          i: index + 1,
          n: questions.length
        }) +
        "</p>" +

        '<div id="wordDifficulty" style="text-align:center;margin:10px 0;font-weight:900;color:#66bb6a;font-size:17px;">' +
        "📊 Difficulty: " +
        '<span id="difficultyLevel">' +
        MB.escapeHtml(
          difficulty.toUpperCase()
        ) +
        "</span></div>" +

        '<p class="game-question">' +
        MB.escapeHtml(
          question.prompt
        ) +
        "</p>" +

        '<div class="word-grid">' +

        question.options
          .map(function (option) {
            return (
              '<div class="word-card" data-opt="' +
              MB.escapeHtml(option) +
              '">' +
              MB.escapeHtml(option) +
              "</div>"
            );
          })
          .join("") +

        "</div>"
      );

      speak(
        question.prompt +
        ". " +
        question.options.join(", ")
      );

      Array.prototype.forEach.call(
        modalContent.querySelectorAll(
          ".word-card"
        ),
        function (card) {
          card.addEventListener(
            "click",
            function () {
              var chosen =
                card.dataset.opt;

              Array.prototype.forEach.call(
                modalContent.querySelectorAll(
                  ".word-card"
                ),
                function (other) {
                  if (
                    other.dataset.opt ===
                    question.answer
                  ) {
                    other.classList.add(
                      "correct"
                    );
                  } else if (
                    other === card
                  ) {
                    other.classList.add(
                      "wrong"
                    );
                  }
                }
              );

              if (
                chosen ===
                question.answer
              ) {
                correct += 1;
                speak(t("correct"));
              } else {
                speak(t("notQuite"));
              }

              setTimeout(
                function () {
                  index += 1;

                  if (
                    index <
                    questions.length
                  ) {
                    renderQuestion();
                  } else {
                    finishGame(
                      "Word Garden",
                      Math.round(
                        (correct /
                          questions.length) *
                          100
                      )
                    );
                  }
                },
                650
              );
            }
          );
        }
      );
    }

    renderQuestion();
  }

  /* =========================================================
     MEMORY MATCH
     ========================================================= */

  function startMemoryMatch() {
    var pairCount =
      selectedDifficulty === "easy"
        ? 4
        : selectedDifficulty === "medium"
        ? 6
        : 8;

    var iconPool = [
      "🌸",
      "🍎",
      "⭐",
      "🐦",
      "🍀",
      "🌈",
      "🎈",
      "🍋"
    ];

    var icons =
      iconPool
        .slice(0, pairCount)
        .concat(
          iconPool.slice(0, pairCount)
        );

    var shuffled = icons
      .map(function (value) {
        return {
          value: value,
          sort: Math.random()
        };
      })
      .sort(function (a, b) {
        return a.sort - b.sort;
      })
      .map(function (item) {
        return item.value;
      });

    var flipped = [];
    var matched = 0;
    var moves = 0;

    sessionStartedAt = Date.now();

    openModal(
      "<h3>🧠 " +
      t("memoryMatch") +
      "</h3>" +

      '<p class="game-instructions">' +
      t("findPairs") +
      "</p>" +

      '<div class="word-grid" id="memGrid" style="grid-template-columns:repeat(4,1fr);"></div>'
    );

    speak(
      t("memoryMatch") +
      ". " +
      t("findPairs")
    );

    var grid =
      document.getElementById(
        "memGrid"
      );

    shuffled.forEach(
      function (icon) {
        var card =
          document.createElement(
            "div"
          );

        card.className =
          "word-card";

        card.style.fontSize =
          "22px";

        card.textContent =
          icon;

        card.dataset.icon =
          icon;

        card.dataset.state =
          "preview";

        card.addEventListener(
          "click",
          function () {
            if (
              card.dataset.state !==
                "hidden" ||
              flipped.length === 2
            ) {
              return;
            }

            card.textContent =
              icon;

            card.dataset.state =
              "shown";

            flipped.push(card);

            if (
              flipped.length !== 2
            ) {
              return;
            }

            moves += 1;

            var first =
              flipped[0];

            var second =
              flipped[1];

            if (
              first.dataset.icon ===
              second.dataset.icon
            ) {
              first.classList.add(
                "correct"
              );

              second.classList.add(
                "correct"
              );

              first.dataset.state =
                "matched";

              second.dataset.state =
                "matched";

              matched += 1;
              flipped = [];

              speak(t("matched"));

              if (
                matched ===
                pairCount
              ) {
                var score =
                  Math.max(
                    40,
                    100 -
                      (moves -
                        pairCount) *
                        (selectedDifficulty ===
                        "hard"
                          ? 6
                          : 8)
                  );

                setTimeout(
                  function () {
                    finishGame(
                      "Memory Match",
                      score
                    );
                  },
                  500
                );
              }

            } else {
              setTimeout(
                function () {
                  first.textContent =
                    "❔";

                  second.textContent =
                    "❔";

                  first.dataset.state =
                    "hidden";

                  second.dataset.state =
                    "hidden";

                  flipped = [];
                },
                700
              );
            }
          }
        );

        grid.appendChild(card);
      }
    );

    var previewSeconds =
      selectedDifficulty === "hard"
        ? 4
        : 3;

    speak(
      "Memorize the cards. They will flip in " +
      previewSeconds +
      " seconds."
    );

    setTimeout(
      function () {
        Array.prototype.forEach.call(
          grid.querySelectorAll(
            ".word-card"
          ),
          function (card) {
            if (
              card.dataset.state ===
              "preview"
            ) {
              card.textContent =
                "❔";

              card.dataset.state =
                "hidden";
            }
          }
        );

        speak(t("findPairs"));
      },
      previewSeconds * 1000
    );
  }

  /* =========================================================
     PICTURE PATH
     ========================================================= */

  function startPicturePath() {
    var symbols = [
      "🔺",
      "🔵",
      "⬛",
      "⭐",
      "🔶",
      "🟢",
      "🟣",
      "🟧"
    ];

    var names =
      I18N.shapeNames();

    var symbolCount =
      selectedDifficulty === "easy"
        ? 6
        : selectedDifficulty === "medium"
        ? 7
        : 8;

    var sequenceLength =
      selectedDifficulty === "easy"
        ? 3
        : selectedDifficulty === "medium"
        ? 4
        : 5;

    var sequence =
      new Array(sequenceLength)
        .fill(0)
        .map(function () {
          return Math.floor(
            Math.random() *
              symbolCount
          );
        });

    var step = 0;
    var wrong = 0;

    sessionStartedAt = Date.now();

    openModal(
      "<h3>🔍 " +
      t("picturePath") +
      "</h3>" +

      '<p class="game-instructions">' +
      t("tapOrder") +
      "</p>" +

      '<p class="game-question">' +
      sequence
        .map(function (i) {
          return symbols[i];
        })
        .join(" → ") +
      "</p>" +

      '<div class="word-grid" id="ppGrid" style="grid-template-columns:repeat(3,1fr);"></div>'
    );

    speak(
      t("picturePath") +
      ". " +
      sequence
        .map(function (i) {
          return names[i];
        })
        .join(", ")
    );

    var grid =
      document.getElementById(
        "ppGrid"
      );

    Array.from(
      { length: symbolCount },
      function (_, index) {
        return index;
      }
    )
      .sort(function () {
        return Math.random() - 0.5;
      })
      .forEach(function (index) {
        var card =
          document.createElement(
            "div"
          );

        card.className =
          "word-card";

        card.style.fontSize =
          "26px";

        card.textContent =
          symbols[index];

        card.addEventListener(
          "click",
          function () {
            if (
              index ===
              sequence[step]
            ) {
              card.classList.add(
                "correct"
              );

              step += 1;

              if (
                step ===
                sequence.length
              ) {
                var score =
                  Math.max(
                    50,
                    100 -
                      wrong * 10
                  );

                setTimeout(
                  function () {
                    finishGame(
                      "Picture Path",
                      score
                    );
                  },
                  400
                );
              }

            } else {
              card.classList.add(
                "wrong"
              );

              wrong += 1;

              speak(t("tryAgain"));

              setTimeout(
                function () {
                  card.classList.remove(
                    "wrong"
                  );
                },
                400
              );
            }
          }
        );

        grid.appendChild(card);
      });
  }

  /* =========================================================
     COLOR CLASH
     ========================================================= */

  function startColorClash() {
    var rounds =
      selectedDifficulty === "easy"
        ? 3
        : selectedDifficulty === "medium"
        ? 5
        : 7;

    var correct = 0;
    var count = 0;

    var colors = [
      {
        label: "Red",
        value: "#d94a4a"
      },
      {
        label: "Blue",
        value: "#3b82f6"
      },
      {
        label: "Green",
        value: "#3e9b6e"
      },
      {
        label: "Yellow",
        value: "#d9a426"
      }
    ];

    sessionStartedAt = Date.now();

    function renderRound() {
      var wordIndex =
        Math.floor(
          Math.random() *
            colors.length
        );

      var inkIndex =
        Math.floor(
          Math.random() *
            colors.length
        );

      var target =
        colors[wordIndex].label;

      var inkColor =
        colors[inkIndex].value;

      var options =
        colors
          .slice()
          .sort(function () {
            return Math.random() -
              0.5;
          });

      openModal(
        "<h3>🎨 " +
        t("colorClash") +
        "</h3>" +

        '<p class="game-instructions">' +
        t("chooseInkColor") +
        "</p>" +

        '<p class="game-question" style="font-size:32px !important;color:' +
        inkColor +
        ';">' +
        MB.escapeHtml(target) +
        "</p>" +

        '<div class="word-grid" id="colorGrid" style="grid-template-columns:repeat(2,1fr);"></div>'
      );

      speak(
        t("colorClash") +
        ". " +
        t("chooseInkColor") +
        ". " +
        target +
        "."
      );

      var grid =
        document.getElementById(
          "colorGrid"
        );

      options.forEach(
        function (option) {
          var card =
            document.createElement(
              "button"
            );

          card.type = "button";
          card.className =
            "word-card";

          card.textContent =
            option.label;

          card.style.background =
            "#fff";

          card.style.color =
            option.value;

          card.style.borderColor =
            option.value;

          card.addEventListener(
            "click",
            function () {
              var isCorrect =
                option.label ===
                colors[inkIndex]
                  .label;

              if (isCorrect) {
                correct += 1;
                speak(t("correct"));
              } else {
                speak(t("notQuite"));
              }

              count += 1;

              setTimeout(
                function () {
                  if (
                    count <
                    rounds
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Color Clash",
                      Math.round(
                        (correct /
                          rounds) *
                          100
                      )
                    );
                  }
                },
                550
              );
            }
          );

          grid.appendChild(card);
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     SORT & MATCH
     ========================================================= */

  function startCategorySort() {
    var rounds = 4;
    var round = 0;
    var correct = 0;

    var sets = [
      {
        category: "Fruit",
        answer: "🍎",
        options: [
          "🍎",
          "🧦",
          "🚲",
          "📘"
        ]
      },
      {
        category: "Animal",
        answer: "🐶",
        options: [
          "🌼",
          "🐶",
          "🪑",
          "✏️"
        ]
      },
      {
        category: "Clothing",
        answer: "👕",
        options: [
          "🍋",
          "🏠",
          "👕",
          "🎵"
        ]
      },
      {
        category: "Transport",
        answer: "🚗",
        options: [
          "🚗",
          "🍞",
          "🌳",
          "📚"
        ]
      }
    ];

    sessionStartedAt = Date.now();

    function renderRound() {
      var current =
        sets[round];

      openModal(
        "<h3>🧺 Sort & Match</h3>" +

        '<p class="game-instructions">' +
        "Choose the " +
        current.category +
        "." +
        "</p>" +

        '<div class="word-grid" id="categoryGrid" style="grid-template-columns:repeat(2,1fr);"></div>'
      );

      speak(
        "Sort and Match. Choose the " +
        current.category +
        "."
      );

      current.options.forEach(
        function (option) {
          var card =
            document.createElement(
              "button"
            );

          card.type = "button";
          card.className =
            "word-card";

          card.style.fontSize =
            "30px";

          card.textContent =
            option;

          card.addEventListener(
            "click",
            function () {
              if (
                option ===
                current.answer
              ) {
                correct += 1;
                card.classList.add(
                  "correct"
                );
                speak(t("correct"));
              } else {
                card.classList.add(
                  "wrong"
                );
                speak(t("notQuite"));
              }

              setTimeout(
                function () {
                  round += 1;

                  if (
                    round <
                    rounds
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Sort & Match",
                      Math.round(
                        (correct /
                          rounds) *
                          100
                      )
                    );
                  }
                },
                500
              );
            }
          );

          document
            .getElementById(
              "categoryGrid"
            )
            .appendChild(card);
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     ODD ONE OUT
     ========================================================= */

  function startOddOneOut() {
    var rounds = 4;
    var round = 0;
    var correct = 0;

    var sets = [
      [
        "🍎",
        "🍐",
        "🍊",
        "🐶"
      ],
      [
        "🔵",
        "🔵",
        "⭐",
        "🔵"
      ],
      [
        "🚗",
        "🚲",
        "🚌",
        "🍞"
      ],
      [
        "🌸",
        "🌸",
        "🌸",
        "🌵"
      ]
    ];

    sessionStartedAt = Date.now();

    function renderRound() {
      var options =
        sets[round];

      var odd =
        round === 0
          ? 3
          : round === 1
          ? 2
          : round === 2
          ? 3
          : 3;

      openModal(
        "<h3>🟡 Odd One Out</h3>" +

        '<p class="game-instructions">' +
        "Tap the one that is different." +
        "</p>" +

        '<div class="word-grid" id="oddGrid" style="grid-template-columns:repeat(2,1fr);"></div>'
      );

      speak(
        "Odd One Out. Tap the one that is different."
      );

      options.forEach(
        function (option, index) {
          var card =
            document.createElement(
              "button"
            );

          card.type = "button";
          card.className =
            "word-card";

          card.style.fontSize =
            "30px";

          card.textContent =
            option;

          card.addEventListener(
            "click",
            function () {
              if (
                index === odd
              ) {
                correct += 1;
                card.classList.add(
                  "correct"
                );
                speak(t("correct"));
              } else {
                card.classList.add(
                  "wrong"
                );
                speak(t("notQuite"));
              }

              setTimeout(
                function () {
                  round += 1;

                  if (
                    round <
                    rounds
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Odd One Out",
                      Math.round(
                        (correct /
                          rounds) *
                          100
                      )
                    );
                  }
                },
                500
              );
            }
          );

          document
            .getElementById(
              "oddGrid"
            )
            .appendChild(card);
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     PATTERN RECALL
     ========================================================= */

  function startSequenceRecall() {
    var length =
      selectedDifficulty ===
      "medium"
        ? 4
        : 5;

    var symbols = [
      "🔺",
      "🔵",
      "⭐",
      "🍀",
      "🌸",
      "🟠"
    ];

    var sequence =
      new Array(length)
        .fill(0)
        .map(function () {
          return symbols[
            Math.floor(
              Math.random() *
                symbols.length
            )
          ];
        });

    var options =
      symbols
        .slice()
        .sort(function () {
          return Math.random() -
            0.5;
        });

    var answer = [];

    sessionStartedAt = Date.now();

    openModal(
      "<h3>🔢 Pattern Recall</h3>" +

      '<p class="game-instructions">' +
      "Remember the pattern." +
      "</p>" +

      '<p class="game-question" id="sequencePrompt">' +
      sequence.join(" ") +
      "</p>"
    );

    speak(
      "Pattern Recall. Remember the pattern."
    );

    setTimeout(
      function () {
        openModal(
          "<h3>🔢 Pattern Recall</h3>" +

          '<p class="game-instructions">' +
          "Tap the symbols in the same order." +
          "</p>" +

          '<p class="game-question" id="sequenceAnswer" style="min-height:38px;"></p>' +

          '<div class="word-grid" id="sequenceGrid" style="grid-template-columns:repeat(3,1fr);"></div>'
        );

        options.forEach(
          function (option) {
            var card =
              document.createElement(
                "button"
              );

            card.type = "button";
            card.className =
              "word-card";

            card.style.fontSize =
              "26px";

            card.textContent =
              option;

            card.addEventListener(
              "click",
              function () {
                answer.push(
                  option
                );

                document.getElementById(
                  "sequenceAnswer"
                ).textContent =
                  answer.join(" ");

                if (
                  answer.length <
                  sequence.length
                ) {
                  return;
                }

                var score =
                  answer.join("") ===
                  sequence.join("")
                    ? 100
                    : Math.max(
                        40,
                        100 -
                          answer.filter(
                            function (
                              item,
                              index
                            ) {
                              return (
                                item !==
                                sequence[
                                  index
                                ]
                              );
                            }
                          ).length *
                            20
                      );

                setTimeout(
                  function () {
                    finishGame(
                      "Pattern Recall",
                      score
                    );
                  },
                  500
                );
              }
            );

            document
              .getElementById(
                "sequenceGrid"
              )
              .appendChild(card);
          }
        );
      },
      selectedDifficulty ===
        "hard"
        ? 2300
        : 1700
    );
  }

  /* =========================================================
     CANDY MATCH
     ========================================================= */

  function startCandyMatch() {
    var width = 8;

    var candyTypes = [
      "🍬",
      "🍫",
      "🍭",
      "🍩",
      "🍪"
    ];

    var board = [];
    var score = 0;
    var moves = 30;
    var selected = null;
    var finished = false;

    sessionStartedAt = Date.now();

    openModal(
      "<h3>🍬 Candy Match</h3>" +

      '<p class="game-instructions">' +
      "Tap two adjacent candies to make a row of three." +
      "</p>" +

      '<p class="sub sans">' +
      'Moves left: <b id="candyMoves">' +
      moves +
      "</b> | Score: <b id=\"candyScore\">" +
      score +
      "</b></p>" +

      '<div id="candyGrid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin:0 auto;width:min(92vw,680px);background:var(--teal-100);padding:10px;border-radius:18px;"></div>'
    );

    speak(
      "Candy Match. Tap two adjacent candies to make a row of three."
    );

    function finishCandy() {
      if (finished) return;

      finished = true;

      setTimeout(
        function () {
          finishGame(
            "Candy Match",
            Math.min(100, score)
          );
        },
        500
      );
    }

    function checkMatches() {
      var matchFound = false;

      for (
        var index = 0;
        index < width * width;
        index += 1
      ) {
        if (
          index % width <
            width - 2 &&
          board[index].textContent ===
            board[index + 1]
              .textContent &&
          board[index + 1]
              .textContent ===
            board[index + 2]
              .textContent
        ) {
          board[index].dataset.match =
            "true";

          board[index + 1].dataset.match =
            "true";

          board[index + 2].dataset.match =
            "true";

          matchFound = true;
        }

        if (
          index <
            width *
              (width - 2) &&
          board[index].textContent ===
            board[index + width]
              .textContent &&
          board[index + width]
              .textContent ===
            board[
              index + width * 2
            ].textContent
        ) {
          board[index].dataset.match =
            "true";

          board[index + width].dataset.match =
            "true";

          board[
            index + width * 2
          ].dataset.match =
            "true";

          matchFound = true;
        }
      }

      if (!matchFound) {
        return false;
      }

      score += 10;

      document.getElementById(
        "candyScore"
      ).textContent = score;

      board.forEach(
        function (candy) {
          if (
            candy.dataset.match ===
            "true"
          ) {
            candy.textContent =
              "💥";

            candy.dataset.match =
              "false";
          }
        }
      );

      setTimeout(
        function () {
          board.forEach(
            function (candy) {
              if (
                candy.textContent ===
                "💥"
              ) {
                candy.textContent =
                  candyTypes[
                    Math.floor(
                      Math.random() *
                        candyTypes.length
                    )
                  ];
              }
            }
          );
        },
        350
      );

      return true;
    }

    var grid =
      document.getElementById(
        "candyGrid"
      );

    for (
      var index = 0;
      index < width * width;
      index += 1
    ) {
      var candy =
        document.createElement(
          "button"
        );

      candy.type = "button";

      candy.style.cssText =
        "background:#fff;border:0;border-radius:10px;font-size:clamp(20px,4vw,38px);aspect-ratio:1;cursor:pointer;user-select:none;";

      candy.textContent =
        candyTypes[
          Math.floor(
            Math.random() *
              candyTypes.length
          )
        ];

      candy.dataset.id =
        index;

      candy.addEventListener(
        "click",
        function () {
          if (finished) return;

          var current = this;

          if (!selected) {
            selected = current;

            current.style.transform =
              "scale(1.12)";

            current.style.boxShadow =
              "0 0 0 2px var(--teal-500)";

            return;
          }

          var firstId =
            parseInt(
              selected.dataset.id,
              10
            );

          var currentId =
            parseInt(
              current.dataset.id,
              10
            );

          var adjacent =
            [1, -1, width, -width]
              .indexOf(
                currentId - firstId
              ) > -1 &&
            !(
              firstId % width ===
                width - 1 &&
              currentId % width ===
                0
            ) &&
            !(
              firstId % width ===
                0 &&
              currentId % width ===
                width - 1
            );

          if (adjacent) {
            var temporary =
              selected.textContent;

            selected.textContent =
              current.textContent;

            current.textContent =
              temporary;

            if (checkMatches()) {
              moves -= 1;

              document.getElementById(
                "candyMoves"
              ).textContent =
                moves;

              if (moves <= 0) {
                finishCandy();
              }
            } else {
              current.textContent =
                selected.textContent;

              selected.textContent =
                temporary;

              speak(
                "Try another move."
              );
            }
          }

          selected.style.transform =
            "scale(1)";

          selected.style.boxShadow =
            "none";

          selected = null;
        }
      );

      grid.appendChild(candy);
      board.push(candy);
    }
  }

  /* =========================================================
     LETTER SCRAMBLE
     ========================================================= */

  function startLetterScramble() {
    var rounds = 4;
    var round = 0;
    var correct = 0;

    var words = [
      "APPLE",
      "HOUSE",
      "GARDEN",
      "FAMILY"
    ];

    sessionStartedAt = Date.now();

    function renderRound() {
      var answer =
        words[round];

      var letters =
        answer
          .split("")
          .sort(function () {
            return Math.random() -
              0.5;
          });

      var typed = [];

      openModal(
        "<h3>🔤 Letter Scramble</h3>" +

        '<p class="game-instructions">' +
        "Arrange the letters to make a familiar word." +
        "</p>" +

        '<p class="game-question" id="scrambleAnswer" style="min-height:36px;letter-spacing:4px;"></p>' +

        '<p class="sub sans" id="scrambleFeedback" style="min-height:20px;margin-bottom:10px;"></p>' +

        '<div class="word-grid" id="scrambleGrid" style="grid-template-columns:repeat(4,1fr);"></div>'
      );

      speak(
        "Letter Scramble. Arrange the letters to make a familiar word."
      );

      letters.forEach(
        function (letter) {
          var card =
            document.createElement(
              "button"
            );

          card.type = "button";
          card.className =
            "word-card";

          card.textContent =
            letter;

          card.addEventListener(
            "click",
            function () {
              if (
                card.disabled ||
                typed.length >=
                  answer.length
              ) {
                return;
              }

              typed.push(letter);

              card.disabled =
                true;

              document.getElementById(
                "scrambleAnswer"
              ).textContent =
                typed.join(" ");

              if (
                typed.length <
                answer.length
              ) {
                return;
              }

              var isCorrect =
                typed.join("") ===
                answer;

              if (isCorrect) {
                correct += 1;

                document.getElementById(
                  "scrambleFeedback"
                ).textContent =
                  "Correct!";

                document.getElementById(
                  "scrambleFeedback"
                ).style.color =
                  "var(--green-700)";

                speak(
                  "Correct!"
                );

              } else {
                document.getElementById(
                  "scrambleFeedback"
                ).textContent =
                  "Not quite. The word was " +
                  answer +
                  ".";

                document.getElementById(
                  "scrambleFeedback"
                ).style.color =
                  "var(--red-600)";

                speak(
                  "Not quite. The word was " +
                  answer +
                  "."
                );
              }

              Array.prototype.forEach.call(
                document
                  .getElementById(
                    "scrambleGrid"
                  )
                  .querySelectorAll(
                    "button"
                  ),
                function (button) {
                  button.disabled =
                    true;
                }
              );

              setTimeout(
                function () {
                  round += 1;

                  if (
                    round <
                    rounds
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Letter Scramble",
                      Math.round(
                        (correct /
                          rounds) *
                          100
                      )
                    );
                  }
                },
                900
              );
            }
          );

          document
            .getElementById(
              "scrambleGrid"
            )
            .appendChild(card);
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     CHESS
     ========================================================= */

  function startChess() {
    var rounds = 4;
    var round = 0;
    var correct = 0;

    var positions = [
      {
        prompt:
          "Which piece can move in an L shape?",
        options: [
          "♞ Knight",
          "♜ Rook",
          "♝ Bishop"
        ],
        answer:
          "♞ Knight"
      },
      {
        prompt:
          "Which piece moves diagonally?",
        options: [
          "♝ Bishop",
          "♜ Rook",
          "♟ Pawn"
        ],
        answer:
          "♝ Bishop"
      },
      {
        prompt:
          "Which piece is most important to protect?",
        options: [
          "♚ King",
          "♜ Rook",
          "♟ Pawn"
        ],
        answer:
          "♚ King"
      },
      {
        prompt:
          "Which piece moves in straight lines?",
        options: [
          "♜ Rook",
          "♞ Knight",
          "♝ Bishop"
        ],
        answer:
          "♜ Rook"
      }
    ];

    sessionStartedAt = Date.now();

    function renderRound() {
      var position =
        positions[round];

      openModal(
        "<h3>♟️ Chess</h3>" +

        '<p class="game-instructions">' +
        position.prompt +
        "</p>" +

        '<div class="word-grid" id="chessGrid" style="grid-template-columns:1fr;"></div>'
      );

      speak(
        "Chess. " +
        position.prompt
      );

      position.options.forEach(
        function (option) {
          var card =
            document.createElement(
              "button"
            );

          card.type = "button";
          card.className =
            "word-card";

          card.textContent =
            option;

          card.addEventListener(
            "click",
            function () {
              if (
                option ===
                position.answer
              ) {
                correct += 1;
              }

              setTimeout(
                function () {
                  round += 1;

                  if (
                    round <
                    rounds
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Chess",
                      Math.round(
                        (correct /
                          rounds) *
                          100
                      )
                    );
                  }
                },
                450
              );
            }
          );

          document
            .getElementById(
              "chessGrid"
            )
            .appendChild(card);
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     CLASSIC SOLITAIRE
     Mobile tap-to-move Klondike-style game.
     ========================================================= */

  function startSolitaire() {
    var suits = [
      {
        symbol: "♥",
        color: "red"
      },
      {
        symbol: "♦",
        color: "red"
      },
      {
        symbol: "♣",
        color: "black"
      },
      {
        symbol: "♠",
        color: "black"
      }
    ];

    var ranks = [
      "A",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K"
    ];

    var deck = [];

    suits.forEach(
      function (suit, suitIndex) {
        ranks.forEach(
          function (rank, rankIndex) {
            deck.push({
              id:
                suitIndex +
                "-" +
                rankIndex,
              suit:
                suit.symbol,
              color:
                suit.color,
              rank:
                rank,
              value:
                rankIndex + 1,
              faceUp:
                false
            });
          }
        );
      }
    );

    deck.sort(function () {
      return Math.random() - 0.5;
    });

    var tableau = [
      [],
      [],
      [],
      [],
      [],
      [],
      []
    ];

    var stock = [];
    var waste = [];

    var foundations = {
      "♥": [],
      "♦": [],
      "♣": [],
      "♠": []
    };

    var moves = 0;
    var selected = null;
    var won = false;

    /*
      Deal seven tableau piles.
      The last card of each pile is face-up.
    */

    for (
      var pileIndex = 0;
      pileIndex < 7;
      pileIndex += 1
    ) {
      for (
        var cardIndex = 0;
        cardIndex <= pileIndex;
        cardIndex += 1
      ) {
        var card =
          deck.shift();

        card.faceUp =
          cardIndex ===
          pileIndex;

        tableau[pileIndex].push(
          card
        );
      }
    }

    stock = deck;

    sessionStartedAt =
      Date.now();

    openModal(
      "<h3>🃏 Classic Solitaire</h3>" +

      '<p class="game-instructions">' +
      "Tap a card, then tap where you want to move it. Build each suit from Ace to King." +
      "</p>" +

      '<p class="sub sans" style="text-align:center;font-weight:800;">Moves: <b id="solitaireMoves">0</b></p>' +

      '<div class="solitaire-top">' +

      '<button type="button" class="solitaire-stock" id="solitaireStock">🂠</button>' +

      '<button type="button" class="solitaire-waste" id="solitaireWaste">Waste</button>' +

      '<button type="button" class="solitaire-foundation" data-foundation="♥">♥</button>' +

      '<button type="button" class="solitaire-foundation" data-foundation="♦">♦</button>' +

      '<button type="button" class="solitaire-foundation" data-foundation="♣">♣</button>' +

      '<button type="button" class="solitaire-foundation" data-foundation="♠">♠</button>' +

      "</div>" +

      '<div class="solitaire-tableau" id="solitaireTableau"></div>'
    );

    var stockButton =
      document.getElementById(
        "solitaireStock"
      );

    var wasteButton =
      document.getElementById(
        "solitaireWaste"
      );

    var tableauElement =
      document.getElementById(
        "solitaireTableau"
      );

    function topWaste() {
      return waste.length
        ? waste[waste.length - 1]
        : null;
    }

    function topFoundation(
      suit
    ) {
      return foundations[
        suit
      ].length
        ? foundations[suit][
            foundations[suit]
              .length - 1
          ]
        : null;
    }

    function cardLabel(card) {
      return (
        card.rank +
        card.suit
      );
    }

    function isValidSequence(
      pile,
      startIndex
    ) {
      for (
        var i = startIndex;
        i < pile.length - 1;
        i += 1
      ) {
        var first =
          pile[i];

        var second =
          pile[i + 1];

        if (
          !first.faceUp ||
          !second.faceUp
        ) {
          return false;
        }

        if (
          first.value !==
          second.value + 1
        ) {
          return false;
        }

        if (
          first.color ===
          second.color
        ) {
          return false;
        }
      }

      return true;
    }

    function canMoveToTableau(
      movingCard,
      targetPile
    ) {
      if (!targetPile.length) {
        return (
          movingCard.value === 13
        );
      }

      var target =
        targetPile[
          targetPile.length - 1
        ];

      return (
        target.faceUp &&
        target.value ===
          movingCard.value + 1 &&
        target.color !==
          movingCard.color
      );
    }

    function canMoveToFoundation(
      card
    ) {
      var foundation =
        foundations[card.suit];

      if (!foundation.length) {
        return card.value === 1;
      }

      var top =
        foundation[
          foundation.length - 1
        ];

      return (
        card.value ===
          top.value + 1
      );
    }

    function clearSelection() {
      selected = null;
    }

    function checkWin() {
      var total = 0;

      Object.keys(
        foundations
      ).forEach(function (suit) {
        total +=
          foundations[suit]
            .length;
      });

      if (
        total === 52 &&
        !won
      ) {
        won = true;

        finishGame(
          "Classic Solitaire",
          100
        );
      }
    }

    function selectTableauCard(
      pileIndex,
      cardIndex
    ) {
      var pile =
        tableau[pileIndex];

      var card =
        pile[cardIndex];

      if (!card || !card.faceUp) {
        return;
      }

      if (
        !isValidSequence(
          pile,
          cardIndex
        )
      ) {
        speak(
          "Those cards cannot be moved together."
        );
        return;
      }

      selected = {
        type: "tableau",
        pileIndex:
          pileIndex,
        cardIndex:
          cardIndex
      };

      render();
    }

    function selectWaste() {
      if (!waste.length) {
        return;
      }

      selected = {
        type: "waste"
      };

      render();
    }

    function selectFoundation(
      suit
    ) {
      if (
        !foundations[suit].length
      ) {
        return;
      }

      selected = {
        type: "foundation",
        suit: suit
      };

      render();
    }

    function moveSelectedToTableau(
      targetPileIndex
    ) {
      if (!selected) {
        return;
      }

      var targetPile =
        tableau[targetPileIndex];

      var movingCards = [];

      if (
        selected.type ===
        "tableau"
      ) {
        var sourcePile =
          tableau[
            selected.pileIndex
          ];

        movingCards =
          sourcePile.splice(
            selected.cardIndex
          );

        if (
          !movingCards.length
        ) {
          clearSelection();
          render();
          return;
        }

        if (
          !canMoveToTableau(
            movingCards[0],
            targetPile
          )
        ) {
          sourcePile.push.apply(
            sourcePile,
            movingCards
          );

          speak(
            "That move is not allowed."
          );

          clearSelection();
          render();
          return;
        }

      } else if (
        selected.type ===
        "waste"
      ) {
        var wasteCard =
          waste.pop();

        if (
          !wasteCard ||
          !canMoveToTableau(
            wasteCard,
            targetPile
          )
        ) {
          if (wasteCard) {
            waste.push(
              wasteCard
            );
          }

          speak(
            "That move is not allowed."
          );

          clearSelection();
          render();
          return;
        }

        movingCards = [
          wasteCard
        ];

      } else if (
        selected.type ===
        "foundation"
      ) {
        var foundation =
          foundations[
            selected.suit
          ];

        var foundationCard =
          foundation.pop();

        if (
          !foundationCard ||
          !canMoveToTableau(
            foundationCard,
            targetPile
          )
        ) {
          if (foundationCard) {
            foundation.push(
              foundationCard
            );
          }

          speak(
            "That move is not allowed."
          );

          clearSelection();
          render();
          return;
        }

        movingCards = [
          foundationCard
        ];
      }

      targetPile.push.apply(
        targetPile,
        movingCards
      );

      if (
        selected.type ===
        "tableau"
      ) {
        var oldPile =
          tableau[
            selected.pileIndex
          ];

        if (
          oldPile.length &&
          !oldPile[
            oldPile.length - 1
          ].faceUp
        ) {
          oldPile[
            oldPile.length - 1
          ].faceUp = true;
        }
      }

      moves += 1;
      clearSelection();

      render();
    }

    function moveSelectedToFoundation(
      suit
    ) {
      if (!selected) {
        return;
      }

      var card = null;
      var sourcePile = null;

      if (
        selected.type ===
        "tableau"
      ) {
        sourcePile =
          tableau[
            selected.pileIndex
          ];

        if (
          selected.cardIndex !==
          sourcePile.length - 1
        ) {
          speak(
            "Only the top card can go to a foundation."
          );

          clearSelection();
          render();
          return;
        }

        card =
          sourcePile.pop();

      } else if (
        selected.type ===
        "waste"
      ) {
        card = waste.pop();

      } else {
        speak(
          "That card cannot be moved there."
        );

        clearSelection();
        render();
        return;
      }

      if (
        !card ||
        card.suit !== suit ||
        !canMoveToFoundation(card)
      ) {
        if (card) {
          if (
            selected.type ===
            "waste"
          ) {
            waste.push(card);
          } else {
            sourcePile.push(card);
          }
        }

        speak(
          "That card cannot go to this foundation."
        );

        clearSelection();
        render();
        return;
      }

      foundations[suit].push(
        card
      );

      if (
        sourcePile &&
        sourcePile.length &&
        !sourcePile[
          sourcePile.length - 1
        ].faceUp
      ) {
        sourcePile[
          sourcePile.length - 1
        ].faceUp = true;
      }

      moves += 1;
      clearSelection();

      render();
      checkWin();
    }

    function drawStock() {
      if (stock.length) {
        var card =
          stock.pop();

        card.faceUp = true;

        waste.push(card);

        moves += 1;

        clearSelection();

        render();

        return;
      }

      if (waste.length) {
        while (waste.length) {
          var recycled =
            waste.pop();

          recycled.faceUp =
            false;

          stock.push(
            recycled
          );
        }

        clearSelection();

        render();

        speak(
          "The waste pile has been recycled."
        );

        return;
      }

      speak(
        "There are no more cards here."
      );
    }

    function handleTableauTap(
      pileIndex,
      cardIndex
    ) {
      if (!selected) {
        selectTableauCard(
          pileIndex,
          cardIndex
        );

        return;
      }

      if (
        selected.type ===
          "tableau" &&
        selected.pileIndex ===
          pileIndex &&
        selected.cardIndex ===
          cardIndex
      ) {
        clearSelection();
        render();
        return;
      }

      moveSelectedToTableau(
        pileIndex
      );
    }

    function render() {
      tableauElement.innerHTML =
        "";

      document.getElementById(
        "solitaireMoves"
      ).textContent =
        moves;

      stockButton.textContent =
        stock.length
          ? "🂠"
          : waste.length
          ? "↻"
          : "—";

      var wasteCard =
        topWaste();

      wasteButton.innerHTML =
        wasteCard
          ? '<span class="' +
            (wasteCard.color ===
            "red"
              ? "red-card"
              : "black-card") +
            '">' +
            cardLabel(wasteCard) +
            "</span>"
          : "Waste";

      if (
        selected &&
        selected.type ===
          "waste"
      ) {
        wasteButton.style.boxShadow =
          "0 0 0 3px #f2b84b";
      } else {
        wasteButton.style.boxShadow =
          "";
      }

      Array.prototype.forEach.call(
        document.querySelectorAll(
          ".solitaire-foundation"
        ),
        function (button) {
          var suit =
            button.dataset
              .foundation;

          var top =
            topFoundation(suit);

          button.innerHTML =
            top
              ? '<span class="' +
                (top.color ===
                "red"
                  ? "red-card"
                  : "black-card") +
                '">' +
                cardLabel(top) +
                "</span>"
              : suit;

          if (
            selected &&
            selected.type ===
              "foundation" &&
            selected.suit ===
              suit
          ) {
            button.style.boxShadow =
              "0 0 0 3px #f2b84b";
          } else {
            button.style.boxShadow =
              "";
          }
        }
      );

      tableau.forEach(
        function (pile, pileIndex) {
          var column =
            document.createElement(
              "div"
            );

          column.className =
            "solitaire-column";

          if (!pile.length) {
            column.innerHTML =
              '<div style="text-align:center;padding-top:35px;font-size:22px;opacity:.35;">K</div>';
          }

          pile.forEach(
            function (
              card,
              cardIndex
            ) {
              var button =
                document.createElement(
                  "button"
                );

              button.type =
                "button";

              button.className =
                "solitaire-card";

              if (
                !card.faceUp
              ) {
                button.classList.add(
                  "face-down"
                );

                button.textContent =
                  "🂠";
              } else {
                button.textContent =
                  cardLabel(card);

                button.classList.add(
                  card.color ===
                    "red"
                    ? "red-card"
                    : "black-card"
                );

                if (
                  selected &&
                  selected.type ===
                    "tableau" &&
                  selected.pileIndex ===
                    pileIndex &&
                  cardIndex >=
                    selected.cardIndex
                ) {
                  button.classList.add(
                    "selected-card"
                  );
                }
              }

              button.addEventListener(
                "click",
                function () {
                  handleTableauTap(
                    pileIndex,
                    cardIndex
                  );
                }
              );

              column.appendChild(
                button
              );
            }
          );

          tableauElement.appendChild(
            column
          );
        }
      );
    }

    stockButton.addEventListener(
      "click",
      drawStock
    );

    wasteButton.addEventListener(
      "click",
      function () {
        if (!waste.length) {
          return;
        }

        if (
          selected &&
          selected.type ===
            "waste"
        ) {
          clearSelection();
          render();
        } else if (
          selected
        ) {
          moveSelectedToTableau(
            0
          );
        } else {
          selectWaste();
        }
      }
    );

    Array.prototype.forEach.call(
      document.querySelectorAll(
        ".solitaire-foundation"
      ),
      function (button) {
        button.addEventListener(
          "click",
          function () {
            moveSelectedToFoundation(
              button.dataset
                .foundation
            );
          }
        );
      }
    );

    render();

    speak(
      "Classic Solitaire. Tap a card, then tap where you want to move it."
    );
  }

  /* =========================================================
     GAME LAUNCHER
     ========================================================= */

  function launchGame(key) {
    gameScreenOpen = true;

    if (key === "word") {
      startWordGarden();

    } else if (key === "memory") {
      startMemoryMatch();

    } else if (key === "picture") {
      startPicturePath();

    } else if (key === "color") {
      startColorClash();

    } else if (key === "category") {
      startCategorySort();

    } else if (key === "odd") {
      startOddOneOut();

    } else if (key === "sequence") {
      startSequenceRecall();

    } else if (key === "candy") {
      startCandyMatch();

    } else if (key === "scramble") {
      startLetterScramble();

    } else if (key === "chess") {
      startChess();

    } else {
      startPicturePath();
    }
  }

  window.launchGame =
    launchGame;

  /* =========================================================
     FAMILY MEMORY UNLOCK
     ========================================================= */

  function unlockFamilyMemory(score) {
    /*
      This remains separate from the game completion threshold.
      Family memory unlocks at 70%, as in your existing feature.
    */

    if (Number(score) < 70) {
      return;
    }

    var memoryBox =
      document.getElementById(
        "familyMemoryUnlocked"
      );

    var memoryAction =
      document.getElementById(
        "happyMemoryAction"
      );

    if (
      !memoryBox ||
      !memoryAction
    ) {
      return;
    }

    memoryBox.style.display =
      "block";

    memoryAction.textContent =
      "🎁 Memory unlocked!";

    localStorage.setItem(
      "mindbridgeFamilyMemoryUnlocked",
      "true"
    );

    var happyCard =
      document.getElementById(
        "happyMemoryBtn"
      );

    if (happyCard) {
      happyCard.classList.remove(
        "locked"
      );

      happyCard.classList.add(
        "unlocked"
      );
    }
  }

  function restoreFamilyMemory() {
    var unlocked =
      localStorage.getItem(
        "mindbridgeFamilyMemoryUnlocked"
      ) === "true";

    if (!unlocked) {
      return;
    }

    var memoryBox =
      document.getElementById(
        "familyMemoryUnlocked"
      );

    var memoryAction =
      document.getElementById(
        "happyMemoryAction"
      );

    var happyCard =
      document.getElementById(
        "happyMemoryBtn"
      );

    if (memoryBox) {
      memoryBox.style.display =
        "block";
    }

    if (memoryAction) {
      memoryAction.textContent =
        "🎁 Memory unlocked!";
    }

    if (happyCard) {
      happyCard.classList.remove(
        "locked"
      );

      happyCard.classList.add(
        "unlocked"
      );
    }
  }

  /* =========================================================
     FINISH GAME
     ========================================================= */

  function finishGame(
    name,
    score
  ) {
    /*
      80% IS THE PASSING THRESHOLD.
    */

    var durationSeconds = Math.max(
      1,
      Math.round(
        (Date.now() - sessionStartedAt) / 1000
      )
    );

    var savePromise = window.offlineManager
      ? window.offlineManager.saveGameScore(
          name,
          score,
          selectedDifficulty,
          durationSeconds
        )
      : MB.api("/api/scores", {
          method: "POST",
          body: JSON.stringify({
            name: name,
            score: score,
            difficulty: selectedDifficulty,
            durationSeconds: durationSeconds
          })
        });

    if (score < 80) {
      savePromise
        .then(function () {
          return loadSummary(true);
        })
        .catch(handleError);
      showRetry(
        name,
        score
      );

      return;
    }

    var message =
      score >= 80
        ? t("excellent")
        : t("keepGoing");

    openModal(
      "<h3>" +
      t("sessionComplete") +
      "</h3>" +

      '<p class="game-instructions">' +
      localisedGameName(name) +
      "</p>" +

      '<div class="result-score">' +
      score +
      "%" +
      "</div>" +

      '<p class="game-instructions">' +
      message +
      "</p>" +

      '<button class="btn full" id="doneBtn" type="button">' +
      t("done") +
      "</button>"
    );

    speak(
      t("sessionComplete") +
      " " +
      score +
      ". " +
      message
    );

    document
      .getElementById("doneBtn")
      .addEventListener(
        "click",
        async function () {
          this.disabled = true;

          closeModal();

          bump("avgCard");
          bump("minsCard");
          bump("bestCard");

          var completed =
            GAME_CATALOG[
              selectedDifficulty
            ].filter(
              function (game) {
                return (
                  game.name ===
                  name ||
                  (
                    name ===
                      "Word Garden" &&
                    game.key ===
                      "word"
                  ) ||
                  (
                    name ===
                      "Memory Match" &&
                    game.key ===
                      "memory"
                  ) ||
                  (
                    name ===
                      "Picture Path" &&
                    game.key ===
                      "picture"
                  ) ||
                  (
                    name ===
                      "Color Clash" &&
                    game.key ===
                      "color"
                  )
                );
              }
            )[0];

          if (completed) {
            markGameComplete(
              completed.key
            );
          }

          try {
            await savePromise;

            await loadSummary(
              true
            );

            await loadGifts();

          } catch (error) {
            handleError(error);
          }
        }
      );

    /*
      Keep the family-memory unlock functionality.
    */

    unlockFamilyMemory(
      score
    );
  }

  /* =========================================================
     GAME CHOOSER
     ========================================================= */

  function showGameChooser() {
    refreshDailyCycle();

    var name =
      state.profile
        ? state.profile.patientName
        : "";

    var games =
      GAME_CATALOG[
        selectedDifficulty
      ];

    var completed =
      games.filter(
        function (game) {
          return completedGames[
            selectedDifficulty
          ][game.key];
        }
      ).length;

    openModal(
      "<h3>" +
      t("chooseSession") +
      "</h3>" +

      '<p class="game-instructions" style="text-align:center;">' +
      t(
        "chooseSessionSub",
        {
          name:
            MB.escapeHtml(
              name
            )
        }
      ) +
      "</p>" +

      '<div style="display:flex;justify-content:center;margin:14px 0;">' +

      '<span style="background:#155249;color:#fff;border-radius:999px;padding:9px 15px;font-weight:900;font-size:16px;">' +

      difficultyIcons[
        selectedDifficulty
      ] +

      " " +

      difficultyLabels[
        selectedDifficulty
      ] +

      " stage</span>" +

      "</div>" +

      '<p style="text-align:center;margin:0 0 14px;font-size:16px;line-height:1.4;font-weight:900;color:#1d2521;">' +

      completed +
      " of " +
      games.length +
      " completed · Each game needs 80% or higher" +

      "</p>" +

      '<div class="mobile-game-grid">' +

      games
        .map(function (game) {
          var isComplete =
            completedGames[
              selectedDifficulty
            ][game.key];

          return (
            '<button class="word-card mb-game-choice" ' +

            'type="button" ' +

            'data-game-key="' +
            game.key +
            '" ' +

            'title="' +
            MB.escapeHtml(
              game.name
            ) +
            '" ' +

            'aria-label="' +
            MB.escapeHtml(
              game.name
            ) +
            '" ' +

            (
              isComplete
                ? 'style="opacity:.55;"'
                : ""
            ) +

            ">" +

            '<span class="mb-game-icon">' +
            game.icon +
            "</span>" +

            '<span class="mb-game-name">' +
            MB.escapeHtml(
              game.name
            ) +
            "</span>" +

            (
              isComplete
                ? '<span class="mb-game-completed">✓</span>'
                : ""
            ) +

            "</button>"
          );
        })
        .join("") +

      "</div>"
    );

    Array.prototype.forEach.call(
      modalContent.querySelectorAll(
        "[data-game-key]"
      ),
      function (button) {
        button.addEventListener(
          "click",
          function () {
            launchGame(
              button.dataset
                .gameKey
            );
          }
        );
      }
    );

    speak(
      t("chooseSession")
    );
  }

  var startButton =
    document.getElementById(
      "startBtn"
    );

  if (startButton) {
    startButton.addEventListener(
      "click",
      showGameChooser
    );
  }

  /* =========================================================
     LOADING
     ========================================================= */

  function handleError(error) {
    if (
      error &&
      error.expired
    ) {
      MB.session.clear();
      window.location.replace(
        "index.html"
      );

      return;
    }

    var pill =
      document.getElementById(
        "syncPill"
      );

    if (pill) {
      pill.classList.add(
        "offline"
      );
    }

    MB.setText(
      "syncLabel",
      t("offline")
    );

    console.error(error);
  }

  function markSynced() {
    var pill =
      document.getElementById(
        "syncPill"
      );

    if (pill) {
      pill.classList.remove(
        "offline"
      );
    }

    MB.setText(
      "syncLabel",
      t("synced")
    );
  }

  async function loadSummary(
    animate
  ) {
    var summary =
      await MB.api(
        "/api/summary?days=7"
      );

    state.summary =
      summary;

    state.profile =
      summary.profile;

    if (
      !difficultyInitialised
    ) {
      selectedDifficulty =
        configuredDifficulty(
          state.profile
        );

      difficultyInitialised =
        true;
    }

    loadGameProgress();

    applyLanguage(
      summary.profile.language
    );

    renderProfile(
      summary.profile
    );

    renderStats(
      summary.totals
    );

    /*
      Safe if Wellbeing section is no longer in patient.html.
    */

    renderWellbeing(
      summary.wellbeing,
      summary.series
    );

    renderActivity(
      summary.recent
    );

    markSynced();
  }

  async function loadAlerts() {
    state.alerts =
      await MB.api(
        "/api/alerts"
      );

    renderAlerts(
      state.alerts
    );
  }

  async function loadGifts() {
    /*
      Keep the backend connection.
      renderGifts safely ignores the response if the old
      Gifts section has been removed from the HTML.
    */

    var gifts =
      await MB.api(
        "/api/gifts"
      );

    renderGifts(
      gifts
    );
  }

  window.setInterval(
    function () {
      loadAlerts().catch(
        handleError
      );
    },
    60000
  );

  var logoutButton =
    document.getElementById(
      "logoutBtn"
    );

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      MB.signOut
    );
  }

  /* =========================================================
     BOOT
     ========================================================= */

  (async function boot() {
    try {
      await loadSummary(
        false
      );

      await loadAlerts();

      await loadGifts();

      restoreFamilyMemory();

    } catch (error) {
      handleError(error);
    }
  })();

})();


/* ============================================================
   MINDBUDDY / AI CHAT
   KEEPING THIS EXACT FUNCTIONALITY
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  function () {
    const helperButton =
      document.getElementById(
        "aiHelperButton"
      );

    const chatBox =
      document.getElementById(
        "aiChatBox"
      );

    const closeButton =
      document.getElementById(
        "closeAiChat"
      );

    const input =
      document.getElementById(
        "aiChatInput"
      );

    const sendButton =
      document.getElementById(
        "aiSendBtn"
      );

    const messages =
      document.getElementById(
        "aiChatMessages"
      );

    if (
      !helperButton ||
      !chatBox ||
      !closeButton ||
      !input ||
      !sendButton ||
      !messages
    ) {
      return;
    }

    helperButton.addEventListener(
      "click",
      function () {
        chatBox.classList.add(
          "active"
        );

        setTimeout(
          function () {
            input.focus();
          },
          100
        );
      }
    );

    closeButton.addEventListener(
      "click",
      function () {
        chatBox.classList.remove(
          "active"
        );
      }
    );

    function addMessage(
      text,
      type
    ) {
      const message =
        document.createElement(
          "div"
        );

      message.className =
        "ai-message " +
        (
          type === "user"
            ? "ai-user-message"
            : "ai-bot-message"
        );

      message.innerHTML =
        '<div class="ai-message-icon">🧠</div>' +
        '<div class="ai-message-text"></div>';

      message.querySelector(
        ".ai-message-text"
      ).textContent =
        text;

      messages.appendChild(
        message
      );

      messages.scrollTop =
        messages.scrollHeight;
    }

    async function sendMessage() {
      const text =
        input.value.trim();

      if (
        !text ||
        sendButton.disabled
      ) {
        return;
      }

      addMessage(
        text,
        "user"
      );

      input.value = "";

      input.disabled = true;
      sendButton.disabled =
        true;

      const typing =
        document.createElement(
          "div"
        );

      typing.className =
        "ai-message ai-bot-message";

      typing.innerHTML =
        '<div class="ai-message-icon">🧠</div>' +
        '<div class="ai-message-text ai-typing">' +
        "<span></span>" +
        "<span></span>" +
        "<span></span>" +
        "</div>";

      messages.appendChild(
        typing
      );

      messages.scrollTop =
        messages.scrollHeight;

      try {
        const result =
          await MB.api(
            "/api/ai/chat",
            {
              method: "POST",

              body: JSON.stringify({
                message: text
              })
            }
          );

        typing.remove();

        addMessage(
          result.reply ||
            "I'm here with you. Tell me more.",
          "bot"
        );

      } catch (error) {
        typing.remove();

        addMessage(
          error.message ||
            "I'm having trouble connecting. Please try again.",
          "bot"
        );

      } finally {
        input.disabled =
          false;

        sendButton.disabled =
          false;

        input.focus();
      }
    }

    sendButton.addEventListener(
      "click",
      sendMessage
    );

    input.addEventListener(
      "keydown",
      function (event) {
        if (
          event.key ===
          "Enter"
        ) {
          sendMessage();
        }
      }
    );
  }
);
