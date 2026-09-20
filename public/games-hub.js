/* ============================================================================
   MindBridge — Games Hub.

   Owns everything between "patient taps Start Games" and "score lands in
   Supabase":

     • the game menu, with locks and last scores
     • the 80% progression gate (5 levels per game, 3 tiers)
     • adaptive difficulty from the last 3 plays of each game
     • coins, streaks and badges
     • window.saveGameScore(), which posts to POST /api/scores

   Depends on app.js (window.MB) and, when present, offline.js
   (window.offlineManager). Loads after both.
   ==========================================================================*/

(function (global) {
  "use strict";

  var STORE_KEY = "mindbridge_games_v1";
  var LEVELS_PER_GAME = 5;
  var PASS_MARK = 80;

  /* ------------------------------------------------------------ catalogue */

  var GAMES = [
    /* EASY */
    { id: "sequence-recall", name: "Sequence Recall", tier: "easy", icon: "🎨",
      blurb: "Repeat the colours in order", trains: "Working memory",
      file: "games/sequence-recall.html", minutes: "3–5 min" },
    { id: "memory-grid", name: "Memory Grid", tier: "easy", icon: "🃏",
      blurb: "Turn over cards and find the pairs", trains: "Episodic memory",
      file: "games/memory-grid.html", minutes: "2–4 min" },
    { id: "slow-spotter", name: "Slow Motion Spotter", tier: "easy", icon: "🔍",
      blurb: "Spot the matching picture", trains: "Attention",
      file: "games/slow-spotter.html", minutes: "3–5 min" },
    { id: "number-ladder", name: "Number Ladder", tier: "easy", icon: "🔢",
      blurb: "Tap the numbers in order", trains: "Sequencing",
      file: "games/number-ladder.html", minutes: "2–3 min" },
    { id: "sound-story", name: "Sound Story", tier: "easy", icon: "👂",
      blurb: "Listen, then repeat the words", trains: "Auditory memory",
      file: "games/sound-story.html", minutes: "2–3 min" },

    /* MEDIUM */
    { id: "pattern-master", name: "Pattern Master", tier: "medium", icon: "🔷",
      blurb: "Work out what comes next", trains: "Reasoning",
      file: "games/pattern-master.html", minutes: "4–5 min" },
    { id: "location-link", name: "Location Link", tier: "medium", icon: "🏠",
      blurb: "Remember where each object belongs", trains: "Spatial memory",
      file: "games/location-link.html", minutes: "5–7 min" },
    { id: "speed-reaction", name: "Speed Reaction", tier: "medium", icon: "⚡",
      blurb: "Tap the target as fast as you can", trains: "Speed of processing",
      file: "games/speed-reaction.html", minutes: "4–5 min" },
    { id: "story-sequence", name: "Story Sequence", tier: "medium", icon: "📖",
      blurb: "Put the story in the right order", trains: "Narrative memory",
      file: "games/story-sequence.html", minutes: "4–5 min" },
    { id: "word-association", name: "Word Association", tier: "medium", icon: "💬",
      blurb: "Match the words that belong together", trains: "Semantic memory",
      file: "games/word-association.html", minutes: "3–4 min" },

    /* HARD */
    { id: "dual-task-master", name: "Dual Task Master", tier: "hard", icon: "🎯",
      blurb: "Listen and tap at the same time", trains: "Divided attention",
      file: "games/dual-task-master.html", minutes: "4–6 min" },
    { id: "advanced-location-link", name: "Advanced Location Link", tier: "hard", icon: "🗺️",
      blurb: "More objects, and a clock", trains: "Memory under pressure",
      file: "games/advanced-location-link.html", minutes: "6–8 min" },
    { id: "speed-perception", name: "Advanced Speed Reaction", tier: "hard", icon: "💨",
      blurb: "Smaller targets, faster pace", trains: "Speed of processing",
      file: "games/speed-perception.html", minutes: "4–5 min" },
    { id: "logic-puzzle", name: "Logic Puzzle", tier: "hard", icon: "🧩",
      blurb: "Reason your way to the answer", trains: "Complex reasoning",
      file: "games/logic-puzzle.html", minutes: "4–6 min" },
    { id: "mixed-challenge", name: "Mixed Challenge", tier: "hard", icon: "🌟",
      blurb: "Memory and speed together", trains: "Integrated thinking",
      file: "games/mixed-challenge.html", minutes: "5–7 min" }
  ];

  var TIERS = [
    { key: "easy",   label: "Easy",   note: "Build confidence" },
    { key: "medium", label: "Medium", note: "Challenge and variety" },
    { key: "hard",   label: "Hard",   note: "Deep training" }
  ];

  function byId(id) {
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
    return null;
  }

  /* --------------------------------------------------------------- store */

  function blank() {
    return { games: {}, coins: 0, streak: 0, lastPlayDay: null, badges: [], totalPlays: 0 };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? Object.assign(blank(), JSON.parse(raw)) : blank();
    } catch (e) { return blank(); }
  }

  function save(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { /* private mode: progress is in-memory only for this session */ }
  }

  function gameState(state, id) {
    if (!state.games[id]) {
      state.games[id] = { level: 1, cleared: 0, completed: false, best: 0, history: [], lastPlayed: null };
    }
    if (state.games[id].cleared >= LEVELS_PER_GAME) state.games[id].completed = true;
    return state.games[id];
  }

  /* ---------------------------------------------------------- progression */

  /* A tier opens when three games in the tier below have cleared level 3. */
  function tierUnlocked(state, tier) {
    if (tier === "easy") return true;
    var below = tier === "medium" ? "easy" : "medium";
    var ready = GAMES.filter(function (g) {
      return g.tier === below && gameState(state, g.id).cleared >= 3;
    }).length;
    return ready >= 3;
  }

  function tierProgressText(state, tier) {
    if (tier === "easy") return "";
    var below = tier === "medium" ? "easy" : "medium";
    var ready = GAMES.filter(function (g) {
      return g.tier === below && gameState(state, g.id).cleared >= 3;
    }).length;
    return "Clear level 3 in " + Math.max(0, 3 - ready) + " more " + below + " game" +
           (3 - ready === 1 ? "" : "s") + " to open this stage";
  }

  /* Adaptive nudge from the last three plays, per the roadmap's rule. */
  function adaptiveBoost(state, id) {
    var h = gameState(state, id).history.slice(-3);
    if (h.length < 3) return 0;
    var avg = h.reduce(function (a, b) { return a + b; }, 0) / h.length;
    if (avg > 85) return 1;
    if (avg < 60) return -1;
    return 0;
  }

  /* ------------------------------------------------------------- saving */

  /**
   * The single hook every game reports through.
   * Normalises the payload, writes it to Supabase, and updates local progress.
   */
  function saveGameScore(payload) {
    var state = load();
    var gs = gameState(state, payload.game_id);
    var score = Math.max(0, Math.min(100, Math.round(payload.score || 0)));

    /* --- local progression --- */
    gs.history.push(score);
    if (gs.history.length > 10) gs.history = gs.history.slice(-10);
    gs.best = Math.max(gs.best, score);
    gs.lastPlayed = new Date().toISOString();

    if (score >= PASS_MARK) {
      var playedLevel = payload.level || gs.level;
      gs.cleared = Math.max(gs.cleared, playedLevel);
      gs.completed = gs.completed || playedLevel >= LEVELS_PER_GAME;
      gs.level = Math.min(LEVELS_PER_GAME, playedLevel + 1);
    }

    state.coins += payload.coins_earned || (10 + (score >= 90 ? 5 : 0));
    state.totalPlays += 1;

    /* Day streak: consecutive calendar days with at least one game. */
    var today = new Date().toDateString();
    if (state.lastPlayDay !== today) {
      var yesterday = new Date(Date.now() - 86400000).toDateString();
      state.streak = state.lastPlayDay === yesterday ? state.streak + 1 : 1;
      state.lastPlayDay = today;
    }

    awardBadges(state);
    save(state);

    /* --- backend --- */
    var body = {
      name: payload.game_name,
      score: score,
      difficulty: payload.difficulty,
      durationSeconds: Math.max(1, Math.round(payload.time_spent_seconds || 0))
    };

    var persisted = Promise.resolve();

    if (global.MB && typeof global.MB.api === "function") {
      persisted = global.MB.api("/api/scores", {
        method: "POST",
        body: JSON.stringify(body)
      }).catch(function (err) {
        /* Network dropped mid-session: hand it to the offline queue so the
           caretaker still sees it once the device reconnects. */
        if (global.offlineManager) {
          return global.offlineManager.saveGameScore(
            payload.game_name, score, payload.difficulty, body.durationSeconds);
        }
        console.warn("Score not saved to server:", err && err.message);
        throw err;
      });
    } else if (global.offlineManager) {
      persisted = global.offlineManager.saveGameScore(
        payload.game_name, score, payload.difficulty, body.durationSeconds);
    }

    persisted.then(function () {
      /* patient.js listens for this to refresh the stats and activity list. */
      document.dispatchEvent(new CustomEvent("mb:game-saved", {
        detail: { payload: payload, saved: body, progress: state }
      }));
    }).catch(function () {
      document.dispatchEvent(new CustomEvent("mb:game-save-failed", {
        detail: { payload: payload }
      }));
    });

    return persisted;
  }

  function awardBadges(state) {
    var add = function (b) { if (state.badges.indexOf(b) === -1) state.badges.push(b); };
    if (state.totalPlays >= 1) add("First steps");
    if (state.totalPlays >= 10) add("Memory Master — 10 games played");
    if (state.totalPlays >= 25) add("Dedicated — 25 games played");
    if (state.streak >= 5) add("5-day streak");
    if (tierUnlocked(state, "medium")) add("Medium stage unlocked");
    if (tierUnlocked(state, "hard")) add("Hard stage unlocked");
  }

  /* ---------------------------------------------------------------- menu */

  var mount = null, onCloseHost = null;

  function openMenu(container, opts) {
    mount = container;
    onCloseHost = (opts && opts.onClose) || null;
    renderMenu();
  }

  function renderMenu() {
    var state = load();
    mount.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "mbh";

    /* --- summary strip --- */
    var head = document.createElement("div");
    head.className = "mbh-head";
    head.innerHTML =
      '<div><h3>Brain Games</h3>' +
      '<p class="mbh-sub">Score 80% or more to unlock the next level.</p></div>' +
      '<div class="mbh-tallies">' +
        '<span class="mbh-tally coins">🪙 ' + state.coins + '</span>' +
        '<span class="mbh-tally streak">🔥 ' + state.streak + '-day streak</span>' +
        '<span class="mbh-tally plays">🎮 ' + state.totalPlays + ' played</span>' +
      '</div>';
    wrap.appendChild(head);

    if (state.badges.length) {
      var badges = document.createElement("div");
      badges.className = "mbh-badges";
      state.badges.slice(-4).forEach(function (b) {
        var s = document.createElement("span");
        s.textContent = "🏅 " + b;
        badges.appendChild(s);
      });
      wrap.appendChild(badges);
    }

    /* --- tiers --- */
    TIERS.forEach(function (tier) {
      var open = tierUnlocked(state, tier.key);

      var section = document.createElement("section");
      section.className = "mbh-tier" + (open ? "" : " locked");

      var th = document.createElement("div");
      th.className = "mbh-tier-head";
      th.innerHTML = '<h4>' + tier.label + '</h4><span>' +
        (open ? tier.note : "🔒 " + tierProgressText(state, tier.key)) + '</span>';
      section.appendChild(th);

      var grid = document.createElement("div");
      grid.className = "mbh-grid";

      GAMES.filter(function (g) { return g.tier === tier.key; }).forEach(function (game) {
        grid.appendChild(gameCard(game, state, open));
      });

      section.appendChild(grid);
      wrap.appendChild(section);
    });

    mount.appendChild(wrap);
  }

  function gameCard(game, state, tierOpen) {
    var gs = gameState(state, game.id);
    var pct = Math.min(100, Math.round((gs.cleared / LEVELS_PER_GAME) * 100));
    var playable = tierOpen && !gs.completed;

    var card = document.createElement("button");
    card.type = "button";
    card.className = "mbh-card" + (tierOpen ? "" : " is-locked") +
      (gs.completed ? " is-complete" : "");
    card.disabled = !playable;

    var last = gs.history.length ? gs.history[gs.history.length - 1] : null;
    var lastLine = last === null
      ? "Not played yet"
      : "Last score " + last + "%" +
        (gs.lastPlayed ? " · " + relative(gs.lastPlayed) : "");

    card.innerHTML =
      '<span class="mbh-icon">' + game.icon + '</span>' +
      '<span class="mbh-body">' +
        '<strong>' + game.name + '</strong>' +
        '<span class="mbh-blurb">' + game.blurb + '</span>' +
        '<span class="mbh-meta">' + game.trains + ' · ' + game.minutes + '</span>' +
        '<span class="mbh-meta">' + lastLine + '</span>' +
        '<span class="mbh-progress"><i style="width:' + pct + '%"></i></span>' +
        '<span class="mbh-level">' +
          (!tierOpen ? "Locked" : gs.completed ? "✓ Game complete" :
            "Level " + gs.level + " of " + LEVELS_PER_GAME) +
        '</span>' +
      '</span>';

    if (playable) {
      card.addEventListener("click", function () { launch(game.id); });
    }
    return card;
  }

  function relative(iso) {
    var mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.round(hrs / 24);
    return days === 1 ? "yesterday" : days + "d ago";
  }

  /* -------------------------------------------------------------- launch */

  function launch(gameId) {
    var game = byId(gameId);
    if (!game) return;

    var state = load();
    var gs = gameState(state, gameId);
    if (gs.completed) return;
    var boost = adaptiveBoost(state, gameId);
    var session = "s-" + Date.now().toString(36) + "-" +
                  Math.random().toString(36).slice(2, 8);

    mount.innerHTML = "";

    var bar = document.createElement("div");
    bar.className = "mbh-playbar";
    bar.innerHTML = '<button type="button" class="mbh-back">← All games</button>' +
                    '<span>' + game.icon + ' ' + game.name +
                    ' · Level ' + gs.level + '</span>';
    bar.querySelector(".mbh-back").addEventListener("click", renderMenu);
    mount.appendChild(bar);

    var frame = document.createElement("iframe");
    frame.className = "mbh-frame";
    frame.title = game.name;
    frame.setAttribute("allow", "autoplay");
    frame.src = game.file +
      "?level=" + gs.level +
      "&boost=" + boost +
      "&session=" + encodeURIComponent(session);
    mount.appendChild(frame);
  }

  /* Games inside the iframe report upward through postMessage. */
  global.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "mb-game-score" && data.payload) {
      saveGameScore(data.payload);
    }

    if (data.type === "mb-game-exit") {
      if (mount) renderMenu();
    }
  });

  /* ----------------------------------------------------------------- api */

  /* Games loaded directly (not in the hub iframe) still find this hook. */
  if (typeof global.saveGameScore !== "function") {
    global.saveGameScore = saveGameScore;
  }

  global.MBGamesHub = {
    games: GAMES,
    open: openMenu,
    renderMenu: function () { if (mount) renderMenu(); },
    launch: launch,
    saveGameScore: saveGameScore,
    getProgress: load,
    resetProgress: function () { localStorage.removeItem(STORE_KEY); if (mount) renderMenu(); },
    tierUnlocked: function (tier) { return tierUnlocked(load(), tier); }
  };
})(window);
