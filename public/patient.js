/* ============================================================================
   MindBridge — Patient Dashboard
   ============================================================================ */

(function () {
  "use strict";

  // if (!MB.requireSession()) return;

  var t = I18N.t;

  var state = {
    profile: null,
    summary: null,
    alerts: {
      pending: [],
      logged: []
    }
  };

  /* =========================================================
     VOICE
     ========================================================= */

  var soundOn = true;
  var canSpeak = "speechSynthesis" in window;

  var soundBtn = document.getElementById("soundBtn");
  var voiceIndicator = document.getElementById("voiceIndicator");

  var SPEAKER_ON =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D2521" stroke-width="2">' +
    '<path d="M11 5 6 9H2v6h4l5 4V5Z"/>' +
    '<path d="M15.5 8.5a5 5 0 0 1 0 7"/>' +
    "</svg>";

  var SPEAKER_OFF =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D2521" stroke-width="2">' +
    '<path d="M11 5 6 9H2v6h4l5 4V5Z"/>' +
    '<line x1="16" y1="9" x2="21" y2="14"/>' +
    '<line x1="21" y1="9" x2="16" y2="14"/>' +
    "</svg>";

  if (soundBtn) {
    soundBtn.innerHTML = SPEAKER_ON;

    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;

      this.innerHTML = soundOn
        ? SPEAKER_ON
        : SPEAKER_OFF;

      if (!soundOn && canSpeak) {
        window.speechSynthesis.cancel();
      }
    });
  }

  function speak(text) {
    if (!soundOn || !canSpeak || !text) return;

    window.speechSynthesis.cancel();

    var utterance =
      new SpeechSynthesisUtterance(text);

    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.lang = I18N.speech;

    utterance.onstart = function () {
      if (voiceIndicator) {
        voiceIndicator.classList.add("active");
      }

      if (soundBtn) {
        soundBtn.classList.add("speaking");
      }
    };

    function done() {
      if (voiceIndicator) {
        voiceIndicator.classList.remove("active");
      }

      if (soundBtn) {
        soundBtn.classList.remove("speaking");
      }
    }

    utterance.onend = done;
    utterance.onerror = done;

    window.speechSynthesis.speak(utterance);
  }

  /* =========================================================
     MODAL
     ========================================================= */

  var modalBg =
    document.getElementById("modalBg");

  var modalContent =
    document.getElementById("modalContent");

  var modal =
    modalBg
      ? modalBg.querySelector(".modal")
      : null;

  var gameScreenOpen = false;

  function openModal(html) {
    if (!modalBg || !modalContent) return;

    if (gameScreenOpen && modal) {
      modal.style.maxWidth = "1100px";
      modal.style.width = "100%";
      modal.style.height = "100%";
      modal.style.maxHeight = "100vh";
      modal.style.borderRadius = "0";
      modal.style.padding =
        "32px clamp(16px, 5vw, 56px)";
      modal.style.overflowY = "auto";

      modalBg.style.padding = "0";
    }

    modalContent.innerHTML = html;
    modalBg.classList.add("show");
  }

  function closeModal() {
    if (!modalBg) return;

    modalBg.classList.remove("show");

    gameScreenOpen = false;

    if (modal) {
      modal.style.maxWidth = "";
      modal.style.width = "";
      modal.style.height = "";
      modal.style.maxHeight = "";
      modal.style.borderRadius = "";
      modal.style.padding = "";
      modal.style.overflowY = "";
    }

    modalBg.style.padding = "";

    if (canSpeak) {
      window.speechSynthesis.cancel();
    }
  }

  var closeModalBtn =
    document.getElementById("closeModal");

  if (closeModalBtn) {
    closeModalBtn.addEventListener(
      "click",
      closeModal
    );
  }

  if (modalBg) {
    modalBg.addEventListener(
      "click",
      function (event) {
        if (event.target === modalBg) {
          closeModal();
        }
      }
    );
  }

  document.addEventListener(
    "keydown",
    function (event) {
      if (
        event.key === "Escape" &&
        modalBg &&
        modalBg.classList.contains("show")
      ) {
        closeModal();
      }
    }
  );

  /* =========================================================
     LANGUAGE
     ========================================================= */

  function applyLanguage(language) {
    if (!language) return;

    I18N.setLanguage(
      language.code,
      language.speech
    );

    MB.setText("tagline", t("tagline"));
    MB.setText("navPatient", t("patientView"));
    MB.setText("navCaretaker", t("caretakerView"));
    MB.setText("syncLabel", t("synced"));
    MB.setText("logoutBtn", t("signOut"));
    MB.setText("streakLabel", t("dayStreak"));
    MB.setText("wellbeingTitle", t("wellbeing"));
    MB.setText("wellbeingSub", t("wellbeingSub"));
    MB.setText("wellbeingOutOf", t("outOf"));
    MB.setText("activityTitle", t("recentActivity"));
    MB.setText("activitySub", t("recentActivitySub"));
    MB.setText("startLabel", t("start"));
    MB.setText("alertsTitle", t("caregiverAlerts"));
    MB.setText("alertsSub", t("alertsSub"));

    MB.setText(
      "minsLabel",
      t("minutesActive") +
      " · " +
      t("thisWeek")
    );

    MB.setText(
      "bestLabel",
      t("bestScore") +
      " · " +
      t("personalBest")
    );

    var hour =
      new Date().getHours();

    var greetKey =
      hour < 12
        ? "morning"
        : hour < 18
          ? "afternoon"
          : "evening";

    MB.setText(
      "greetTime",
      t(greetKey)
    );
  }

  /* =========================================================
     PROFILE
     ========================================================= */

  function renderProfile(profile) {
    if (!profile) return;

    MB.setText(
      "patientName",
      profile.patientName
    );

    MB.setText(
      "patientAge",
      "♡ " +
      profile.age +
      " " +
      t("years")
    );

    MB.setText(
      "patientRegion",
      "📍 " +
      profile.region
    );

    MB.setText(
      "patientLanguage",
      "🌐 " +
      profile.language.native
    );

    MB.setText(
      "streakNum",
      profile.streak
    );
  }

  function renderStats(totals) {
    if (!totals) return;

    MB.setText(
      "avgScore",
      totals.avgScore + "%"
    );

    MB.setText(
      "avgLabel",
      t("avgScore") +
      " · " +
      t("acrossSessions", {
        n: totals.sessions
      })
    );

    MB.setText(
      "minsActive",
      totals.minutesInWindow
    );

    MB.setText(
      "bestScore",
      totals.bestScore + "%"
    );

    MB.setText(
      "streakNum",
      totals.streak
    );
  }

  /* =========================================================
     WELLBEING
     ========================================================= */

  var CIRCUMFERENCE =
    2 * Math.PI * 72;

  function renderWellbeing(wellbeing) {
    if (!wellbeing) return;

    var score =
      wellbeing.score;

    var ring =
      document.getElementById(
        "donutRing"
      );

    if (ring) {
      ring.style.strokeDashoffset =
        CIRCUMFERENCE *
        (1 - score / 100);
    }

    MB.setText(
      "wellbeingNum",
      score
    );

    var tags = [];

    tags.push(
      score >= 75
        ? '<span class="tag alt">' +
          t("stable") +
          "</span>"
        : '<span class="tag warn">' +
          t("needsSupport") +
          "</span>"
    );

    tags.push(
      wellbeing.trend > 0
        ? '<span class="tag">' +
          t("memoryImproving") +
          "</span>"
        : '<span class="tag">' +
          t("memorySteady") +
          "</span>"
    );

    tags.push(
      score >= 70
        ? '<span class="tag alt">' +
          t("moodPositive") +
          "</span>"
        : '<span class="tag warn">' +
          t("moodWatchful") +
          "</span>"
    );

    var tagsWrap =
      document.getElementById(
        "tagsWrap"
      );

    if (tagsWrap) {
      tagsWrap.innerHTML =
        tags.join("");
    }
  }

  /* =========================================================
     GAME NAMES
     ========================================================= */

  function localisedGameName(name) {
    if (name === "Word Garden") {
      return t("wordGarden");
    }

    if (name === "Memory Match") {
      return t("memoryMatch");
    }

    if (name === "Picture Path") {
      return t("picturePath");
    }

    if (name === "Color Clash") {
      return t("colorClash");
    }

    return name;
  }

  function localisedCategory(category) {
    if (category === "Language") {
      return t("language");
    }

    if (category === "Memory") {
      return t("memory");
    }

    if (category === "Focus") {
      return t("focus");
    }

    if (category === "Executive Function") {
      return t("executiveFunction");
    }

    return category;
  }

  /* =========================================================
     ACTIVITY
     ========================================================= */

  function renderActivity(recent) {
    var list =
      document.getElementById(
        "activityList"
      );

    if (!list) return;

    if (!recent || !recent.length) {
      list.innerHTML =
        '<p class="empty-state">' +
        t("noSessions") +
        "</p>";

      return;
    }

    list.innerHTML =
      recent
        .slice(0, 4)
        .map(function (row, index) {
          var meta =
            MB.gameMeta(
              row.game_type
            );

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
            MB.escapeHtml(
              localisedGameName(
                row.game_type
              )
            ) +
            "</p>" +

            '<p class="activity-sub">' +
            MB.escapeHtml(
              localisedCategory(
                row.category
              )
            ) +
            " · " +
            MB.relativeTime(
              row.created_at
            ) +
            "</p>" +

            "</div>" +

            "</div>" +

            '<span class="activity-score">' +
            row.score +
            "%</span>" +

            "</div>"
          );
        })
        .join("");

    Array.prototype.forEach.call(
      list.querySelectorAll(
        ".activity-row"
      ),
      function (row) {
        row.addEventListener(
          "click",
          function () {
            launchGame(
              row.dataset.game
            );
          }
        );
      }
    );
  }

  /* =========================================================
     ALERTS
     ========================================================= */

  var ALERT_ICONS = {
    medicine: "💊",
    hydration: "💧",
    appointment: "🗓️",
    activity: "✓"
  };

  function alertIcon(alert) {
    var title =
      String(
        alert.title || ""
      ).toLowerCase();

    if (
      title.indexOf("medicine") > -1
    ) {
      return ALERT_ICONS.medicine;
    }

    if (
      title.indexOf("hydration") > -1 ||
      title.indexOf("water") > -1
    ) {
      return ALERT_ICONS.hydration;
    }

    if (
      title.indexOf("appointment") > -1
    ) {
      return ALERT_ICONS.appointment;
    }

    return ALERT_ICONS.activity;
  }

  function renderAlerts(alerts) {
    var list =
      document.getElementById(
        "alertsList"
      );

    if (!list) return;

    var rows = [];

    (alerts.pending || []).forEach(
      function (alert) {
        rows.push(
          '<div class="alert-row" ' +
          'data-pending="1" ' +
          'data-title="' +
          MB.escapeHtml(
            alert.title
          ) +
          '" ' +
          'data-body="' +
          MB.escapeHtml(
            alert.body
          ) +
          '">' +

          '<div class="alert-ic bell">' +
          alertIcon(alert) +
          "</div>" +

          "<div>" +

          '<p class="alert-title">' +
          MB.escapeHtml(
            alert.title
          ) +
          "</p>" +

          '<p class="alert-body">' +
          MB.escapeHtml(
            alert.body
          ) +
          "</p>" +

          '<p class="alert-time">' +
          "Tap to acknowledge" +
          "</p>" +

          "</div>" +

          "</div>"
        );
      }
    );

    (alerts.logged || [])
      .slice(0, 4)
      .forEach(
        function (alert) {
          rows.push(
            '<div class="alert-row">' +

            '<div class="alert-ic ok">✓</div>' +

            "<div>" +

            '<p class="alert-title">' +
            MB.escapeHtml(
              alert.title
            ) +
            "</p>" +

            '<p class="alert-body">' +
            MB.escapeHtml(
              alert.body
            ) +
            "</p>" +

            '<p class="alert-time">' +
            MB.relativeTime(
              alert.createdAt
            ) +
            "</p>" +

            "</div>" +

            "</div>"
          );
        }
      );

    list.innerHTML =
      rows.length
        ? rows.join("")
        : '<p class="empty-state">' +
          t("noAlerts") +
          "</p>";

    Array.prototype.forEach.call(
      list.querySelectorAll(
        '[data-pending="1"]'
      ),
      function (row) {
        row.addEventListener(
          "click",
          function () {
            acknowledgeAlert(
              row
            );
          }
        );
      }
    );
  }

  async function acknowledgeAlert(row) {
    var title =
      row.dataset.title;

    var body =
      row.dataset.body;

    row.style.pointerEvents =
      "none";

    speak(
      title +
      " " +
      t("acknowledged")
    );

    try {
      await MB.api(
        "/api/alerts",
        {
          method: "POST",
          body: JSON.stringify({
            alertTitle: title,
            alertBody: body,
            status: "Acknowledged"
          })
        }
      );

      row.style.transition =
        "opacity .35s ease, transform .35s ease";

      row.style.opacity = "0";

      row.style.transform =
        "translateX(18px)";

      setTimeout(
        loadAlerts,
        350
      );

    } catch (error) {
      row.style.pointerEvents =
        "";

      handleError(error);
    }
  }
  /* =========================================================
     GAME SETS
     ========================================================= */

  var GAME_SETS = {

    set1: {
      title: "Gentle Start",
      icon: "🌱",
      difficulty: "easy",

      games: [
        {
          key: "memory",
          icon: "🧠",
          name: "Memory Match",
          category: "Memory"
        },

        {
          key: "word",
          icon: "🌱",
          name: "Word Garden",
          category: "Language"
        },

        {
          key: "picture",
          icon: "🔍",
          name: "Picture Path",
          category: "Focus"
        },

        {
          key: "color",
          icon: "🎨",
          name: "Color Clash",
          category: "Executive Function"
        },

        {
          key: "category",
          icon: "🧺",
          name: "Sort & Match",
          category: "Reasoning"
        }
      ]
    },

    set2: {
      title: "Keep Going",
      icon: "🌿",
      difficulty: "medium",

      games: [
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
          key: "candy",
          icon: "🍬",
          name: "Candy Match",
          category: "Spatial Recognition"
        },

        {
          key: "scramble",
          icon: "🔤",
          name: "Letter Scramble",
          category: "Language"
        },

        {
          key: "memory2",
          icon: "🧩",
          name: "Memory Match Plus",
          category: "Memory"
        }
      ]
    },

    set3: {
      title: "Brain Challenge",
      icon: "🌳",
      difficulty: "hard",

      games: [
        {
          key: "chess",
          icon: "♟️",
          name: "Chess",
          category: "Planning"
        },

        {
          key: "sequence2",
          icon: "🧠",
          name: "Pattern Challenge",
          category: "Working Memory"
        },

        {
          key: "picture2",
          icon: "🗺️",
          name: "Picture Path Plus",
          category: "Focus"
        },

        {
          key: "color2",
          icon: "🌈",
          name: "Color Challenge",
          category: "Executive Function"
        },

        {
          key: "odd2",
          icon: "🔎",
          name: "Find the Difference",
          category: "Reasoning"
        }
      ]
    }
  };

  var SET_ORDER = [
    "set1",
    "set2",
    "set3"
  ];

  var selectedSet = "set1";
  var unlockedSet = "set1";

  var completedGames = {
    set1: {},
    set2: {},
    set3: {}
  };

  var cycleStartedAt = 0;
  var sessionStartedAt = 0;

  /* =========================================================
     GAME PROGRESS
     ========================================================= */

  function progressStorageKey() {
    return (
      "mindbridgeGameProgress:" +
      (
        state.profile &&
        state.profile.id
          ? state.profile.id
          : "guest"
      )
    );
  }

  function resetDailyProgress() {
    completedGames = {
      set1: {},
      set2: {},
      set3: {}
    };

    unlockedSet = "set1";
    selectedSet = "set1";

    cycleStartedAt =
      Date.now();

    saveGameProgress();
  }

  function saveGameProgress() {
    try {
      localStorage.setItem(
        progressStorageKey(),
        JSON.stringify({
          completed:
            completedGames,

          unlockedSet:
            unlockedSet,

          cycleStartedAt:
            cycleStartedAt
        })
      );
    } catch (error) {
      console.warn(
        "Unable to save game progress.",
        error
      );
    }
  }

  function loadGameProgress() {
    try {
      var saved =
        JSON.parse(
          localStorage.getItem(
            progressStorageKey()
          ) || "null"
        );

      if (
        saved &&
        saved.completed &&
        saved.cycleStartedAt &&
        Date.now() -
          Number(
            saved.cycleStartedAt
          ) <
          24 * 60 * 60 * 1000
      ) {
        completedGames =
          saved.completed;

        if (
          !completedGames.set1 ||
          !completedGames.set2 ||
          !completedGames.set3
        ) {
          completedGames = {
            set1: {},
            set2: {},
            set3: {}
          };
        }

        unlockedSet =
          SET_ORDER.indexOf(
            saved.unlockedSet
          ) >= 0
            ? saved.unlockedSet
            : "set1";

        selectedSet =
          unlockedSet;

        cycleStartedAt =
          Number(
            saved.cycleStartedAt
          );

        return;
      }

    } catch (error) {
      console.warn(
        "Unable to restore game progress.",
        error
      );
    }

    resetDailyProgress();
  }

  function refreshDailyCycle() {
    if (
      cycleStartedAt &&
      Date.now() -
        cycleStartedAt >=
        24 * 60 * 60 * 1000
    ) {
      resetDailyProgress();
    }
  }

  function getGames(setId) {
    return GAME_SETS[
      setId
    ].games;
  }

  function completedCount(setId) {
    return getGames(
      setId
    ).filter(
      function (game) {
        return (
          completedGames[
            setId
          ][game.key]
        );
      }
    ).length;
  }

  function isSetUnlocked(setId) {
    return (
      SET_ORDER.indexOf(
        setId
      ) <=
      SET_ORDER.indexOf(
        unlockedSet
      )
    );
  }

  function setComplete(setId) {
    return (
      completedCount(
        setId
      ) === 5
    );
  }

  /* =========================================================
     GAME CHOOSER
     ========================================================= */

  function showGameChooser() {
    refreshDailyCycle();

    if (
      !isSetUnlocked(
        selectedSet
      )
    ) {
      selectedSet =
        unlockedSet;
    }

    var patientName =
      state.profile
        ? state.profile.patientName
        : "";

    var currentSet =
      GAME_SETS[
        selectedSet
      ];

    var games =
      currentSet.games;

    var completed =
      completedCount(
        selectedSet
      );

    var html =
      '<div class="game-chooser">' +

      '<div class="game-chooser-header">' +

      '<div class="game-chooser-icon">🎮</div>' +

      "<div>" +

      "<h3>Choose a game</h3>" +

      '<p class="sub sans">' +
      (
        patientName
          ? "Hi " +
            MB.escapeHtml(
              patientName
            ) +
            "! Pick one activity."
          : "Pick one activity."
      ) +
      "</p>" +

      "</div>" +

      "</div>" +

      '<div class="game-set-tabs">' +

      SET_ORDER.map(
        function (setId) {
          var unlocked =
            isSetUnlocked(
              setId
            );

          var active =
            selectedSet ===
            setId;

          var count =
            completedCount(
              setId
            );

          return (
            '<button type="button" ' +
            'class="game-set-tab ' +
            (
              active
                ? "active"
                : ""
            ) +
            '" ' +
            'data-set="' +
            setId +
            '" ' +
            (
              unlocked
                ? ""
                : "disabled"
            ) +
            ">" +

            (
              unlocked
                ? GAME_SETS[
                    setId
                  ].icon
                : "🔒"
            ) +

            "<span>" +
            GAME_SETS[
              setId
            ].title +
            "</span>" +

            '<small>' +
            count +
            "/5" +
            "</small>" +

            "</button>"
          );
        }
      ).join("") +

      "</div>" +

      '<div class="current-game-set">' +

      "<span>" +
      currentSet.icon +
      "</span>" +

      "<div>" +

      "<strong>" +
      currentSet.title +
      "</strong>" +

      "<small>" +
      completed +
      " of 5 games completed" +
      "</small>" +

      "</div>" +

      "</div>" +

      '<div class="game-chooser-grid">' +

      games.map(
        function (game) {
          var done =
            completedGames[
              selectedSet
            ][game.key];

          return (
            '<button type="button" ' +
            'class="game-choice ' +
            (
              done
                ? "completed"
                : ""
            ) +
            '" ' +
            'data-game="' +
            game.key +
            '">' +

            '<span class="game-choice-icon">' +
            game.icon +
            "</span>" +

            '<span class="game-choice-name">' +
            MB.escapeHtml(
              game.name
            ) +
            "</span>" +

            '<span class="game-choice-category">' +
            MB.escapeHtml(
              game.category
            ) +
            "</span>" +

            (
              done
                ? '<span class="game-choice-check">✓</span>'
                : ""
            ) +

            "</button>"
          );
        }
      ).join("") +

      "</div>" +

      '<p class="game-rule">' +
      "✨ Complete a game with 90% or higher to mark it complete." +
      "</p>" +

      "</div>";

    openModal(html);

    Array.prototype.forEach.call(
      modalContent.querySelectorAll(
        "[data-set]"
      ),
      function (button) {
        button.addEventListener(
          "click",
          function () {
            if (
              button.disabled
            ) {
              return;
            }

            selectedSet =
              button.dataset.set;

            showGameChooser();
          }
        );
      }
    );

    Array.prototype.forEach.call(
      modalContent.querySelectorAll(
        "[data-game]"
      ),
      function (button) {
        button.addEventListener(
          "click",
          function () {
            launchGame(
              button.dataset.game
            );
          }
        );
      }
    );

    speak(
      currentSet.title +
      ". " +
      completed +
      " of 5 games completed."
    );
  }

  /* =========================================================
     DIRECT GAMES BUTTON CONNECTION
     ========================================================= */

  function connectGamesButton() {

    var gamesButton =
      document.getElementById(
        "gamesViewAll"
      );

    if (gamesButton) {
      gamesButton.addEventListener(
        "click",
        function (event) {
          event.preventDefault();
          event.stopPropagation();

          showGameChooser();
        }
      );
    }

    var startBtn =
      document.getElementById(
        "startBtn"
      );

    if (startBtn) {
      startBtn.addEventListener(
        "click",
        function (event) {
          event.preventDefault();

          showGameChooser();
        }
      );
    }
  }
  /* =========================================================
     MEMORY MATCH
     ========================================================= */

  function startMemoryMatch() {
    var pairCount =
      selectedSet === "set1"
        ? 4
        : selectedSet === "set2"
          ? 6
          : 8;

    var icons = [
      "🌸",
      "🍎",
      "⭐",
      "🐦",
      "🍀",
      "🌈",
      "🎈",
      "🍋"
    ];

    var cards =
      icons
        .slice(0, pairCount)
        .concat(
          icons.slice(0, pairCount)
        )
        .sort(
          function () {
            return Math.random() - 0.5;
          }
        );

    var flipped = [];
    var matched = 0;
    var moves = 0;

    sessionStartedAt =
      Date.now();

    openModal(
      "<h3>🧠 Memory Match</h3>" +

      '<p class="sub sans">' +
      "Find all the matching pairs." +
      "</p>" +

      '<div class="word-grid" id="memGrid" ' +
      'style="grid-template-columns:repeat(4,1fr);"></div>'
    );

    var grid =
      document.getElementById(
        "memGrid"
      );

    cards.forEach(
      function (icon) {
        var card =
          document.createElement(
            "button"
          );

        card.type = "button";
        card.className =
          "word-card";

        card.textContent =
          icon;

        card.dataset.icon =
          icon;

        card.dataset.state =
          "preview";

        card.style.fontSize =
          "30px";

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

            moves++;

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

              matched++;

              flipped = [];

              if (
                matched ===
                pairCount
              ) {
                var score =
                  Math.max(
                    40,
                    100 -
                    (
                      moves -
                      pairCount
                    ) *
                    (
                      selectedSet ===
                      "set3"
                        ? 6
                        : 8
                    )
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

        grid.appendChild(
          card
        );
      }
    );

    speak(
      "Memorize the cards."
    );

    setTimeout(
      function () {
        Array.prototype.forEach.call(
          grid.querySelectorAll(
            ".word-card"
          ),
          function (card) {
            card.textContent =
              "❔";

            card.dataset.state =
              "hidden";
          }
        );

        speak(
          "Find the matching pairs."
        );
      },
      selectedSet === "set3"
        ? 4000
        : 3000
    );
  }

  /* =========================================================
     WORD GARDEN
     ========================================================= */

  async function startWordGarden() {
    var questions =
      I18N.wordSets();

    try {
      var generated =
        await MB.api(
          "/api/ai/word-question",
          {
            method: "POST",

            body:
              JSON.stringify({
                usedWords: [],
                difficulty:
                  GAME_SETS[
                    selectedSet
                  ].difficulty
              })
          }
        );

      if (
        generated.prompt &&
        Array.isArray(
          generated.options
        ) &&
        generated.options.length === 4
      ) {
        questions = [
          generated
        ].concat(
          questions.slice(1)
        );
      }

    } catch (error) {
      console.warn(
        "AI Word Garden question unavailable."
      );
    }

    var count =
      selectedSet === "set1"
        ? 3
        : selectedSet === "set2"
          ? 4
          : 5;

    questions =
      questions.slice(
        0,
        count
      );

    var index = 0;
    var correct = 0;

    sessionStartedAt =
      Date.now();

    function renderQuestion() {
      var question =
        questions[index];

      openModal(
        "<h3>🌱 Word Garden</h3>" +

        '<p class="sub sans">' +
        "Question " +
        (index + 1) +
        " of " +
        questions.length +
        "</p>" +

        '<p class="prompt">' +
        MB.escapeHtml(
          question.prompt
        ) +
        "</p>" +

        '<div class="word-grid">' +

        question.options
          .map(
            function (option) {
              return (
                '<button class="word-card" type="button" data-opt="' +
                MB.escapeHtml(
                  option
                ) +
                '">' +
                MB.escapeHtml(
                  option
                ) +
                "</button>"
              );
            }
          )
          .join("") +

        "</div>"
      );

      speak(
        question.prompt
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
                  }

                  if (
                    other === card &&
                    chosen !==
                    question.answer
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
                correct++;
                speak(
                  "Correct!"
                );
              } else {
                speak(
                  "Not quite."
                );
              }

              setTimeout(
                function () {
                  index++;

                  if (
                    index <
                    questions.length
                  ) {
                    renderQuestion();
                  } else {
                    finishGame(
                      "Word Garden",
                      Math.round(
                        (
                          correct /
                          questions.length
                        ) * 100
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

    var count =
      selectedSet === "set1"
        ? 6
        : selectedSet === "set2"
          ? 7
          : 8;

    var length =
      selectedSet === "set1"
        ? 3
        : selectedSet === "set2"
          ? 4
          : 5;

    var sequence =
      new Array(length)
        .fill(0)
        .map(
          function () {
            return Math.floor(
              Math.random() *
              count
            );
          }
        );

    var step = 0;
    var wrong = 0;

    sessionStartedAt =
      Date.now();

    openModal(
      "<h3>🔍 Picture Path</h3>" +

      '<p class="sub sans">' +
      "Remember the order, then tap the pictures in that order." +
      "</p>" +

      '<p class="prompt">' +
      sequence
        .map(
          function (i) {
            return symbols[i];
          }
        )
        .join(" → ") +
      "</p>" +

      '<div class="word-grid" id="pictureGrid"></div>'
    );

    var grid =
      document.getElementById(
        "pictureGrid"
      );

    Array.from(
      { length: count },
      function (_, i) {
        return i;
      }
    )
      .sort(
        function () {
          return Math.random() - 0.5;
        }
      )
      .forEach(
        function (i) {
          var card =
            document.createElement(
              "button"
            );

          card.type = "button";
          card.className =
            "word-card";

          card.style.fontSize =
            "32px";

          card.textContent =
            symbols[i];

          card.addEventListener(
            "click",
            function () {
              if (
                i ===
                sequence[step]
              ) {
                card.classList.add(
                  "correct"
                );

                step++;

                if (
                  step ===
                  sequence.length
                ) {
                  finishGame(
                    "Picture Path",
                    Math.max(
                      50,
                      100 -
                      wrong * 10
                    )
                  );
                }
              } else {
                wrong++;

                card.classList.add(
                  "wrong"
                );

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

          grid.appendChild(
            card
          );
        }
      );
  }

  /* =========================================================
     COLOR CLASH
     ========================================================= */

  function startColorClash() {
    var rounds =
      selectedSet === "set1"
        ? 3
        : selectedSet === "set2"
          ? 5
          : 7;

    var correct = 0;
    var round = 0;

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

    sessionStartedAt =
      Date.now();

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

      var options =
        colors.slice().sort(
          function () {
            return Math.random() - 0.5;
          }
        );

      openModal(
        "<h3>🎨 Color Clash</h3>" +

        '<p class="sub sans">' +
        "Tap the colour of the word." +
        "</p>" +

        '<p class="prompt" style="font-size:36px;color:' +
        colors[inkIndex].value +
        ';">' +
        colors[wordIndex].label +
        "</p>" +

        '<div class="word-grid" id="colorGrid"></div>'
      );

      var grid =
        document.getElementById(
          "colorGrid"
        );

      options.forEach(
        function (option) {
          var button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "word-card";

          button.textContent =
            option.label;

          button.style.color =
            option.value;

          button.addEventListener(
            "click",
            function () {
              if (
                option.label ===
                colors[inkIndex].label
              ) {
                correct++;
                button.classList.add(
                  "correct"
                );
              } else {
                button.classList.add(
                  "wrong"
                );
              }

              round++;

              setTimeout(
                function () {
                  if (
                    round <
                    rounds
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Color Clash",
                      Math.round(
                        (
                          correct /
                          rounds
                        ) * 100
                      )
                    );
                  }
                },
                550
              );
            }
          );

          grid.appendChild(
            button
          );
        }
      );
    }

    renderRound();
  }
  /* =========================================================
     SORT & MATCH
     ========================================================= */

  function startCategorySort() {
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

    var round = 0;
    var correct = 0;

    sessionStartedAt =
      Date.now();

    function renderRound() {
      var current =
        sets[round];

      openModal(
        "<h3>🧺 Sort & Match</h3>" +

        '<p class="sub sans">' +
        "Choose the " +
        current.category +
        "." +
        "</p>" +

        '<div class="word-grid" id="sortGrid"></div>'
      );

      var grid =
        document.getElementById(
          "sortGrid"
        );

      current.options.forEach(
        function (option) {
          var button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "word-card";

          button.textContent =
            option;

          button.style.fontSize =
            "32px";

          button.addEventListener(
            "click",
            function () {
              if (
                option ===
                current.answer
              ) {
                correct++;
                button.classList.add(
                  "correct"
                );
              } else {
                button.classList.add(
                  "wrong"
                );
              }

              setTimeout(
                function () {
                  round++;

                  if (
                    round <
                    sets.length
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Sort & Match",
                      Math.round(
                        (
                          correct /
                          sets.length
                        ) * 100
                      )
                    );
                  }
                },
                500
              );
            }
          );

          grid.appendChild(
            button
          );
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     ODD ONE OUT
     ========================================================= */

  function startOddOneOut() {
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

    var answers = [
      3,
      2,
      3,
      3
    ];

    var round = 0;
    var correct = 0;

    sessionStartedAt =
      Date.now();

    function renderRound() {
      openModal(
        "<h3>🟡 Odd One Out</h3>" +

        '<p class="sub sans">' +
        "Tap the one that is different." +
        "</p>" +

        '<div class="word-grid" id="oddGrid"></div>'
      );

      var grid =
        document.getElementById(
          "oddGrid"
        );

      sets[round].forEach(
        function (
          item,
          index
        ) {
          var button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "word-card";

          button.textContent =
            item;

          button.style.fontSize =
            "32px";

          button.addEventListener(
            "click",
            function () {
              if (
                index ===
                answers[round]
              ) {
                correct++;

                button.classList.add(
                  "correct"
                );
              } else {
                button.classList.add(
                  "wrong"
                );
              }

              setTimeout(
                function () {
                  round++;

                  if (
                    round <
                    sets.length
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Odd One Out",
                      Math.round(
                        (
                          correct /
                          sets.length
                        ) * 100
                      )
                    );
                  }
                },
                500
              );
            }
          );

          grid.appendChild(
            button
          );
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
      selectedSet === "set1"
        ? 3
        : selectedSet === "set2"
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
        .map(
          function () {
            return symbols[
              Math.floor(
                Math.random() *
                symbols.length
              )
            ];
          }
        );

    var answer = [];

    sessionStartedAt =
      Date.now();

    openModal(
      "<h3>🔢 Pattern Recall</h3>" +

      '<p class="sub sans">' +
      "Remember this pattern." +
      "</p>" +

      '<p class="prompt" style="font-size:34px;">' +
      sequence.join(" ") +
      "</p>"
    );

    setTimeout(
      function () {
        openModal(
          "<h3>🔢 Pattern Recall</h3>" +

          '<p class="sub sans">' +
          "Tap the symbols in the same order." +
          "</p>" +

          '<p class="prompt" id="patternAnswer" style="min-height:40px;"></p>' +

          '<div class="word-grid" id="patternGrid"></div>'
        );

        var grid =
          document.getElementById(
            "patternGrid"
          );

        symbols.forEach(
          function (symbol) {
            var button =
              document.createElement(
                "button"
              );

            button.type =
              "button";

            button.className =
              "word-card";

            button.textContent =
              symbol;

            button.style.fontSize =
              "30px";

            button.addEventListener(
              "click",
              function () {
                answer.push(
                  symbol
                );

                document.getElementById(
                  "patternAnswer"
                ).textContent =
                  answer.join(" ");

                if (
                  answer.length <
                  sequence.length
                ) {
                  return;
                }

                var mistakes =
                  answer.filter(
                    function (
                      value,
                      index
                    ) {
                      return (
                        value !==
                        sequence[index]
                      );
                    }
                  ).length;

                var score =
                  Math.max(
                    40,
                    100 -
                    mistakes * 20
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

            grid.appendChild(
              button
            );
          }
        );
      },
      selectedSet === "set3"
        ? 2300
        : 1700
    );
  }

  /* =========================================================
     CANDY MATCH
     ========================================================= */

  function startCandyMatch() {
    var types = [
      "🍬",
      "🍫",
      "🍭",
      "🍩",
      "🍪"
    ];

    var width = 6;
    var board = [];
    var moves = 20;
    var score = 0;
    var selected = null;

    sessionStartedAt =
      Date.now();

    openModal(
      "<h3>🍬 Candy Match</h3>" +

      '<p class="sub sans">' +
      "Make matching rows of three." +
      "</p>" +

      '<p class="sub sans">' +
      "Moves: <b id=\"candyMoves\">" +
      moves +
      "</b> · Score: <b id=\"candyScore\">" +
      score +
      "</b>" +
      "</p>" +

      '<div id="candyGrid" style="' +
      "display:grid;" +
      "grid-template-columns:repeat(6,1fr);" +
      "gap:6px;" +
      "max-width:560px;" +
      "margin:auto;" +
      '"></div>'
    );

    var grid =
      document.getElementById(
        "candyGrid"
      );

    function createCandy() {
      return types[
        Math.floor(
          Math.random() *
          types.length
        )
      ];
    }

    function checkMatches() {
      var found = false;

      for (
        var i = 0;
        i < board.length;
        i++
      ) {
        var row =
          Math.floor(
            i / width
          );

        var col =
          i % width;

        if (
          col <
            width - 2 &&
          board[i].textContent ===
            board[i + 1].textContent &&
          board[i].textContent ===
            board[i + 2].textContent
        ) {
          found = true;

          board[i].classList.add(
            "correct"
          );

          board[i + 1].classList.add(
            "correct"
          );

          board[i + 2].classList.add(
            "correct"
          );
        }

        if (
          row <
            width - 2 &&
          board[i].textContent ===
            board[i + width].textContent &&
          board[i].textContent ===
            board[i + width * 2].textContent
        ) {
          found = true;

          board[i].classList.add(
            "correct"
          );

          board[i + width].classList.add(
            "correct"
          );

          board[i + width * 2].classList.add(
            "correct"
          );
        }
      }

      if (found) {
        score += 10;

        document.getElementById(
          "candyScore"
        ).textContent =
          score;
      }

      return found;
    }

    for (
      var i = 0;
      i < width * width;
      i++
    ) {
      var candy =
        document.createElement(
          "button"
        );

      candy.type =
        "button";

      candy.className =
        "candy-tile";

      candy.textContent =
        createCandy();

      candy.dataset.index =
        i;

      candy.addEventListener(
        "click",
        function () {
          if (!selected) {
            selected = this;

            this.classList.add(
              "selected"
            );

            return;
          }

          if (
            selected ===
            this
          ) {
            this.classList.remove(
              "selected"
            );

            selected = null;

            return;
          }

          var first =
            parseInt(
              selected.dataset.index,
              10
            );

          var second =
            parseInt(
              this.dataset.index,
              10
            );

          var difference =
            Math.abs(
              first -
              second
            );

          var adjacent =
            difference === 1 ||
            difference === width;

          if (adjacent) {
            var temp =
              selected.textContent;

            selected.textContent =
              this.textContent;

            this.textContent =
              temp;

            if (
              checkMatches()
            ) {
              moves--;

              document.getElementById(
                "candyMoves"
              ).textContent =
                moves;

              if (
                moves <= 0
              ) {
                finishGame(
                  "Candy Match",
                  Math.min(
                    100,
                    score
                  )
                );
              }
            } else {
              temp =
                selected.textContent;

              selected.textContent =
                this.textContent;

              this.textContent =
                temp;
            }
          }

          selected.classList.remove(
            "selected"
          );

          selected = null;
        }
      );

      grid.appendChild(
        candy
      );

      board.push(
        candy
      );
    }
  }
  /* =========================================================
     LETTER SCRAMBLE
     ========================================================= */

  function startLetterScramble() {
    var words = [
      "APPLE",
      "HOUSE",
      "GARDEN",
      "FAMILY"
    ];

    var round = 0;
    var correct = 0;

    sessionStartedAt =
      Date.now();

    function renderRound() {
      var answer =
        words[round];

      var letters =
        answer
          .split("")
          .sort(
            function () {
              return Math.random() - 0.5;
            }
          );

      var selected = [];

      openModal(
        "<h3>🔤 Letter Scramble</h3>" +

        '<p class="sub sans">' +
        "Arrange the letters to make a word." +
        "</p>" +

        '<p class="prompt" id="scrambleAnswer"></p>' +

        '<div class="word-grid" id="scrambleGrid"></div>'
      );

      var grid =
        document.getElementById(
          "scrambleGrid"
        );

      letters.forEach(
        function (letter) {
          var button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "word-card";

          button.textContent =
            letter;

          button.addEventListener(
            "click",
            function () {
              if (
                button.disabled
              ) {
                return;
              }

              button.disabled =
                true;

              selected.push(
                letter
              );

              document.getElementById(
                "scrambleAnswer"
              ).textContent =
                selected.join(
                  " "
                );

              if (
                selected.length ===
                answer.length
              ) {
                if (
                  selected.join(
                    ""
                  ) === answer
                ) {
                  correct++;
                }

                setTimeout(
                  function () {
                    round++;

                    if (
                      round <
                      words.length
                    ) {
                      renderRound();
                    } else {
                      finishGame(
                        "Letter Scramble",
                        Math.round(
                          (
                            correct /
                            words.length
                          ) * 100
                        )
                      );
                    }
                  },
                  700
                );
              }
            }
          );

          grid.appendChild(
            button
          );
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     CHESS
     ========================================================= */

  function startChess() {
    var questions = [
      {
        q: "Which piece moves in an L shape?",
        options: [
          "♞ Knight",
          "♜ Rook",
          "♝ Bishop"
        ],
        answer: "♞ Knight"
      },

      {
        q: "Which piece moves diagonally?",
        options: [
          "♝ Bishop",
          "♜ Rook",
          "♟ Pawn"
        ],
        answer: "♝ Bishop"
      },

      {
        q: "Which piece is most important to protect?",
        options: [
          "♚ King",
          "♜ Rook",
          "♟ Pawn"
        ],
        answer: "♚ King"
      },

      {
        q: "Which piece moves in straight lines?",
        options: [
          "♜ Rook",
          "♞ Knight",
          "♝ Bishop"
        ],
        answer: "♜ Rook"
      }
    ];

    var round = 0;
    var correct = 0;

    sessionStartedAt =
      Date.now();

    function renderRound() {
      var item =
        questions[round];

      openModal(
        "<h3>♟️ Chess</h3>" +

        '<p class="sub sans">' +
        item.q +
        "</p>" +

        '<div class="word-grid" id="chessGrid"></div>'
      );

      var grid =
        document.getElementById(
          "chessGrid"
        );

      item.options.forEach(
        function (option) {
          var button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "word-card";

          button.textContent =
            option;

          button.addEventListener(
            "click",
            function () {
              if (
                option ===
                item.answer
              ) {
                correct++;

                button.classList.add(
                  "correct"
                );
              } else {
                button.classList.add(
                  "wrong"
                );
              }

              setTimeout(
                function () {
                  round++;

                  if (
                    round <
                    questions.length
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Chess",
                      Math.round(
                        (
                          correct /
                          questions.length
                        ) * 100
                      )
                    );
                  }
                },
                500
              );
            }
          );

          grid.appendChild(
            button
          );
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     SPECIAL GAME VARIANTS
     ========================================================= */

  function startMemoryPlus() {
    startMemoryMatch();
  }

  function startPatternChallenge() {
    startSequenceRecall();
  }

  function startPicturePlus() {
    startPicturePath();
  }

  function startColorChallenge() {
    startColorClash();
  }

  function startFindDifference() {
    var sets = [
      [
        "🌸",
        "🌸",
        "🌸",
        "🌻"
      ],

      [
        "🍎",
        "🍎",
        "🍐",
        "🍎"
      ],

      [
        "⭐",
        "⭐",
        "🌟",
        "⭐"
      ],

      [
        "🐦",
        "🐦",
        "🐦",
        "🦋"
      ]
    ];

    var answers = [
      3,
      2,
      2,
      3
    ];

    var round = 0;
    var correct = 0;

    sessionStartedAt =
      Date.now();

    function renderRound() {
      openModal(
        "<h3>🔎 Find the Difference</h3>" +

        '<p class="sub sans">' +
        "Tap the picture that is different." +
        "</p>" +

        '<div class="word-grid" id="differenceGrid"></div>'
      );

      var grid =
        document.getElementById(
          "differenceGrid"
        );

      sets[round].forEach(
        function (
          item,
          index
        ) {
          var button =
            document.createElement(
              "button"
            );

          button.type =
            "button";

          button.className =
            "word-card";

          button.style.fontSize =
            "34px";

          button.textContent =
            item;

          button.addEventListener(
            "click",
            function () {
              if (
                index ===
                answers[round]
              ) {
                correct++;

                button.classList.add(
                  "correct"
                );
              } else {
                button.classList.add(
                  "wrong"
                );
              }

              setTimeout(
                function () {
                  round++;

                  if (
                    round <
                    sets.length
                  ) {
                    renderRound();
                  } else {
                    finishGame(
                      "Find the Difference",
                      Math.round(
                        (
                          correct /
                          sets.length
                        ) * 100
                      )
                    );
                  }
                },
                500
              );
            }
          );

          grid.appendChild(
            button
          );
        }
      );
    }

    renderRound();
  }

  /* =========================================================
     LAUNCH GAME
     ========================================================= */

  function launchGame(key) {
    gameScreenOpen =
      true;

    if (key === "memory") {
      startMemoryMatch();

    } else if (key === "word") {
      startWordGarden();

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

    } else if (key === "memory2") {
      startMemoryPlus();

    } else if (key === "sequence2") {
      startPatternChallenge();

    } else if (key === "picture2") {
      startPicturePlus();

    } else if (key === "color2") {
      startColorChallenge();

    } else if (key === "odd2") {
      startFindDifference();
    }
  }

  window.launchGame =
    launchGame;

  /* =========================================================
     FAMILY MEMORY
     ========================================================= */

  function unlockFamilyMemory(score) {
    if (
      Number(score) < 70
    ) {
      return;
    }

    var box =
      document.getElementById(
        "familyMemoryUnlocked"
      );

    var action =
      document.getElementById(
        "happyMemoryAction"
      );

    if (!box || !action) {
      return;
    }

    box.style.display =
      "block";

    action.textContent =
      "🎁 Memory unlocked!";

    localStorage.setItem(
      "mindbridgeFamilyMemoryUnlocked",
      "true"
    );

    var card =
      document.getElementById(
        "happyMemoryBtn"
      );

    if (card) {
      card.classList.remove(
        "locked"
      );

      card.classList.add(
        "unlocked"
      );
    }
  }

  function restoreFamilyMemory() {
    if (
      localStorage.getItem(
        "mindbridgeFamilyMemoryUnlocked"
      ) !== "true"
    ) {
      return;
    }

    var box =
      document.getElementById(
        "familyMemoryUnlocked"
      );

    var action =
      document.getElementById(
        "happyMemoryAction"
      );

    if (!box || !action) {
      return;
    }

    box.style.display =
      "block";

    action.textContent =
      "🎁 Memory unlocked!";

    var card =
      document.getElementById(
        "happyMemoryBtn"
      );

    if (card) {
      card.classList.remove(
        "locked"
      );

      card.classList.add(
        "unlocked"
      );
    }
  }

  /* =========================================================
     FINISH GAME
     ========================================================= */

  function finishGame(name, score) {
    var duration =
      Math.max(
        30,
        Math.round(
          (
            Date.now() -
            sessionStartedAt
          ) / 1000
        )
      );

    /*
       90% OR ABOVE = GAME COMPLETED
    */

    if (
      Number(score) < 90
    ) {
      openModal(
        "<h3>💛 Try again</h3>" +

        '<p class="sub sans">' +
        localisedGameName(
          name
        ) +
        " scored " +
        score +
        "%. " +
        "You need 90% or higher to complete this game." +
        "</p>" +

        '<button class="btn full" id="retryGameBtn" type="button">' +
        "Play again" +
        "</button>"
      );

      document
        .getElementById(
          "retryGameBtn"
        )
        .addEventListener(
          "click",
          function () {
            launchGame(
              findGameKey(name)
            );
          }
        );

      return;
    }

    openModal(
      "<h3>🎉 " +
      t("sessionComplete") +
      "</h3>" +

      '<p class="sub sans">' +
      localisedGameName(
        name
      ) +
      "</p>" +

      '<div class="result-score">' +
      score +
      "%" +
      "</div>" +

      '<p class="sub sans">' +
      t("excellent") +
      "</p>" +

      '<button class="btn full" id="doneBtn" type="button">' +
      t("done") +
      "</button>"
    );

    unlockFamilyMemory(
      score
    );

    document
      .getElementById(
        "doneBtn"
      )
      .addEventListener(
        "click",
        async function () {
          this.disabled =
            true;

          var game =
            findGameObject(
              name
            );

          if (game) {
            completedGames[
              selectedSet
            ][game.key] =
              true;

            saveGameProgress();
          }

          closeModal();

          try {
            await MB.api(
              "/api/scores",
              {
                method: "POST",

                body:
                  JSON.stringify({
                    name:
                      name,

                    score:
                      score,

                    attempts:
                      1,

                    durationSeconds:
                      duration,

                    difficulty:
                      GAME_SETS[
                        selectedSet
                      ].difficulty
                  })
              }
            );

            await loadSummary(
              true
            );

            await loadGifts();

          } catch (error) {
            handleError(
              error
            );
          }

          if (
            setComplete(
              selectedSet
            )
          ) {
            moveToNextSet();
          }
        }
      );
  }

  function findGameObject(name) {
    var games =
      GAME_SETS[
        selectedSet
      ].games;

    for (
      var i = 0;
      i < games.length;
      i++
    ) {
      if (
        games[i].name ===
        name
      ) {
        return games[i];
      }

      if (
        name ===
          "Memory Match" &&
        games[i].key ===
          "memory2"
      ) {
        return games[i];
      }

      if (
        name ===
          "Pattern Recall" &&
        games[i].key ===
          "sequence2"
      ) {
        return games[i];
      }

      if (
        name ===
          "Picture Path" &&
        games[i].key ===
          "picture2"
      ) {
        return games[i];
      }

      if (
        name ===
          "Color Clash" &&
        games[i].key ===
          "color2"
      ) {
        return games[i];
      }
    }

    return null;
  }

  function findGameKey(name) {
    var game =
      findGameObject(
        name
      );

    return game
      ? game.key
      : "memory";
  }

  /* =========================================================
     MOVE TO NEXT SET
     ========================================================= */

  function moveToNextSet() {
    var currentIndex =
      SET_ORDER.indexOf(
        selectedSet
      );

    if (
      currentIndex <
      SET_ORDER.length - 1
    ) {
      var nextSet =
        SET_ORDER[
          currentIndex + 1
        ];

      unlockedSet =
        nextSet;

      selectedSet =
        nextSet;

      saveGameProgress();

      openModal(
        "<h3>🌟 Set complete!</h3>" +

        '<p class="sub sans">' +
        "You completed all 5 games in this set." +
        "</p>" +

        '<div style="text-align:center;font-size:60px;margin:20px;">' +
        GAME_SETS[
          nextSet
        ].icon +
        "</div>" +

        '<button class="btn full" id="nextSetBtn" type="button">' +
        "Continue to " +
        GAME_SETS[
          nextSet
        ].title +
        " →" +
        "</button>"
      );

      document
        .getElementById(
          "nextSetBtn"
        )
        .addEventListener(
          "click",
          showGameChooser
        );

    } else {
      openModal(
        "<h3>🏆 Amazing!</h3>" +

        '<p class="sub sans">' +
        "You completed all 15 games today." +
        "</p>" +

        '<div style="text-align:center;font-size:65px;margin:20px;">🎉</div>' +

        '<p class="sub sans" style="text-align:center;">' +
        "Your new game cycle will open after the daily reset." +
        "</p>"
      );

      speak(
        "Amazing. You completed all fifteen games today."
      );
    }
  }

  /* =========================================================
     GIFTS
     ========================================================= */

  function renderGifts(payload) {
    var list =
      document.getElementById(
        "patientGifts"
      );

    if (!list || !payload) {
      return;
    }

    if (
      !payload.gifts ||
      !payload.gifts.length
    ) {
      list.innerHTML =
        '<div class="gift-card locked">' +
        "<h4>A gift is waiting</h4>" +
        "<p>Your caretaker can add a special message or photo.</p>" +
        "</div>";

      return;
    }

    list.innerHTML =
      payload.gifts
        .map(
          function (gift) {
            if (
              !payload.unlocked
            ) {
              return (
                '<div class="gift-card locked">' +
                "<h4>🔒 Locked gift</h4>" +
                "<p>Complete a game with 90% or higher to unlock it.</p>" +
                "</div>"
              );
            }

            return (
              '<div class="gift-card unlocked">' +
              "<h4>" +
              MB.escapeHtml(
                gift.title
              ) +
              "</h4>" +
              '<span class="gift-badge">Unlocked</span>' +
              "</div>"
            );
          }
        )
        .join("");
  }

  async function loadGifts() {
    try {
      var gifts =
        await MB.api(
          "/api/gifts"
        );

      renderGifts(
        gifts
      );

    } catch (error) {
      console.warn(
        "Gift loading unavailable.",
        error
      );
    }
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

    console.error(
      error
    );
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

  async function loadSummary() {
    var summary =
      await MB.api(
        "/api/summary?days=7"
      );

    state.summary =
      summary;

    state.profile =
      summary.profile;

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

    renderWellbeing(
      summary.wellbeing
    );

    renderActivity(
      summary.recent
    );

    restoreFamilyMemory();

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

  /* =========================================================
     AUTO REFRESH
     ========================================================= */

  window.setInterval(
    function () {
      loadAlerts()
        .catch(
          handleError
        );
    },
    60000
  );

  /* =========================================================
     LOGOUT
     ========================================================= */

  var logoutBtn =
    document.getElementById(
      "logoutBtn"
    );

  if (logoutBtn) {
    logoutBtn.addEventListener(
      "click",
      MB.signOut
    );
  }

  /* =========================================================
     BOOT
     ========================================================= */

  async function boot() {
    try {
      await loadSummary();

      await loadAlerts();

      await loadGifts();

    } catch (error) {
      handleError(
        error
      );
    }
  }

  connectGamesButton();

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }

})();

/* =========================================================
   MINDBUDDY
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    var helperButton =
      document.getElementById(
        "aiHelperButton"
      );

    var chatBox =
      document.getElementById(
        "aiChatBox"
      );

    var closeButton =
      document.getElementById(
        "closeAiChat"
      );

    var input =
      document.getElementById(
        "aiChatInput"
      );

    var sendButton =
      document.getElementById(
        "aiSendBtn"
      );

    var messages =
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
      var message =
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

      message
        .querySelector(
          ".ai-message-text"
        )
        .textContent =
        text;

      messages.appendChild(
        message
      );

      messages.scrollTop =
        messages.scrollHeight;
    }

    async function sendMessage() {
      var text =
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

      input.disabled =
        true;

      sendButton.disabled =
        true;

      var typing =
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
        var result =
          await MB.api(
            "/api/ai/chat",
            {
              method: "POST",

              body:
                JSON.stringify({
                  message:
                    text
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

/* ============================================================================
   MINDBRIDGE — FINAL PATIENT DASHBOARD UI ENHANCEMENT
   ---------------------------------------------------------------------------
   This enhancement:
   - Makes Games + Memories & Moments side-by-side
   - Makes game screens larger
   - Makes instructions bold and readable
   - Makes game sets easier to access
   - Adds encouraging mood messages
   - Does NOT change game logic or progression
   ============================================================================ */

(function () {
  "use strict";

  /* =========================================================
     UI STYLE INJECTION
     ========================================================= */

  var style = document.createElement("style");

  style.id = "mindbridge-final-ui-style";

  style.textContent = `
    /* =====================================================
       GAMES + MEMORIES SIDE BY SIDE
       ===================================================== */

    .mindbridge-feature-row {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
      gap: 22px !important;
      width: 100% !important;
      align-items: stretch !important;
    }

    .mindbridge-feature-row > * {
      min-width: 0 !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }

    .mindbridge-feature-row > * > * {
      box-sizing: border-box !important;
    }

    /* =====================================================
       GAMES CARD
       ===================================================== */

    .mindbridge-games-large {
      min-height: 220px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
    }

    .mindbridge-games-large h1,
    .mindbridge-games-large h2,
    .mindbridge-games-large h3,
    .mindbridge-games-large h4 {
      font-size: 26px !important;
      line-height: 1.25 !important;
    }

    .mindbridge-games-large p {
      font-size: 17px !important;
      line-height: 1.5 !important;
    }

    /* =====================================================
       MEMORIES CARD
       ===================================================== */

    .mindbridge-memory-large {
      min-height: 220px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
    }

    .mindbridge-memory-large h1,
    .mindbridge-memory-large h2,
    .mindbridge-memory-large h3,
    .mindbridge-memory-large h4 {
      font-size: 26px !important;
      line-height: 1.25 !important;
    }

    .mindbridge-memory-large p {
      font-size: 17px !important;
      line-height: 1.5 !important;
    }

    /* =====================================================
       PLAY GAMES BUTTON
       ===================================================== */

    #gamesViewAll {
      font-size: 18px !important;
      font-weight: 700 !important;
      min-height: 48px !important;
      padding: 12px 22px !important;
      border-radius: 14px !important;
      cursor: pointer !important;
    }

    /* =====================================================
       LARGE GAME MODAL
       ===================================================== */

    #modalBg .modal {
      box-sizing: border-box !important;
    }

    #modalContent {
      box-sizing: border-box !important;
    }

    /* =====================================================
       GAME CHOOSER
       ===================================================== */

    .game-chooser {
      width: 100% !important;
      max-width: 1050px !important;
      margin: 0 auto !important;
      box-sizing: border-box !important;
      padding: 10px 8px 20px !important;
    }

    .game-chooser-header {
      display: flex !important;
      align-items: center !important;
      gap: 20px !important;
      margin-bottom: 25px !important;
    }

    .game-chooser-icon {
      width: 72px !important;
      height: 72px !important;
      min-width: 72px !important;
      border-radius: 20px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 42px !important;
      background: #fff4d9 !important;
    }

    .game-chooser-header h3 {
      font-size: 32px !important;
      line-height: 1.2 !important;
      margin: 0 0 8px !important;
      font-weight: 800 !important;
    }

    .game-chooser-header .sub {
      font-size: 19px !important;
      line-height: 1.45 !important;
      margin: 0 !important;
      font-weight: 600 !important;
    }

    /* =====================================================
       SET TABS
       ===================================================== */

    .game-set-tabs {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 14px !important;
      margin: 10px 0 22px !important;
    }

    .game-set-tab {
      min-height: 88px !important;
      padding: 14px 12px !important;
      border-radius: 18px !important;
      border: 2px solid #d8dedb !important;
      background: #ffffff !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
      cursor: pointer !important;
      font-size: 20px !important;
      font-weight: 800 !important;
      transition: transform .15s ease, box-shadow .15s ease !important;
    }

    .game-set-tab:hover:not(:disabled) {
      transform: translateY(-2px) !important;
      box-shadow: 0 7px 18px rgba(0,0,0,.08) !important;
    }

    .game-set-tab.active {
      border: 3px solid #6b9eaa !important;
      background: #eaf7f8 !important;
      box-shadow: 0 5px 16px rgba(73,120,130,.12) !important;
    }

    .game-set-tab:disabled {
      opacity: .55 !important;
      cursor: not-allowed !important;
    }

    .game-set-tab small {
      font-size: 15px !important;
      font-weight: 700 !important;
    }

    /* =====================================================
       CURRENT SET
       ===================================================== */

    .current-game-set {
      min-height: 78px !important;
      padding: 15px 20px !important;
      border-radius: 18px !important;
      background: #f8f5ed !important;
      display: flex !important;
      align-items: center !important;
      gap: 16px !important;
      margin-bottom: 20px !important;
    }

    .current-game-set > span {
      font-size: 38px !important;
    }

    .current-game-set strong {
      display: block !important;
      font-size: 23px !important;
      font-weight: 800 !important;
      line-height: 1.3 !important;
    }

    .current-game-set small {
      display: block !important;
      font-size: 17px !important;
      font-weight: 600 !important;
      margin-top: 4px !important;
    }
  `;

  document.head.appendChild(style);
  /* =========================================================
     GAME CHOOSER — BIGGER GAME CARDS
     ========================================================= */

  style.textContent += `

    .game-chooser-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 16px !important;
      width: 100% !important;
    }

    .game-choice {
      position: relative !important;
      min-height: 150px !important;
      padding: 22px 18px !important;
      border-radius: 20px !important;
      border: 2px solid #e1e6e3 !important;
      background: #ffffff !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 7px !important;
      cursor: pointer !important;
      transition:
        transform .15s ease,
        box-shadow .15s ease,
        border-color .15s ease !important;
      box-sizing: border-box !important;
    }

    .game-choice:hover {
      transform: translateY(-3px) !important;
      box-shadow: 0 8px 22px rgba(0,0,0,.09) !important;
    }

    .game-choice:active {
      transform: scale(.98) !important;
    }

    .game-choice.completed {
      border: 3px solid #79a98b !important;
      background: #f1faf3 !important;
    }

    .game-choice-icon {
      font-size: 46px !important;
      line-height: 1 !important;
      margin-bottom: 4px !important;
    }

    .game-choice-name {
      font-size: 21px !important;
      font-weight: 800 !important;
      line-height: 1.25 !important;
      text-align: center !important;
    }

    .game-choice-category {
      font-size: 16px !important;
      font-weight: 600 !important;
      line-height: 1.25 !important;
      text-align: center !important;
      opacity: .75 !important;
    }

    .game-choice-check {
      position: absolute !important;
      top: 12px !important;
      right: 14px !important;
      width: 30px !important;
      height: 30px !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #78a986 !important;
      color: white !important;
      font-size: 19px !important;
      font-weight: 900 !important;
    }

    /* =====================================================
       GAME RULE / INSTRUCTION
       ===================================================== */

    .game-rule {
      margin: 22px 0 0 !important;
      padding: 15px 18px !important;
      border-radius: 15px !important;
      background: #fff8e7 !important;
      font-size: 18px !important;
      line-height: 1.5 !important;
      font-weight: 800 !important;
      text-align: center !important;
    }

    /* =====================================================
       ALL GAME INSTRUCTIONS
       ===================================================== */

    #modalContent .sub.sans {
      font-size: 21px !important;
      line-height: 1.55 !important;
      font-weight: 800 !important;
      margin-top: 10px !important;
      margin-bottom: 16px !important;
    }

    #modalContent .prompt {
      font-size: 25px !important;
      line-height: 1.5 !important;
      font-weight: 800 !important;
      margin: 18px auto !important;
      max-width: 850px !important;
      text-align: center !important;
    }

    /* =====================================================
       GAME TITLES
       ===================================================== */

    #modalContent h3 {
      font-size: 32px !important;
      line-height: 1.25 !important;
      font-weight: 900 !important;
      margin-bottom: 8px !important;
    }

    /* =====================================================
       GAME ANSWER BUTTONS
       ===================================================== */

    #modalContent .word-grid {
      gap: 14px !important;
      max-width: 850px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    #modalContent .word-card {
      min-height: 72px !important;
      padding: 14px 18px !important;
      border-radius: 17px !important;
      font-size: 21px !important;
      line-height: 1.3 !important;
      font-weight: 750 !important;
      cursor: pointer !important;
    }

    /* =====================================================
       RESULT SCREEN
       ===================================================== */

    #modalContent .result-score {
      font-size: 72px !important;
      line-height: 1 !important;
      font-weight: 900 !important;
      text-align: center !important;
      margin: 25px 0 !important;
    }

    #modalContent .btn.full {
      min-height: 58px !important;
      font-size: 21px !important;
      font-weight: 800 !important;
      border-radius: 16px !important;
    }

    /* =====================================================
       CANDY GAME
       ===================================================== */

    #modalContent #candyMoves,
    #modalContent #candyScore {
      font-size: 21px !important;
      font-weight: 900 !important;
    }

    #modalContent .candy-tile {
      min-height: 68px !important;
      min-width: 68px !important;
      font-size: 32px !important;
      border-radius: 14px !important;
    }

    /* =====================================================
       MOOD MESSAGE
       ===================================================== */

    .mindbridge-mood-message {
      display: block !important;
      width: 100% !important;
      margin-top: 7px !important;
      font-size: 14px !important;
      line-height: 1.25 !important;
      font-weight: 700 !important;
      text-align: center !important;
      opacity: .85 !important;
    }

    .mindbridge-mood-message:empty {
      display: none !important;
    }
  `;
  /* =========================================================
     FIND ELEMENT BY VISIBLE HEADING
     ========================================================= */

  function cleanText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function findHeading(text) {
    var wanted = cleanText(text);

    var headings =
      document.querySelectorAll(
        "h1,h2,h3,h4,h5,h6"
      );

    for (
      var i = 0;
      i < headings.length;
      i++
    ) {
      if (
        cleanText(
          headings[i].textContent
        ) === wanted
      ) {
        return headings[i];
      }
    }

    return null;
  }

  /* =========================================================
     FIND CARD / SECTION ROOT
     ========================================================= */

  function findCardRoot(element) {
    if (!element) return null;

    var current = element;

    for (
      var level = 0;
      level < 7 && current;
      level++
    ) {
      if (
        current.classList &&
        (
          current.classList.contains("card") ||
          current.classList.contains("dashboard-card") ||
          current.classList.contains("feature-card") ||
          current.classList.contains("panel") ||
          current.classList.contains("section-card")
        )
      ) {
        return current;
      }

      current = current.parentElement;
    }

    /*
       Fallback:
       walk upward until we find a reasonably sized
       section-like container.
    */

    current = element;

    for (
      var fallback = 0;
      fallback < 6 && current;
      fallback++
    ) {
      if (
        current.parentElement &&
        current.parentElement.children.length <= 8
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return element.parentElement;
  }

  /* =========================================================
     GAMES + MEMORIES SIDE-BY-SIDE
     ========================================================= */

  function makeGamesAndMemoriesSideBySide() {
    var gamesHeading =
      findHeading("Games");

    var memoriesHeading =
      findHeading(
        "Memories & Moments"
      );

    if (
      !gamesHeading ||
      !memoriesHeading
    ) {
      return;
    }

    var gamesCard =
      findCardRoot(
        gamesHeading
      );

    var memoriesCard =
      findCardRoot(
        memoriesHeading
      );

    if (
      !gamesCard ||
      !memoriesCard ||
      gamesCard === memoriesCard
    ) {
      return;
    }

    /*
       Already arranged?
    */

    var existingRow =
      gamesCard.closest(
        ".mindbridge-feature-row"
      );

    if (
      existingRow &&
      existingRow.contains(
        memoriesCard
      )
    ) {
      return;
    }

    /*
       Find lowest common ancestor.
    */

    var ancestor =
      gamesCard.parentElement;

    while (
      ancestor &&
      !ancestor.contains(
        memoriesCard
      )
    ) {
      ancestor =
        ancestor.parentElement;
    }

    if (!ancestor) {
      return;
    }

    /*
       Find the direct child branches containing
       the two cards.
    */

    function directBranch(
      root,
      target
    ) {
      var node = target;

      while (
        node &&
        node.parentElement !== root
      ) {
        node = node.parentElement;
      }

      return node;
    }

    var gamesBranch =
      directBranch(
        ancestor,
        gamesCard
      );

    var memoriesBranch =
      directBranch(
        ancestor,
        memoriesCard
      );

    if (
      !gamesBranch ||
      !memoriesBranch ||
      gamesBranch === memoriesBranch
    ) {
      return;
    }

    /*
       Create a dedicated row.
    */

    var row =
      document.createElement("div");

    row.className =
      "mindbridge-feature-row";

    /*
       Insert the row before whichever
       branch appears first.
    */

    var first =
      gamesBranch.compareDocumentPosition(
        memoriesBranch
      ) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? gamesBranch
        : memoriesBranch;

    ancestor.insertBefore(
      row,
      first
    );

    row.appendChild(
      gamesBranch
    );

    row.appendChild(
      memoriesBranch
    );

    gamesBranch.classList.add(
      "mindbridge-games-large"
    );

    memoriesBranch.classList.add(
      "mindbridge-memory-large"
    );
  }

  /* =========================================================
     MAKE GAME MODAL LARGE
     ========================================================= */

  function makeGameModalLarge() {
    var modal =
      document.querySelector(
        "#modalBg .modal"
      );

    if (!modal) return;

    modal.style.maxWidth =
      "1150px";

    modal.style.width =
      "96vw";

    modal.style.maxHeight =
      "94vh";

    modal.style.overflowY =
      "auto";

    modal.style.boxSizing =
      "border-box";
  }
  /* =========================================================
     MOOD CHEER MESSAGES
     ========================================================= */

  var moodMessages = {
    great:
      "That's wonderful! Keep smiling 🌸",

    good:
      "You're doing great today! 🌷",

    okay:
      "It's okay to take things slowly. 💛",

    low:
      "Be gentle with yourself today. 🌼",

    worried:
      "Take a little breath. You're not alone. 🤍"
  };

  function getMoodKey(button) {
    if (!button) return "";

    var text =
      cleanText(
        button.textContent
      );

    if (
      text.indexOf("great") !== -1
    ) {
      return "great";
    }

    if (
      text.indexOf("good") !== -1
    ) {
      return "good";
    }

    if (
      text.indexOf("okay") !== -1 ||
      text.indexOf("ok") !== -1
    ) {
      return "okay";
    }

    if (
      text.indexOf("low") !== -1
    ) {
      return "low";
    }

    if (
      text.indexOf("worried") !== -1
    ) {
      return "worried";
    }

    return "";
  }

  function addMoodMessages() {
    var moodHeading =
      findHeading(
        "How are you feeling today?"
      );

    if (!moodHeading) {
      return;
    }

    /*
       Find the section containing the mood buttons.
    */

    var section =
      moodHeading.parentElement;

    for (
      var i = 0;
      i < 5 && section;
      i++
    ) {
      if (
        section.querySelectorAll(
          "button"
        ).length >= 3
      ) {
        break;
      }

      section =
        section.parentElement;
    }

    if (!section) {
      return;
    }

    var buttons =
      section.querySelectorAll(
        "button"
      );

    Array.prototype.forEach.call(
      buttons,
      function (button) {
        var key =
          getMoodKey(button);

        if (!key) {
          return;
        }

        /*
           Prevent duplicate listeners.
        */

        if (
          button.dataset.mindbridgeMoodReady ===
          "true"
        ) {
          return;
        }

        button.dataset.mindbridgeMoodReady =
          "true";

        /*
           Create message element.
        */

        var message =
          document.createElement(
            "span"
          );

        message.className =
          "mindbridge-mood-message";

        message.textContent =
          "";

        /*
           Try to place the message inside
           the mood button, beneath its content.
        */

        button.appendChild(
          message
        );

        button.addEventListener(
          "click",
          function () {

            /*
               Remove message from every
               mood button first.
            */

            Array.prototype.forEach.call(
              buttons,
              function (other) {
                var otherMessage =
                  other.querySelector(
                    ".mindbridge-mood-message"
                  );

                if (
                  otherMessage
                ) {
                  otherMessage.textContent =
                    "";
                }
              }
            );

            message.textContent =
              moodMessages[key];

            /*
               Small voice response if the
               existing voice system is available.
            */

            try {
              if (
                typeof window.speak ===
                "function"
              ) {
                window.speak(
                  moodMessages[key]
                );
              }
            } catch (
              error
            ) {
              /*
                 Voice is optional.
              */
            }
          }
        );
      }
    );
  }

  /* =========================================================
     MAKE MOOD BUTTONS MORE READABLE
     ========================================================= */

  function enlargeMoodButtons() {
    var moodHeading =
      findHeading(
        "How are you feeling today?"
      );

    if (!moodHeading) {
      return;
    }

    var section =
      moodHeading.parentElement;

    for (
      var i = 0;
      i < 5 && section;
      i++
    ) {
      if (
        section.querySelectorAll(
          "button"
        ).length >= 3
      ) {
        break;
      }

      section =
        section.parentElement;
    }

    if (!section) {
      return;
    }

    var buttons =
      section.querySelectorAll(
        "button"
      );

    Array.prototype.forEach.call(
      buttons,
      function (button) {
        var key =
          getMoodKey(button);

        if (!key) {
          return;
        }

        button.style.minHeight =
          "105px";

        button.style.padding =
          "15px 12px";

        button.style.fontSize =
          "18px";

        button.style.fontWeight =
          "750";

        button.style.lineHeight =
          "1.3";
      }
    );
  }

  /* =========================================================
     WATCH FOR GAME MODAL OPENING
     ========================================================= */

  function watchModal() {
    var modalBg =
      document.getElementById(
        "modalBg"
      );

    if (!modalBg) {
      return;
    }

    var observer =
      new MutationObserver(
        function () {

          if (
            modalBg.classList.contains(
              "show"
            )
          ) {
            makeGameModalLarge();
          }
        }
      );

    observer.observe(
      modalBg,
      {
        attributes: true,
        attributeFilter: [
          "class"
        ]
      }
    );
  }

  /* =========================================================
     RESPONSIVE MOBILE LAYOUT
     ========================================================= */

  style.textContent += `

    @media (max-width: 850px) {

      .mindbridge-feature-row {
        grid-template-columns: 1fr !important;
      }

      .game-set-tabs {
        grid-template-columns: 1fr !important;
      }

      .game-chooser-grid {
        grid-template-columns: 1fr !important;
      }

      .game-choice {
        min-height: 135px !important;
      }

      .game-chooser-header h3 {
        font-size: 27px !important;
      }

      #modalContent .sub.sans {
        font-size: 19px !important;
      }

      #modalContent .prompt {
        font-size: 22px !important;
      }
    }

  `;
  /* =========================================================
     RUN FINAL UI SETUP
     ========================================================= */

  function initializeFinalPatientUI() {

    /*
       Games + Memories & Moments
       side-by-side.
    */

    makeGamesAndMemoriesSideBySide();

    /*
       Mood messages.
    */

    addMoodMessages();

    enlargeMoodButtons();

    /*
       Observe modal opening.
    */

    watchModal();

    /*
       Apply again after a short delay because
       the dashboard may finish rendering
       after DOMContentLoaded.
    */

    setTimeout(
      function () {
        makeGamesAndMemoriesSideBySide();
        addMoodMessages();
        enlargeMoodButtons();
      },
      500
    );

    setTimeout(
      function () {
        makeGamesAndMemoriesSideBySide();
        addMoodMessages();
        enlargeMoodButtons();
      },
      1500
    );

    setTimeout(
      function () {
        makeGamesAndMemoriesSideBySide();
        addMoodMessages();
        enlargeMoodButtons();
      },
      3000
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeFinalPatientUI
    );
  } else {
    initializeFinalPatientUI();
  }

})();
/* =========================================================
   MOOD ENCOURAGEMENT FIX
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  var messages = {
    great: "That's wonderful! Keep smiling 🌸",
    good: "You're doing great today! 🌷",
    okay: "It's okay to take things slowly. 💛",
    low: "Be gentle with yourself today. 🌼",
    worried: "Take a little breath. You're not alone. 🤍"
  };

  function getMood(button) {
    var text = (button.textContent || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (text.includes("worried")) return "worried";
    if (text.includes("great")) return "great";
    if (text.includes("good")) return "good";
    if (text.includes("okay") || text === "ok") return "okay";
    if (text.includes("low")) return "low";

    return null;
  }

  function setupMoodButtons() {

    var headings =
      document.querySelectorAll("h1,h2,h3,h4,h5,h6");

    var moodHeading = null;

    headings.forEach(function (heading) {
      if (
        (heading.textContent || "")
          .toLowerCase()
          .includes("how are you feeling today")
      ) {
        moodHeading = heading;
      }
    });

    if (!moodHeading) return;

    /*
       Find the section containing the mood buttons.
    */

    var section = moodHeading;

    for (var i = 0; i < 6; i++) {

      if (
        section &&
        section.querySelectorAll("button").length >= 5
      ) {
        break;
      }

      section = section.parentElement;
    }

    if (!section) return;

    var buttons =
      section.querySelectorAll("button");

    buttons.forEach(function (button) {

      var mood = getMood(button);

      if (!mood) return;

      /*
         Don't create the message twice.
      */

      var message =
        button.querySelector(
          ".mood-cheer-message"
        );

      if (!message) {

        message =
          document.createElement("div");

        message.className =
          "mood-cheer-message";

        message.style.fontSize =
          "14px";

        message.style.fontWeight =
          "700";

        message.style.lineHeight =
          "1.3";

        message.style.marginTop =
          "6px";

        message.style.textAlign =
          "center";

        message.style.display =
          "none";

        button.appendChild(message);
      }

      /*
         Make sure the message appears
         when the mood is selected.
      */

      button.addEventListener(
        "click",
        function () {

          /*
             Hide other messages.
          */

          buttons.forEach(function (other) {

            var otherMessage =
              other.querySelector(
                ".mood-cheer-message"
              );

            if (otherMessage) {
              otherMessage.style.display =
                "none";
            }
          });

          /*
             Show selected mood message.
          */

          message.textContent =
            messages[mood];

          message.style.display =
            "block";
        }
      );

    });
  }

  /*
     Run after the dashboard has rendered.
  */

  setupMoodButtons();

  setTimeout(
    setupMoodButtons,
    500
  );

  setTimeout(
    setupMoodButtons,
    1500
  );

});