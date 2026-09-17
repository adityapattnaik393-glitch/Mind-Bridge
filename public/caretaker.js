/* ============================================================================
   MindBridge — caretaker dashboard.
   Same session, same Supabase rows as the patient dashboard, read back as
   day-by-day progress, per-exercise strengths and a full session log.
   ==========================================================================*/

(function () {
  "use strict";

  if (!MB.requireSession()) return;

  var t = I18N.t;
  var days = 7;

  /* The drawer changes which already-rendered dashboard group is visible. */
  function setView(view) {
    document.querySelectorAll(".dashboard-view").forEach(function (section) {
      section.hidden = section.dataset.view !== view;
    });
    document.querySelectorAll(".drawer-link").forEach(function (link) {
      var active = link.dataset.viewTarget === view;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function closeDrawer() {
    document.getElementById("dashboardDrawer").classList.remove("open");
    document.getElementById("drawerOverlay").classList.remove("show");
    document.getElementById("dashboardDrawer").setAttribute("aria-hidden", "true");
    document.getElementById("menuBtn").setAttribute("aria-expanded", "false");
  }

  function openDrawer() {
    document.getElementById("dashboardDrawer").classList.add("open");
    document.getElementById("drawerOverlay").classList.add("show");
    document.getElementById("dashboardDrawer").setAttribute("aria-hidden", "false");
    document.getElementById("menuBtn").setAttribute("aria-expanded", "true");
    document.getElementById("drawerClose").focus();
  }

  function giftFeedback(message, isError) {
    var feedback = document.getElementById("giftFeedback");
    feedback.textContent = message;
    feedback.classList.toggle("error", Boolean(isError));
  }

  function fileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function saveGift(file, type) {
    if (!file) return;
    giftFeedback("Saving gift...", false);
    try {
      await MB.api("/api/gifts", { method: "POST", body: JSON.stringify({
        type: type, fileName: file.name || (type + "-gift"), mimeType: file.type,
        mediaData: await fileAsDataUrl(file)
      }) });
      giftFeedback("Gift saved. It will appear locked until the patient reaches 90%.", false);
      document.getElementById(type === "audio" ? "recordingStatus" : "photoStatus").textContent =
        type === "audio" ? "Audio gift saved." : "Photo gift saved.";
    } catch (error) {
      giftFeedback(error.message || "The gift could not be saved.", true);
    }
  }

  var recorder;
  var recordingChunks = [];
  var recordButton = document.getElementById("recordGiftBtn");
  recordButton.addEventListener("click", async function () {
    if (recorder && recorder.state === "recording") { recorder.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      giftFeedback("Voice recording is not supported in this browser. Choose an audio file instead.", true);
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      var mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find(function (type) {
        return MediaRecorder.isTypeSupported(type);
      }) || "";
      recorder = new MediaRecorder(stream, mimeType ? { mimeType: mimeType } : undefined);
      recordingChunks = [];
      recorder.ondataavailable = function (event) { if (event.data.size) recordingChunks.push(event.data); };
      recorder.onstop = function () {
        stream.getTracks().forEach(function (track) { track.stop(); });
        var blob = new Blob(recordingChunks, { type: recorder.mimeType || "audio/webm" });
        saveGift(new File([blob], "voice-gift.webm", { type: blob.type }), "audio");
        document.getElementById("recordingStatus").textContent = "Recording saved.";
        recordButton.textContent = "Record voice";
      };
      recorder.start();
      recordButton.textContent = "Stop recording";
      document.getElementById("recordingStatus").textContent = "Recording... tap Stop recording when finished.";
    } catch (error) {
      giftFeedback("Microphone access is needed to record a voice gift.", true);
    }
  });
  document.getElementById("audioGiftInput").addEventListener("change", function () { saveGift(this.files[0], "audio"); });
  document.getElementById("photoGiftInput").addEventListener("change", function () { saveGift(this.files[0], "photo"); });

  /* ============================================================ rendering */

  function renderHero(profile) {
    MB.setText("caretakerName", profile.caretakerName);
    MB.setText("metaPatient", "👤 Caring for " + profile.patientName + ", " + profile.age);
    MB.setText("metaEmail", "✉ " + profile.email);
    MB.setText("metaLanguage", "🌐 " + profile.language.native);
    MB.setText("greetTime", MB.greeting() + " — caretaker dashboard");
  }

  function renderStats(totals) {
    MB.setText("statSessions", totals.sessionsInWindow);
    MB.setText("statSessionsLbl", "Sessions · last " + days + " days");
    MB.setText("statAverage", totals.avgScore + "%");
    MB.setText("statMinutes", totals.minutesInWindow);
    MB.setText("statActiveDays", totals.activeDays + " / " + days);
    MB.setText("statActiveDaysLbl", "Days practised · streak " + totals.streak);
    MB.setText("streakNum", totals.streak);
  }

  function renderBars(series) {
    /* Long ranges get thinner labels so 30 days still fits the panel. */
    var compact = series.length > 10;
    document.getElementById("dailyChartSub").textContent =
      "Average score per day · last " + days + " days";

    document.getElementById("barsWrap").innerHTML = series.map(function (day) {
      var empty = day.sessions === 0;
      var gold = day.avgScore >= 95;
      var height = empty ? 4 : Math.max(day.avgScore, 6);
      var classes = ["bar"];
      if (empty) classes.push("empty");
      else if (gold) classes.push("gold");

      var label = compact ? day.dateLabel.split(" ")[0] : day.label;
      var value = compact ? "" : (empty ? "—" : day.avgScore + "%");

      return '<div class="bar-col" title="' + MB.escapeHtml(day.dateLabel + " · " + day.sessions + " session(s)") + '">'
        + '<span class="bar-val">' + value + "</span>"
        + '<div class="bar-track"><div class="' + classes.join(" ") + '" style="height:' + height + '%"></div></div>'
        + '<span class="bar-day' + (day.isToday ? " today" : "") + '">' + MB.escapeHtml(label) + "</span>"
        + "</div>";
    }).join("");
  }

  var CIRCUMFERENCE = 2 * Math.PI * 72;

  function renderWellbeing(wellbeing) {
    document.getElementById("donutRing").style.strokeDashoffset =
      CIRCUMFERENCE * (1 - wellbeing.score / 100);
    MB.setText("wellbeingNum", wellbeing.score);

    var trendTag = wellbeing.trend > 1
      ? '<span class="tag alt">Improving ' + Math.round(wellbeing.trend) + " pts</span>"
      : wellbeing.trend < -1
        ? '<span class="tag warn">Down ' + Math.abs(Math.round(wellbeing.trend)) + " pts</span>"
        : '<span class="tag">Holding steady</span>';

    document.getElementById("tagsWrap").innerHTML = [
      wellbeing.score >= 75
        ? '<span class="tag alt">Stable</span>'
        : '<span class="tag warn">Needs support</span>',
      trendTag,
      wellbeing.score >= 70
        ? '<span class="tag alt">Mood positive</span>'
        : '<span class="tag warn">Watch closely</span>'
    ].join("");
  }

  var METER_TONE = { Memory: "", Language: "green", Focus: "amber" };

  function renderBreakdown(breakdown, totals) {
    var wrap = document.getElementById("breakdownWrap");
    if (!breakdown.length) {
      wrap.innerHTML = '<p class="empty-state">No sessions recorded yet.</p>';
      return;
    }

    var meters = breakdown.map(function (item) {
      var tone = METER_TONE[item.category] || "";
      return '<div class="meter-row">'
        + '<div class="meter-head">'
        + '<span class="name">' + MB.escapeHtml(item.category) + "</span>"
        + '<span class="value">' + item.avgScore + "% avg · " + item.sessions + " sessions · best " + item.bestScore + "%</span>"
        + "</div>"
        + '<div class="meter ' + tone + '"><span style="width:' + item.avgScore + '%"></span></div>'
        + "</div>";
    }).join("");

    /* Plain-language takeaway for the caretaker. */
    var ranked = breakdown.slice().sort(function (a, b) { return b.avgScore - a.avgScore; });
    var strongest = ranked[0];
    var weakest = ranked[ranked.length - 1];

    var insight = '<div class="insight">'
      + "<p>Strongest area: <strong>" + MB.escapeHtml(strongest.category)
      + "</strong> at " + strongest.avgScore + "% average.</p>";

    if (ranked.length > 1 && strongest.category !== weakest.category) {
      insight += "<p>Most room to grow: <strong>" + MB.escapeHtml(weakest.category)
        + "</strong> at " + weakest.avgScore + "% — worth one extra session a day.</p>";
    }

    insight += "<p>" + totals.sessions + " sessions all time · "
      + totals.avgScoreAllTime + "% lifetime average · "
      + totals.minutesTotal + " minutes of practice.</p></div>";

    wrap.innerHTML = meters + insight;
  }

  function renderDayTable(series) {
    var body = document.getElementById("dayTableBody");
    var rows = series.slice().reverse();

    document.getElementById("dayTableSub").textContent =
      "Sessions, average and best score · last " + days + " days";

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5">No activity recorded.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (day) {
      if (day.sessions === 0) {
        return "<tr" + (day.isToday ? ' class="today-row"' : "") + ">"
          + "<td>" + MB.escapeHtml(day.dateLabel) + (day.isToday ? " · today" : "") + "</td>"
          + '<td colspan="4" style="color:var(--ink-faint);">No session</td></tr>';
      }
      return "<tr" + (day.isToday ? ' class="today-row"' : "") + ">"
        + "<td>" + MB.escapeHtml(day.dateLabel) + (day.isToday ? " · today" : "") + "</td>"
        + '<td class="strong">' + day.sessions + "</td>"
        + '<td><span class="score-chip ' + MB.scoreClass(day.avgScore) + '">' + day.avgScore + "%</span></td>"
        + "<td>" + day.bestScore + "%</td>"
        + "<td>" + day.minutes + " min</td>"
        + "</tr>";
    }).join("");
  }

  function renderSessionTable(recent) {
    var body = document.getElementById("sessionTableBody");
    if (!recent.length) {
      body.innerHTML = '<tr><td colspan="5">No sessions saved yet. Start one from the patient dashboard.</td></tr>';
      return;
    }

    body.innerHTML = recent.map(function (row) {
      var meta = MB.gameMeta(row.game_type);
      var when = new Date(row.created_at).toLocaleString("en-GB", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
      });
      return "<tr>"
        + "<td>" + MB.escapeHtml(when) + "</td>"
        + '<td class="strong">' + meta.emoji + " " + MB.escapeHtml(row.game_type) + "</td>"
        + "<td>" + MB.escapeHtml(row.category) + "</td>"
        + '<td><span class="score-chip ' + MB.scoreClass(row.score) + '">' + row.score + "%</span></td>"
        + "<td>" + row.attempts + "</td>"
        + "</tr>";
    }).join("");
  }

  function renderAlertLog(alerts) {
    var wrap = document.getElementById("alertLog");
    if (!alerts.logged.length) {
      wrap.innerHTML = '<p class="empty-state">No alerts acknowledged yet. Tap a reminder on the patient dashboard to log it here.</p>';
      return;
    }

    wrap.innerHTML = alerts.logged.map(function (alert) {
      return '<div class="alert-row">'
        + '<div class="alert-ic ok">✓</div>'
        + "<div>"
        + '<p class="alert-title">' + MB.escapeHtml(alert.title) + "</p>"
        + '<p class="alert-body">' + MB.escapeHtml(alert.body) + " · " + MB.escapeHtml(alert.status) + "</p>"
        + '<p class="alert-time">' + MB.relativeTime(alert.createdAt) + "</p>"
        + "</div></div>";
    }).join("");
  }

  /* ============================================================== loading */

  function handleError(error) {
    if (error && error.expired) {
      MB.session.clear();
      window.location.replace("index.html");
      return;
    }
    var pill = document.getElementById("syncPill");
    pill.classList.add("offline");
    MB.setText("syncLabel", "Offline");
    console.error(error);
  }

  async function load() {
    try {
      var summary = await MB.api("/api/summary?days=" + days);

      /* The caretaker view stays in the chosen language for the tagline and
         nav, but its analytics labels stay in English for clinical clarity. */
      I18N.setLanguage(summary.profile.language.code, summary.profile.language.speech);
      MB.setText("tagline", t("tagline"));

      renderHero(summary.profile);
      renderStats(summary.totals);
      renderBars(summary.series);
      renderWellbeing(summary.wellbeing);
      renderBreakdown(summary.breakdown, summary.totals);
      renderDayTable(summary.series);
      renderSessionTable(summary.recent);

      var alerts = await MB.api("/api/alerts");
      renderAlertLog(alerts);

      document.getElementById("syncPill").classList.remove("offline");
      MB.setText("syncLabel", "Synced");
    } catch (error) {
      handleError(error);
    }
  }

  document.getElementById("rangePicker").addEventListener("click", function (event) {
    var button = event.target.closest("button[data-days]");
    if (!button) return;
    days = Number(button.dataset.days);
    Array.prototype.forEach.call(this.querySelectorAll("button"), function (other) {
      other.classList.toggle("active", other === button);
    });
    load();
  });

  document.getElementById("menuBtn").addEventListener("click", openDrawer);
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("drawerOverlay").addEventListener("click", closeDrawer);
  document.querySelectorAll(".drawer-link").forEach(function (link) {
    link.addEventListener("click", function () {
      setView(link.dataset.viewTarget);
      closeDrawer();
    });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeDrawer();
  });
  setView("home");

  document.getElementById("logoutBtn").addEventListener("click", MB.signOut);

  load();
  window.setInterval(load, 60000);
})();
