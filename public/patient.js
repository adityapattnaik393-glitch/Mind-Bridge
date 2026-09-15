/* ============================================================================
   MindBridge — patient dashboard.
   Everything on this page comes from Supabase through /api/summary and
   /api/alerts. Finishing a game writes a row to game_scores and the whole
   dashboard (stats, chart, wellbeing, streak) re-reads from the database.
   ==========================================================================*/

(function () {
  "use strict";

  if (!MB.requireSession()) return;

  var t = I18N.t;
  var state = { profile: null, summary: null, alerts: { pending: [], logged: [] } };

  /* ===================================================== voice narration */

  var soundOn = true;
  var canSpeak = "speechSynthesis" in window;
  var soundBtn = document.getElementById("soundBtn");
  var voiceIndicator = document.getElementById("voiceIndicator");

  var SPEAKER_ON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D2521" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
  var SPEAKER_OFF = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1D2521" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><line x1="16" y1="9" x2="21" y2="14"/><line x1="21" y1="9" x2="16" y2="14"/></svg>';

  soundBtn.addEventListener("click", function () {
    soundOn = !soundOn;
    this.innerHTML = soundOn ? SPEAKER_ON : SPEAKER_OFF;
    if (!soundOn && canSpeak) window.speechSynthesis.cancel();
  });

  function speak(text) {
    if (!soundOn || !canSpeak || !text) return;
    window.speechSynthesis.cancel();
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;           // slower — easier for elderly users to follow
    utterance.pitch = 1;
    utterance.lang = I18N.speech;
    utterance.onstart = function () {
      voiceIndicator.classList.add("active");
      soundBtn.classList.add("speaking");
    };
    function done() {
      voiceIndicator.classList.remove("active");
      soundBtn.classList.remove("speaking");
    }
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  }

  /* ============================================================== modal */

  var modalBg = document.getElementById("modalBg");
  var modalContent = document.getElementById("modalContent");

  function closeModal() {
    modalBg.classList.remove("show");
    if (canSpeak) window.speechSynthesis.cancel();
  }
  function openModal(html) {
    modalContent.innerHTML = html;
    modalBg.classList.add("show");
  }
  document.getElementById("closeModal").addEventListener("click", closeModal);
  modalBg.addEventListener("click", function (event) {
    if (event.target === modalBg) closeModal();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modalBg.classList.contains("show")) closeModal();
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
    MB.setText("weeklyTitle", t("weeklyProgress"));
    MB.setText("weeklySub", t("weeklyProgressSub"));
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
    var greetKey = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
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
    MB.setText("avgLabel", t("avgScore") + " · " + t("acrossSessions", { n: totals.sessions }));
    MB.setText("minsActive", totals.minutesInWindow);
    MB.setText("bestScore", totals.bestScore + "%");
    MB.setText("streakNum", totals.streak);
  }

  function renderBars(series, highlightToday) {
    document.getElementById("barsWrap").innerHTML = series.map(function (day) {
      var empty = day.sessions === 0;
      var gold = day.avgScore >= 95;
      var height = empty ? 4 : Math.max(day.avgScore, 6);
      var classes = ["bar"];
      if (empty) classes.push("empty");
      else if (gold) classes.push("gold");
      if (highlightToday && day.isToday) classes.push("newbar");

      return '<div class="bar-col">'
        + '<span class="bar-val">' + (empty ? "—" : day.avgScore + "%") + "</span>"
        + '<div class="bar-track"><div class="' + classes.join(" ") + '" style="height:' + height + '%"></div></div>'
        + '<span class="bar-day' + (day.isToday ? " today" : "") + '">' + MB.escapeHtml(day.label) + "</span>"
        + "</div>";
    }).join("");
  }

  var CIRCUMFERENCE = 2 * Math.PI * 72;

  function renderWellbeing(wellbeing, series) {
    var score = wellbeing.score;
    document.getElementById("donutRing").style.strokeDashoffset = CIRCUMFERENCE * (1 - score / 100);
    MB.setText("wellbeingNum", score);

    var tags = [];
    tags.push(score >= 75
      ? '<span class="tag alt">' + t("stable") + "</span>"
      : '<span class="tag warn">' + t("needsSupport") + "</span>");
    tags.push(wellbeing.trend > 0
      ? '<span class="tag">' + t("memoryImproving") + "</span>"
      : '<span class="tag">' + t("memorySteady") + "</span>");
    tags.push(score >= 70
      ? '<span class="tag alt">' + t("moodPositive") + "</span>"
      : '<span class="tag warn">' + t("moodWatchful") + "</span>");

    document.getElementById("tagsWrap").innerHTML = tags.join("");
  }

  function localisedGameName(name) {
    if (name === "Word Garden") return t("wordGarden");
    if (name === "Memory Match") return t("memoryMatch");
    if (name === "Picture Path") return t("picturePath");
    return name;
  }

  function localisedCategory(category) {
    if (category === "Language") return t("language");
    if (category === "Memory") return t("memory");
    if (category === "Focus") return t("focus");
    return category;
  }

  function renderActivity(recent) {
    var list = document.getElementById("activityList");

    if (!recent.length) {
      list.innerHTML = '<p class="empty-state">' + t("noSessions") + "</p>";
      return;
    }

    list.innerHTML = recent.slice(0, 4).map(function (row, index) {
      var meta = MB.gameMeta(row.game_type);
      return '<div class="activity-row' + (index === 0 ? " fresh" : "") + '" data-game="' + meta.key + '">'
        + '<div class="activity-left">'
        + '<div class="activity-ic">' + meta.emoji + "</div>"
        + "<div>"
        + '<p class="activity-name">' + MB.escapeHtml(localisedGameName(row.game_type)) + "</p>"
        + '<p class="activity-sub">' + MB.escapeHtml(localisedCategory(row.category)) + " · " + MB.relativeTime(row.created_at) + "</p>"
        + "</div></div>"
        + '<span class="activity-score">' + row.score + "%</span>"
        + "</div>";
    }).join("");

    Array.prototype.forEach.call(list.querySelectorAll(".activity-row"), function (row) {
      row.addEventListener("click", function () { launchGame(row.dataset.game); });
    });
  }

  var ALERT_ICONS = { medicine: "💊", hydration: "💧", appointment: "🗓️", activity: "✓" };

  function alertIcon(alert) {
    var title = alert.title.toLowerCase();
    if (title.indexOf("medicine") > -1) return ALERT_ICONS.medicine;
    if (title.indexOf("hydration") > -1 || title.indexOf("water") > -1) return ALERT_ICONS.hydration;
    if (title.indexOf("appointment") > -1) return ALERT_ICONS.appointment;
    return ALERT_ICONS.activity;
  }

  function renderAlerts(alerts) {
    var list = document.getElementById("alertsList");
    var rows = [];

    alerts.pending.forEach(function (alert) {
      rows.push('<div class="alert-row" data-pending="1" data-title="' + MB.escapeHtml(alert.title)
        + '" data-body="' + MB.escapeHtml(alert.body) + '" style="cursor:pointer;">'
        + '<div class="alert-ic bell">' + alertIcon(alert) + "</div>"
        + "<div>"
        + '<p class="alert-title">' + MB.escapeHtml(alert.title) + "</p>"
        + '<p class="alert-body">' + MB.escapeHtml(alert.body) + "</p>"
        + '<p class="alert-time">Tap to acknowledge</p>'
        + "</div></div>");
    });

    alerts.logged.slice(0, 4).forEach(function (alert) {
      rows.push('<div class="alert-row">'
        + '<div class="alert-ic ok">✓</div>'
        + "<div>"
        + '<p class="alert-title">' + MB.escapeHtml(alert.title) + "</p>"
        + '<p class="alert-body">' + MB.escapeHtml(alert.body) + "</p>"
        + '<p class="alert-time">' + MB.relativeTime(alert.createdAt) + "</p>"
        + "</div></div>");
    });

    list.innerHTML = rows.length ? rows.join("") : '<p class="empty-state">' + t("noAlerts") + "</p>";

    Array.prototype.forEach.call(list.querySelectorAll('[data-pending="1"]'), function (row) {
      row.addEventListener("click", function () { acknowledgeAlert(row); });
    });
  }

  async function acknowledgeAlert(row) {
    var title = row.dataset.title;
    var body = row.dataset.body;
    row.style.pointerEvents = "none";
    speak(title + " " + t("acknowledged"));

    try {
      await MB.api("/api/alerts", {
        method: "POST",
        body: JSON.stringify({ alertTitle: title, alertBody: body, status: "Acknowledged" })
      });
      row.style.transition = "opacity .35s ease, transform .35s ease";
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
    setTimeout(function () { element.classList.remove("bump"); }, 500);
  }

  /* ============================================================== games */

  var sessionStartedAt = 0;

  function startWordGarden() {
    var questions = I18N.wordSets();
    var index = 0;
    var correct = 0;
    sessionStartedAt = Date.now();

    function renderQuestion() {
      var question = questions[index];
      openModal(
        "<h3>🌱 " + t("wordGarden") + "</h3>"
        + '<p class="sub sans">' + t("questionOf", { i: index + 1, n: questions.length }) + "</p>"
        + '<p class="prompt">' + MB.escapeHtml(question.prompt) + "</p>"
        + '<div class="word-grid">'
        + question.options.map(function (option) {
            return '<div class="word-card" data-opt="' + MB.escapeHtml(option) + '">' + MB.escapeHtml(option) + "</div>";
          }).join("")
        + "</div>"
      );
      speak(question.prompt + ". " + question.options.join(", "));

      Array.prototype.forEach.call(modalContent.querySelectorAll(".word-card"), function (card) {
        card.addEventListener("click", function () {
          var chosen = card.dataset.opt;
          Array.prototype.forEach.call(modalContent.querySelectorAll(".word-card"), function (other) {
            if (other.dataset.opt === question.answer) other.classList.add("correct");
            else if (other === card) other.classList.add("wrong");
          });
          if (chosen === question.answer) { correct += 1; speak(t("correct")); }
          else speak(t("notQuite"));

          setTimeout(function () {
            index += 1;
            if (index < questions.length) renderQuestion();
            else finishGame("Word Garden", Math.round((correct / questions.length) * 100));
          }, 650);
        });
      });
    }
    renderQuestion();
  }

  function startMemoryMatch() {
    var icons = ["🌸", "🍎", "⭐", "🐦", "🌸", "🍎", "⭐", "🐦"];
    var shuffled = icons
      .map(function (value) { return { value: value, sort: Math.random() }; })
      .sort(function (a, b) { return a.sort - b.sort; })
      .map(function (item) { return item.value; });

    var flipped = [];
    var matched = 0;
    var moves = 0;
    sessionStartedAt = Date.now();

    openModal(
      "<h3>🧠 " + t("memoryMatch") + "</h3>"
      + '<p class="sub sans">' + t("findPairs") + "</p>"
      + '<div class="word-grid" id="memGrid" style="grid-template-columns:repeat(4,1fr);"></div>'
    );
    speak(t("memoryMatch") + ". " + t("findPairs"));

    var grid = document.getElementById("memGrid");
    shuffled.forEach(function (icon) {
      var card = document.createElement("div");
      card.className = "word-card";
      card.style.fontSize = "22px";
      card.textContent = "❔";
      card.dataset.icon = icon;
      card.dataset.state = "hidden";

      card.addEventListener("click", function () {
        if (card.dataset.state !== "hidden" || flipped.length === 2) return;
        card.textContent = icon;
        card.dataset.state = "shown";
        flipped.push(card);

        if (flipped.length !== 2) return;
        moves += 1;
        var first = flipped[0];
        var second = flipped[1];

        if (first.dataset.icon === second.dataset.icon) {
          first.classList.add("correct");
          second.classList.add("correct");
          first.dataset.state = "matched";
          second.dataset.state = "matched";
          matched += 1;
          flipped = [];
          speak(t("matched"));
          if (matched === 4) {
            var score = Math.max(40, 100 - (moves - 4) * 8);
            setTimeout(function () { finishGame("Memory Match", score); }, 500);
          }
        } else {
          setTimeout(function () {
            first.textContent = "❔";
            second.textContent = "❔";
            first.dataset.state = "hidden";
            second.dataset.state = "hidden";
            flipped = [];
          }, 700);
        }
      });
      grid.appendChild(card);
    });
  }

  function startPicturePath() {
    var symbols = ["🔺", "🔵", "⬛", "⭐", "🔶", "🟢"];
    var names = I18N.shapeNames();
    var sequence = [0, 0, 0, 0].map(function () { return Math.floor(Math.random() * 6); });
    var step = 0;
    var wrong = 0;
    sessionStartedAt = Date.now();

    openModal(
      "<h3>🔍 " + t("picturePath") + "</h3>"
      + '<p class="sub sans">' + t("tapOrder") + "</p>"
      + '<p class="prompt">' + sequence.map(function (i) { return symbols[i]; }).join(" → ") + "</p>"
      + '<div class="word-grid" id="ppGrid" style="grid-template-columns:repeat(3,1fr);"></div>'
    );
    speak(t("picturePath") + ". " + sequence.map(function (i) { return names[i]; }).join(", "));

    var grid = document.getElementById("ppGrid");
    [0, 1, 2, 3, 4, 5].sort(function () { return Math.random() - 0.5; }).forEach(function (index) {
      var card = document.createElement("div");
      card.className = "word-card";
      card.style.fontSize = "26px";
      card.textContent = symbols[index];

      card.addEventListener("click", function () {
        if (index === sequence[step]) {
          card.classList.add("correct");
          step += 1;
          if (step === sequence.length) {
            var score = Math.max(50, 100 - wrong * 10);
            setTimeout(function () { finishGame("Picture Path", score); }, 400);
          }
        } else {
          card.classList.add("wrong");
          wrong += 1;
          speak(t("tryAgain"));
          setTimeout(function () { card.classList.remove("wrong"); }, 400);
        }
      });
      grid.appendChild(card);
    });
  }

  function launchGame(key) {
    if (key === "word") startWordGarden();
    else if (key === "memory") startMemoryMatch();
    else startPicturePath();
  }
  window.launchGame = launchGame;

  function finishGame(name, score) {
    var duration = Math.max(30, Math.round((Date.now() - sessionStartedAt) / 1000));
    var message = score >= 90 ? t("excellent") : score >= 70 ? t("steady") : t("keepGoing");

    openModal(
      "<h3>" + t("sessionComplete") + "</h3>"
      + '<p class="sub sans">' + localisedGameName(name) + "</p>"
      + '<div class="result-score">' + score + "%</div>"
      + '<p class="sub sans">' + message + "</p>"
      + '<button class="btn full" id="doneBtn" type="button">' + t("done") + "</button>"
    );
    speak(t("sessionComplete") + " " + score + ". " + message);

    document.getElementById("doneBtn").addEventListener("click", async function () {
      this.disabled = true;
      closeModal();
      bump("avgCard"); bump("minsCard"); bump("bestCard");

      try {
        await MB.api("/api/scores", {
          method: "POST",
          body: JSON.stringify({ name: name, score: score, attempts: 1, durationSeconds: duration })
        });
        await loadSummary(true);
      } catch (error) {
        handleError(error);
      }
    });
  }

  document.getElementById("startBtn").addEventListener("click", function () {
    var name = state.profile ? state.profile.patientName : "";
    openModal(
      "<h3>" + t("chooseSession") + "</h3>"
      + '<p class="sub sans">' + t("chooseSessionSub", { name: MB.escapeHtml(name) }) + "</p>"
      + '<div style="display:flex;flex-direction:column;gap:10px;">'
      + '<button class="btn full" type="button" onclick="launchGame(\'word\')">🌱 ' + t("wordGarden") + " — " + t("language") + "</button>"
      + '<button class="btn full" type="button" onclick="launchGame(\'memory\')">🧠 ' + t("memoryMatch") + " — " + t("memory") + "</button>"
      + '<button class="btn full" type="button" onclick="launchGame(\'picture\')">🔍 ' + t("picturePath") + " — " + t("focus") + "</button>"
      + "</div>"
    );
    speak(t("chooseSession"));
  });

  /* ============================================================ loading */

  function handleError(error) {
    if (error && error.expired) {
      MB.session.clear();
      window.location.replace("index.html");
      return;
    }
    var pill = document.getElementById("syncPill");
    pill.classList.add("offline");
    MB.setText("syncLabel", t("offline"));
    console.error(error);
  }

  function markSynced() {
    var pill = document.getElementById("syncPill");
    pill.classList.remove("offline");
    MB.setText("syncLabel", t("synced"));
  }

  async function loadSummary(animate) {
    var summary = await MB.api("/api/summary?days=7");
    state.summary = summary;
    state.profile = summary.profile;

    applyLanguage(summary.profile.language);
    renderProfile(summary.profile);
    renderStats(summary.totals);
    renderBars(summary.series, Boolean(animate));
    renderWellbeing(summary.wellbeing, summary.series);
    renderActivity(summary.recent);
    markSynced();
  }

  async function loadAlerts() {
    state.alerts = await MB.api("/api/alerts");
    renderAlerts(state.alerts);
  }

  document.getElementById("logoutBtn").addEventListener("click", MB.signOut);

  /* ============================================================ MINDBRIDGE AI CHAT */

  var aiChatForm = document.getElementById("aiChatForm");
  var aiChatInput = document.getElementById("aiChatInput");
  var aiChatMessages = document.getElementById("aiChatMessages");
  var aiChatSend = document.getElementById("aiChatSend");

  function addAIMessage(text, type) {
    var message = document.createElement("div");
    message.className = type === "user" ? "user-message" : "ai-message";
    message.textContent = text;
    aiChatMessages.appendChild(message);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  }

  if (aiChatForm) {
    aiChatForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      var message = aiChatInput.value.trim();
      if (!message) return;

      addAIMessage(message, "user");
      aiChatInput.value = "";
      aiChatInput.disabled = true;
      aiChatSend.disabled = true;

      var thinking = document.createElement("div");
      thinking.className = "ai-message";
      thinking.textContent = "Thinking...";
      aiChatMessages.appendChild(thinking);

      try {
        var result = await MB.api("/api/ai/chat", {
          method: "POST",
          body: JSON.stringify({ message: message })
        });
        thinking.remove();
        addAIMessage(result.reply, "ai");
        speak(result.reply);
      } catch (error) {
        thinking.remove();
        addAIMessage("I'm having trouble connecting. Please try again.", "ai");
        handleError(error);
      } finally {
        aiChatInput.disabled = false;
        aiChatSend.disabled = false;
        aiChatInput.focus();
      }
    });
  }

  (async function boot() {
    try {
      await loadSummary(false);
      await loadAlerts();
    } catch (error) {
      handleError(error);
    }
  })();
})();
