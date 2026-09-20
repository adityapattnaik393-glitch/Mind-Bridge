/* ============================================================================
   MindBridge Games — shared kit.
   Every game in /public/games/ builds on this. No external dependencies.

   A game does three things:
     1. MBGame.init({...})   -> builds the shell, returns the api
     2. api.stage            -> draw the round into this element
     3. api.finish({...})    -> ends the run and reports the score upward

   Reporting path:
     iframe  -> postMessage('mb-game-score') -> games-hub.js -> window.saveGameScore
     direct  -> window.saveGameScore (if the page defines it)
   ==========================================================================*/

(function (global) {
  "use strict";

  var VOICE_KEY = "mindbridge_voice_on";

  /* --------------------------------------------------------------- helpers */

  function qs(name, fallback) {
    var v = new URLSearchParams(global.location.search).get(name);
    return v === null ? fallback : v;
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(list, n) { return shuffle(list).slice(0, n); }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ------------------------------------------------------------ sound tone */
  /* Short WebAudio beeps. No audio files, so nothing to download. */

  var audioCtx = null;
  function tone(freq, ms, type) {
    try {
      if (!audioCtx) {
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + ms / 1000);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + ms / 1000 + 0.02);
    } catch (e) { /* audio is a nicety, never a blocker */ }
  }

  /* ------------------------------------------------------------------ init */

  function init(config) {
    var cfg = Object.assign({
      id: "game",
      name: "Game",
      difficulty: "easy",
      howTo: "",
      example: "",
      voiceLine: "",
      maxRaw: 100          // raw points that represent a perfect run
    }, config);

    /* Level + adaptive nudge handed down by the hub through the URL. */
    var level = clamp(parseInt(qs("level", "1"), 10) || 1, 1, 5);
    var boost = clamp(parseInt(qs("boost", "0"), 10) || 0, -1, 1);
    var sessionId = qs("session", "");

    var voiceOn = localStorage.getItem(VOICE_KEY) !== "0";

    /* ------------------------------------------------------------- shell */
    document.body.innerHTML = "";
    var shell = el("div", "mb-shell");

    var head = el("div", "mb-head");
    var title = el("h1", "mb-title", cfg.name);
    var chipLevel = el("span", "mb-chip", "Level " + level);
    var chipScore = el("span", "mb-chip score", "0 pts");
    var chipProg = el("span", "mb-chip", "");
    var chipTime = el("span", "mb-chip timer", "0:00");

    var voiceBtn = el("button", "mb-voice");
    voiceBtn.type = "button";
    voiceBtn.textContent = "🔊";
    voiceBtn.title = "Voice narration";
    voiceBtn.setAttribute("aria-label", "Toggle voice narration");
    voiceBtn.setAttribute("aria-pressed", String(voiceOn));

    head.append(title, chipLevel, chipProg, chipScore, chipTime, voiceBtn);

    var bar = el("div", "mb-bar");
    var barFill = el("i");
    bar.appendChild(barFill);
    bar.classList.add("mb-hide");

    var panel = el("div", "mb-panel");
    var stage = el("div", "mb-stage");
    var toast = el("p", "mb-toast");
    panel.append(stage, toast);

    shell.append(head, bar, panel);
    document.body.appendChild(shell);

    /* ------------------------------------------------------------- voice */

    function say(text) {
      if (!voiceOn || !text || !global.speechSynthesis) return;
      try {
        global.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.rate = 0.88;          // slower: clearer for older adults
        u.pitch = 1;
        u.lang = document.documentElement.lang || "en-US";
        global.speechSynthesis.speak(u);
      } catch (e) { /* narration is optional by spec */ }
    }

    voiceBtn.addEventListener("click", function () {
      voiceOn = !voiceOn;
      localStorage.setItem(VOICE_KEY, voiceOn ? "1" : "0");
      voiceBtn.setAttribute("aria-pressed", String(voiceOn));
      voiceBtn.textContent = voiceOn ? "🔊" : "🔇";
      if (!voiceOn && global.speechSynthesis) global.speechSynthesis.cancel();
      else say("Voice is on.");
    });
    voiceBtn.textContent = voiceOn ? "🔊" : "🔇";

    /* ------------------------------------------------------------- timer */

    var startedAt = 0, tick = null;

    function fmt(s) {
      var m = Math.floor(s / 60);
      return m + ":" + String(s % 60).padStart(2, "0");
    }

    function startClock() {
      startedAt = Date.now();
      chipTime.textContent = "0:00";
      clearInterval(tick);
      tick = setInterval(function () {
        chipTime.textContent = fmt(elapsed());
      }, 500);
    }

    function elapsed() {
      return startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    }

    function stopClock() { clearInterval(tick); tick = null; }

    /* --------------------------------------------------------- countdown */
    /* Visual time bar for per-round limits. Always visible, never text-only. */

    var cdTimer = null;

    function countdown(ms, onExpire) {
      cancelCountdown();
      bar.classList.remove("mb-hide", "warn", "danger");
      var end = Date.now() + ms;
      barFill.style.width = "100%";
      cdTimer = setInterval(function () {
        var left = end - Date.now();
        var pct = clamp((left / ms) * 100, 0, 100);
        barFill.style.width = pct + "%";
        bar.classList.toggle("warn", pct < 50 && pct >= 22);
        bar.classList.toggle("danger", pct < 22);
        if (left <= 0) { cancelCountdown(); if (onExpire) onExpire(); }
      }, 60);
    }

    function cancelCountdown() {
      clearInterval(cdTimer); cdTimer = null;
      bar.classList.add("mb-hide");
    }

    /* ------------------------------------------------------------- hud */

    var points = 0;

    function addPoints(n) {
      points = Math.max(0, points + n);
      chipScore.textContent = points + " pts";
      chipScore.classList.add("mb-flash");
      setTimeout(function () { chipScore.classList.remove("mb-flash"); }, 380);
      return points;
    }

    function setProgress(text) { chipProg.textContent = text || ""; }

    function flash(msg, kind) {
      toast.className = "mb-toast " + (kind || "info");
      toast.textContent = msg || "";
      if (kind === "ok") tone(720, 160);
      if (kind === "no") tone(220, 220, "triangle");
    }

    /* ------------------------------------------------------- intro screen */

    function intro(onStart) {
      stage.innerHTML = "";
      var box = el("div", "mb-pop");
      box.appendChild(el("h2", null, "How to play"));
      box.appendChild(el("p", null, cfg.howTo));
      if (cfg.example) {
        var ex = el("p", "mb-sub", cfg.example);
        box.appendChild(ex);
      }
      var actions = el("div", "mb-actions");
      var go = el("button", "mb-btn", "Ready — start");
      go.type = "button";
      go.addEventListener("click", function () {
        flash("");
        startClock();
        onStart();
      });
      actions.appendChild(go);
      box.appendChild(actions);
      stage.appendChild(box);
      say(cfg.voiceLine || cfg.howTo);
    }

    /* ------------------------------------------------------------ finish */

    var done = false;

    /**
     * End the run.
     * @param {object} r
     *   r.raw       raw points earned (may exceed 100 — it is normalised here)
     *   r.accuracy  0-100
     *   r.metrics   extra per-game numbers
     *   r.tooEasy / r.tooHard  booleans for adaptive logic
     *   r.verdict   closing line shown to the player
     */
    function finish(r) {
      if (done) return;
      done = true;
      stopClock();
      cancelCountdown();
      if (global.speechSynthesis) global.speechSynthesis.cancel();

      var seconds = elapsed();
      var raw = Math.max(0, Math.round(r.raw != null ? r.raw : points));

      /* The database column is `check (score between 0 and 100)`, so raw
         points are normalised against a perfect run before saving. */
      var score = clamp(Math.round((raw / cfg.maxRaw) * 100), 0, 100);
      var accuracy = clamp(Math.round(r.accuracy != null ? r.accuracy : score), 0, 100);

      var passed = score >= 80;
      var coins = 10 + (score >= 90 ? 5 : 0);

      var nextLevel = score >= 80 ? "harder" : (score < 50 ? "easier" : "same");

      var payload = {
        game_id: cfg.id,
        game_name: cfg.name,
        difficulty: cfg.difficulty,
        level: level,
        score: score,
        max_score: 100,
        raw_points: raw,
        passed: passed,
        coins_earned: coins,
        time_spent_seconds: seconds,
        performance_metrics: Object.assign({
          accuracy: accuracy,
          speed_factor: Number((1 + boost * 0.25).toFixed(2))
        }, r.metrics || {}),
        adaptive_feedback: {
          was_too_easy: !!r.tooEasy,
          was_too_hard: !!r.tooHard,
          next_level: nextLevel
        },
        session_id: sessionId,
        timestamp: new Date().toISOString()
      };

      report(payload);
      showResult(payload, r.verdict);
    }

    function report(payload) {
      /* Inside the hub iframe. */
      try {
        if (global.parent && global.parent !== global) {
          global.parent.postMessage({ type: "mb-game-score", payload: payload }, "*");
        }
      } catch (e) { /* cross-origin parent: fall through */ }

      /* Standalone, or a host page that already defines the hook. */
      try {
        if (typeof global.saveGameScore === "function") {
          global.saveGameScore(payload);
        }
      } catch (e) {
        console.error("saveGameScore failed", e);
      }
    }

    function showResult(p, verdict) {
      cancelCountdown();
      stage.innerHTML = "";
      var box = el("div", "mb-result mb-pop");

      box.appendChild(el("p", "big", p.score + "%"));
      box.appendChild(el("p", "verdict",
        verdict || (p.passed ? "Well done!" : "Good effort — try once more")));
      box.appendChild(el("p", "note", p.passed
        ? "You cleared the 80% mark. The next level is unlocked."
        : "Reach 80% to unlock the next level."));
      box.appendChild(el("p", "note", "You earned " + p.coins_earned + " gold coins ✨"));

      var stats = el("div", "mb-stats");
      [["Accuracy", p.performance_metrics.accuracy + "%"],
       ["Time", fmt(p.time_spent_seconds)],
       ["Level", String(p.level)],
       ["Points", String(p.raw_points)]].forEach(function (pair) {
        var s = el("div", "mb-stat");
        s.appendChild(el("b", null, pair[1]));
        s.appendChild(el("span", null, pair[0]));
        stats.appendChild(s);
      });
      box.appendChild(stats);

      var actions = el("div", "mb-actions");

      var again = el("button", "mb-btn", "Play again");
      again.type = "button";
      again.addEventListener("click", function () { global.location.reload(); });
      actions.appendChild(again);

      var back = el("button", "mb-btn ghost", "Back to games");
      back.type = "button";
      back.addEventListener("click", function () {
        try {
          if (global.parent && global.parent !== global) {
            global.parent.postMessage({ type: "mb-game-exit" }, "*");
            return;
          }
        } catch (e) { /* ignore */ }
        history.length > 1 ? history.back() : (global.location.href = "../patient.html");
      });
      actions.appendChild(back);

      box.appendChild(actions);
      stage.appendChild(box);
      flash("");

      say(p.passed
        ? "Well done. You scored " + p.score + " percent."
        : "Good effort. You scored " + p.score + " percent. Try again to unlock the next level.");
      tone(p.passed ? 880 : 320, 300);
      if (p.passed) setTimeout(function () { tone(1180, 320); }, 180);
    }

    /* ------------------------------------------------------------- api */

    return {
      stage: stage,
      panel: panel,
      level: level,
      boost: boost,
      voice: function () { return voiceOn; },
      say: say,
      tone: tone,
      flash: flash,
      addPoints: addPoints,
      points: function () { return points; },
      setProgress: setProgress,
      countdown: countdown,
      cancelCountdown: cancelCountdown,
      elapsed: elapsed,
      startClock: startClock,
      intro: intro,
      finish: finish,
      /* re-exported helpers so games stay short */
      el: el, shuffle: shuffle, sample: sample, pick: pick,
      wait: wait, clamp: clamp
    };
  }

  global.MBGame = {
    init: init,
    shuffle: shuffle, sample: sample, pick: pick,
    el: el, wait: wait, clamp: clamp, tone: tone
  };
})(window);
