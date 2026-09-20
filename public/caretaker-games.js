/* ============================================================================
   MindBridge — caretaker game analytics.

   Adds a "Game Analytics" panel built from the existing /api/summary feed,
   so no new endpoint is needed. Also teaches MB.gameMeta about the 15 new
   games, so they show a proper icon and category in the existing session
   table instead of the generic fallback.

   Load in caretaker.html after caretaker.js.
   ==========================================================================*/

(function () {
  "use strict";

  /* ----------------------------------------------- teach MB.gameMeta the 15 */

  var META = {
    "Sequence Recall":          { emoji: "🎨", category: "Working Memory",     tier: "easy" },
    "Memory Grid":              { emoji: "🃏", category: "Episodic Memory",    tier: "easy" },
    "Slow Motion Spotter":      { emoji: "🔍", category: "Attention",          tier: "easy" },
    "Number Ladder":            { emoji: "🔢", category: "Sequencing",         tier: "easy" },
    "Sound Story":              { emoji: "👂", category: "Auditory Memory",    tier: "easy" },
    "Pattern Master":           { emoji: "🔷", category: "Reasoning",          tier: "medium" },
    "Location Link":            { emoji: "🏠", category: "Spatial Memory",     tier: "medium" },
    "Speed Reaction":           { emoji: "⚡", category: "Speed of Processing",tier: "medium" },
    "Story Sequence":           { emoji: "📖", category: "Narrative Memory",   tier: "medium" },
    "Word Association":         { emoji: "💬", category: "Semantic Memory",    tier: "medium" },
    "Dual Task Master":         { emoji: "🎯", category: "Divided Attention",  tier: "hard" },
    "Advanced Location Link":   { emoji: "🗺️", category: "Spatial Memory",     tier: "hard" },
    "Advanced Speed Reaction":  { emoji: "💨", category: "Speed of Processing",tier: "hard" },
    "Logic Puzzle":             { emoji: "🧩", category: "Complex Reasoning",  tier: "hard" },
    "Mixed Challenge":          { emoji: "🌟", category: "Integrated Thinking",tier: "hard" }
  };

  var GAME_NAMES = Object.keys(META);

  if (window.MB && typeof window.MB.gameMeta === "function") {
    var original = window.MB.gameMeta;
    window.MB.gameMeta = function (name) {
      if (META[name]) {
        return { emoji: META[name].emoji, category: META[name].category, key: "cognitive" };
      }
      return original(name);
    };
  }

  function meta(name) {
    return META[name] || { emoji: "✦", category: "Cognitive", tier: "—" };
  }

  function esc(v) {
    return (window.MB && window.MB.escapeHtml)
      ? window.MB.escapeHtml(v)
      : String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;",
                   '"': "&quot;", "'": "&#39;" }[c];
        });
  }

  /* --------------------------------------------------------------- panel */

  var rows = [];
  var filterGame = "all";
  var filterDays = 30;

  function mountPanel() {
    if (document.getElementById("gameAnalytics")) return;

    /* caretaker.html shows one `data-view` section at a time and toggles
       `hidden` on `.dashboard-view`. Sit beside the session table, inside
       the same view, and mirror its current visibility. */
    var anchor = document.getElementById("sessionTableBody");
    var host = anchor ? anchor.closest("section[data-view]") : null;
    var parent = host ? host.parentNode : (document.querySelector(".wrap") || document.body);

    var section = document.createElement("section");
    section.id = "gameAnalytics";

    if (host) {
      section.className = "grid1 dashboard-view";
      section.dataset.view = host.dataset.view;
      section.hidden = host.hidden;
    } else {
      section.className = "grid1";
    }
    section.innerHTML =
      '<div class="panel">' +
        '<div class="panel-head">' +
          '<div><h3>🎮 Game Analytics</h3>' +
          '<p class="sub">Cognitive sessions, scores and trend</p></div>' +
          '<span class="section-symbol">📈</span>' +
        '</div>' +
        '<div class="cg-status" id="cgStatus"></div>' +
        '<div class="cg-controls">' +
          '<select id="cgGame" aria-label="Filter by game"></select>' +
          '<select id="cgDays" aria-label="Filter by period">' +
            '<option value="7">Last 7 days</option>' +
            '<option value="30" selected>Last 30 days</option>' +
            '<option value="9999">All time</option>' +
          '</select>' +
          '<button type="button" id="cgExport" class="cg-export">Export CSV</button>' +
        '</div>' +
        '<div class="cg-chart" id="cgChart"></div>' +
        '<div class="cg-tablewrap"><table class="cg-table">' +
          '<thead><tr><th>Date</th><th>Game</th><th>Level</th>' +
          '<th>Score</th><th>Duration</th><th>Trend</th></tr></thead>' +
          '<tbody id="cgBody"></tbody>' +
        '</table></div>' +
      '</div>';

    if (host && host.nextSibling) parent.insertBefore(section, host.parentNode === parent ? host.nextSibling : null);
    else parent.appendChild(section);

    document.getElementById("cgGame").addEventListener("change", function () {
      filterGame = this.value; render();
    });
    document.getElementById("cgDays").addEventListener("change", function () {
      filterDays = Number(this.value); render();
    });
    document.getElementById("cgExport").addEventListener("click", exportCsv);
  }

  /* --------------------------------------------------------------- data */

  function normalise(recent) {
    return (recent || []).map(function (r) {
      return {
        name: r.game_name || r.game_type || "Unknown",
        score: Number(r.score) || 0,
        difficulty: r.difficulty || "easy",
        duration: Number(r.duration_seconds) || 0,
        at: new Date(r.created_at)
      };
    }).filter(function (r) {
      return GAME_NAMES.indexOf(r.name) !== -1;
    }).sort(function (a, b) { return b.at - a.at; });
  }

  function visible() {
    var cutoff = Date.now() - filterDays * 86400000;
    return rows.filter(function (r) {
      return (filterGame === "all" || r.name === filterGame) && r.at.getTime() >= cutoff;
    });
  }

  /* -------------------------------------------------------------- render */

  function render() {
    var list = visible();
    renderGameFilter();
    renderStatus(list);
    renderChart(list);
    renderTable(list);
  }

  function renderGameFilter() {
    var sel = document.getElementById("cgGame");
    if (sel.dataset.filled === "1") return;
    var names = GAME_NAMES.slice();
    sel.innerHTML = '<option value="all">All games</option>' +
      names.sort().map(function (n) {
        return '<option value="' + esc(n) + '">' + esc(n) + "</option>";
      }).join("");
    sel.dataset.filled = "1";
  }

  function renderStatus(list) {
    var box = document.getElementById("cgStatus");

    if (!list.length) {
      box.innerHTML = '<div class="cg-card"><b>No sessions yet</b>' +
        '<span>Scores appear here as soon as a game is finished.</span></div>';
      return;
    }

    var last = list[0];
    var tierOrder = { easy: 0, medium: 1, hard: 2 };
    var current = list.reduce(function (acc, r) {
      return tierOrder[r.difficulty] > tierOrder[acc] ? r.difficulty : acc;
    }, "easy");

    /* Baseline = the earliest five sessions in view; compare to the latest five. */
    var mean = function (a) {
      return a.length ? Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length) : 0;
    };
    var scores = list.map(function (r) { return r.score; });
    var recentMean = mean(scores.slice(0, 5));
    var baseMean = mean(scores.slice(-5));
    var delta = baseMean ? Math.round(((recentMean - baseMean) / baseMean) * 100) : 0;

    var daysSince = Math.floor((Date.now() - last.at.getTime()) / 86400000);
    var passes = list.filter(function (r) { return r.score >= 80; }).length;

    var cards = [
      { t: "Currently in", v: current.charAt(0).toUpperCase() + current.slice(1) + " difficulty",
        s: passes + " of " + list.length + " sessions at 80% or above" },
      { t: "Last game", v: meta(last.name).emoji + " " + last.name + " (" + last.score + "%)",
        s: daysSince === 0 ? "today" : daysSince + " day" + (daysSince === 1 ? "" : "s") + " ago" },
      { t: "Trend", v: (delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "– ") + delta + "%",
        s: "recent average " + recentMean + "% vs baseline " + baseMean + "%" }
    ];

    var alerts = [];
    if (delta <= -20) alerts.push("⚠️ Scores are more than 20% below baseline — possible setback.");
    if (daysSince >= 3) alerts.push("🔔 No games played for " + daysSince + " days — a reminder may help.");
    if (current !== "easy" && passes >= 3) alerts.push("🎉 " + current + " difficulty reached — worth celebrating.");

    box.innerHTML = cards.map(function (c) {
      return '<div class="cg-card"><span class="cg-t">' + esc(c.t) + "</span>" +
             "<b>" + esc(c.v) + "</b><span>" + esc(c.s) + "</span></div>";
    }).join("") +
    (alerts.length ? '<div class="cg-alerts">' + alerts.map(function (a) {
      return "<p>" + esc(a) + "</p>";
    }).join("") + "</div>" : "");
  }

  /* Inline SVG chart: score per session, with a rolling 7-session average. */
  function renderChart(list) {
    var box = document.getElementById("cgChart");
    var data = list.slice().reverse();

    if (data.length < 2) { box.innerHTML = ""; return; }

    var W = 680, H = 200, padL = 34, padB = 22, padT = 10, padR = 8;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var x = function (i) { return padL + (i / (data.length - 1)) * plotW; };
    var y = function (v) { return padT + (1 - v / 100) * plotH; };

    var gridlines = [0, 50, 80, 100].map(function (v) {
      return '<line x1="' + padL + '" y1="' + y(v) + '" x2="' + (W - padR) + '" y2="' + y(v) +
             '" stroke="' + (v === 80 ? "#3E9B6E" : "#E7E3D9") + '" stroke-width="1"' +
             (v === 80 ? ' stroke-dasharray="4 3"' : "") + "/>" +
             '<text x="4" y="' + (y(v) + 4) + '" font-size="11" fill="#9AA39D">' + v + "</text>";
    }).join("");

    var dots = data.map(function (d, i) {
      var color = d.score >= 80 ? "#3E9B6E" : (d.score >= 50 ? "#DE9A34" : "#B3453A");
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(d.score).toFixed(1) +
             '" r="4" fill="' + color + '"><title>' +
             esc(d.name + " — " + d.score + "% on " +
                 d.at.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })) +
             "</title></circle>";
    }).join("");

    var roll = data.map(function (_, i) {
      var win = data.slice(Math.max(0, i - 6), i + 1);
      var m = win.reduce(function (a, b) { return a + b.score; }, 0) / win.length;
      return x(i).toFixed(1) + "," + y(m).toFixed(1);
    }).join(" ");

    box.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" height="' + H +
      '" role="img" aria-label="Score per session over time">' +
      gridlines +
      '<polyline points="' + roll + '" fill="none" stroke="#155249" stroke-width="2.5" ' +
      'stroke-linejoin="round"/>' + dots +
      "</svg>" +
      '<p class="cg-legend">Each dot is one session — green 80% or above, amber 50–79%, ' +
      'red below 50%. The line is the rolling 7-session average.</p>';
  }

  function renderTable(list) {
    var body = document.getElementById("cgBody");

    if (!list.length) {
      body.innerHTML = '<tr><td colspan="6">No sessions in this period.</td></tr>';
      return;
    }

    body.innerHTML = list.map(function (r, i) {
      var prev = list[i + 1];
      var trend = !prev ? "–"
        : r.score > prev.score ? '<span class="cg-up">▲ +' + (r.score - prev.score) + "</span>"
        : r.score < prev.score ? '<span class="cg-down">▼ ' + (r.score - prev.score) + "</span>"
        : "–";

      var cls = r.score >= 80 ? "high" : (r.score >= 50 ? "mid" : "low");

      return "<tr>" +
        "<td>" + esc(r.at.toLocaleString("en-GB", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })) + "</td>" +
        '<td class="strong">' + meta(r.name).emoji + " " + esc(r.name) + "</td>" +
        "<td>" + esc(r.difficulty) + "</td>" +
        '<td><span class="score-chip ' + cls + '">' + r.score + "%</span></td>" +
        "<td>" + Math.round(r.duration / 60) + "m " + (r.duration % 60) + "s</td>" +
        "<td>" + trend + "</td>" +
        "</tr>";
    }).join("");
  }

  function exportCsv() {
    var list = visible();
    var lines = ["Date,Game,Level,Score,Duration (s)"];
    list.forEach(function (r) {
      lines.push([
        r.at.toISOString(),
        '"' + r.name.replace(/"/g, '""') + '"',
        r.difficulty, r.score, r.duration
      ].join(","));
    });

    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "mindbridge-games-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* --------------------------------------------------------------- boot */

  function refresh() {
    if (!window.MB || typeof window.MB.api !== "function") return;
    window.MB.api("/api/summary?days=90").then(function (summary) {
      rows = normalise(summary && summary.recent);
      mountPanel();
      render();
    }).catch(function (err) {
      console.warn("[MindBridge games] analytics unavailable:", err && err.message);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }

  window.MBGameAnalytics = { refresh: refresh };
})();
