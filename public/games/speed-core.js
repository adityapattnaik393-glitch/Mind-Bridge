/* ============================================================================
   Speed of processing — shared engine for the medium and hard variants.
   Modelled on the ACTIVE trial's speed-of-processing training: a stream of
   stimuli appears briefly and the player responds only to the target.

   medium : respond to one colour.
   hard   : respond to a colour AND shape together (a conjunction target),
            with a second stimulus sometimes appearing off-centre.

   Call MBSpeed.start({ variant: "medium" | "hard" }).
   ==========================================================================*/

(function (global) {
  "use strict";

  var COLORS = [
    { name: "green",  hex: "#3E9B6E" },
    { name: "blue",   hex: "#2F6FB0" },
    { name: "amber",  hex: "#DE9A34" },
    { name: "purple", hex: "#6B4E9B" },
    { name: "red",    hex: "#B3453A" }
  ];

  var SHAPES = ["circle", "square", "triangle"];

  function start(opts) {
    var hard = opts.variant === "hard";

    var g = MBGame.init({
      id: hard ? "speed-perception" : "speed-reaction",
      name: hard ? "Advanced Speed Reaction" : "Speed Reaction",
      difficulty: hard ? "hard" : "medium",
      maxRaw: 115,
      howTo: hard
        ? "Shapes flash by quickly. Tap only when you see the exact target — " +
          "the right colour AND the right shape together. Ignore everything else."
        : "Coloured squares flash by. Tap only when you see the target colour. " +
          "Ignore the other colours. Go as fast as you can.",
      example: hard ? "If the target is a green circle, ignore green squares."
                    : "If the target is green, tap only the green squares.",
      voiceLine: "Tap as fast as you can when you see the target."
    });

    /* -------------------------------------------------------- parameters */
    var size    = hard
      ? g.clamp(70 - (g.level - 1) * 5 - g.boost * 6, 50, 70)
      : g.clamp(100 - (g.level - 1) * 7 - g.boost * 8, 60, 100);

    /* Interval between stimuli, in ms. Hard is roughly 3 per second. */
    var interval = hard
      ? g.clamp(420 - (g.level - 1) * 30 - g.boost * 40, 260, 420)
      : g.clamp(650 - (g.level - 1) * 50 - g.boost * 60, 380, 650);

    var visibleMs = Math.round(interval * 0.72);
    var TRIALS  = hard ? 40 : 30;
    var targetRate = 0.35;

    var target = g.pick(COLORS);
    var targetShape = hard ? g.pick(SHAPES) : null;

    var trial = 0, hits = 0, misses = 0, falseAlarms = 0, targets = 0;
    var reactionTimes = [];
    var shownAt = 0, isTarget = false, responded = true;
    var loop = null, hideTimer = null;

    function svg(shape, hex, px) {
      var half = px / 2, body;
      if (shape === "circle") {
        body = '<circle cx="' + half + '" cy="' + half + '" r="' + (half - 2) + '" fill="' + hex + '"/>';
      } else if (shape === "square") {
        body = '<rect x="2" y="2" width="' + (px - 4) + '" height="' + (px - 4) +
               '" rx="8" fill="' + hex + '"/>';
      } else {
        body = '<polygon points="' + half + ',2 ' + (px - 2) + ',' + (px - 3) + ' 2,' + (px - 3) +
               '" fill="' + hex + '"/>';
      }
      return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + ' ' + px + '">' +
             body + '</svg>';
    }

    function layout() {
      g.stage.innerHTML = "";

      var label = hard
        ? "Tap only the " + target.name + " " + targetShape
        : "Tap only the " + target.name + " squares";

      var prompt = g.el("p", "mb-prompt", label);
      g.stage.appendChild(prompt);

      var legend = g.el("div", "legend");
      legend.innerHTML = svg(targetShape || "square", target.hex, 44) +
        '<span>This is your target</span>';
      g.stage.appendChild(legend);

      var arena = g.el("div", "arena");
      arena.id = "arena";
      arena.setAttribute("role", "button");
      arena.setAttribute("tabindex", "0");
      arena.setAttribute("aria-label", "Tap here when you see the target");
      arena.innerHTML = '<div class="slot" id="slotC"></div>' +
                        '<div class="slot edge" id="slotE"></div>';
      arena.addEventListener("pointerdown", respond);
      arena.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); respond(); }
      });
      g.stage.appendChild(arena);

      var sub = g.el("p", "mb-sub", "Tap the big area below when the target appears");
      sub.id = "sub";
      g.stage.appendChild(sub);
    }

    function clearSlots() {
      document.getElementById("slotC").innerHTML = "";
      var e = document.getElementById("slotE");
      e.innerHTML = "";
      e.style.left = ""; e.style.top = "";
    }

    function nextTrial() {
      /* A target that was never tapped counts as a miss. */
      if (isTarget && !responded) misses++;

      clearSlots();
      if (trial >= TRIALS) return endRun();
      trial++;
      g.setProgress(trial + " / " + TRIALS);

      isTarget = Math.random() < targetRate;
      responded = false;

      var color, shape;
      if (isTarget) {
        targets++;
        color = target;
        shape = targetShape || "square";
      } else {
        /* Hard also shows near-misses: right colour, wrong shape. */
        if (hard && Math.random() < 0.45) {
          color = target;
          shape = g.pick(SHAPES.filter(function (s) { return s !== targetShape; }));
        } else {
          color = g.pick(COLORS.filter(function (c) { return c.name !== target.name; }));
          shape = hard ? g.pick(SHAPES) : "square";
        }
      }

      var slot = document.getElementById("slotC");
      slot.innerHTML = svg(shape, color.hex, size);

      /* Hard occasionally places the stimulus off-centre to train the
         useful field of view, as in the ACTIVE protocol. */
      if (hard && Math.random() < 0.4) {
        var edge = document.getElementById("slotE");
        edge.innerHTML = slot.innerHTML;
        slot.innerHTML = "";
        var arena = document.getElementById("arena");
        edge.style.left = (10 + Math.random() * (arena.clientWidth - size - 20)) + "px";
        edge.style.top = (10 + Math.random() * (arena.clientHeight - size - 20)) + "px";
      }

      shownAt = Date.now();
      hideTimer = setTimeout(clearSlots, visibleMs);
    }

    function respond() {
      if (responded || trial === 0) return;
      responded = true;

      if (isTarget) {
        var rt = Date.now() - shownAt;
        reactionTimes.push(rt);
        hits++;
        g.addPoints(10);
        g.flash(rt < 600 ? "⚡ " + rt + "ms — quick!" : "Got it — " + rt + "ms", "ok");
        g.tone(820, 90);
      } else {
        falseAlarms++;
        g.addPoints(-5);                 /* spec: -5 per false positive */
        g.flash("That wasn't the target", "no");
        g.tone(200, 140, "triangle");
      }
    }

    function endRun() {
      clearInterval(loop);
      clearTimeout(hideTimer);

      var accuracy = targets
        ? Math.round((hits / (targets + falseAlarms)) * 100)
        : 0;

      var avg = reactionTimes.length
        ? Math.round(reactionTimes.reduce(function (a, b) { return a + b; }, 0) /
                     reactionTimes.length)
        : 0;

      /* Raw points: 10 per hit, minus 5 per false alarm, capped by the
         number of targets that actually appeared, then the speed bonus. */
      var perfect = hits === targets && falseAlarms === 0;

      /* Normalise against what a perfect run on this stream was worth, THEN
         add the speed bonus — otherwise the bonus is scaled away and a
         flawless fast run lands short of 100. */
      var possible = Math.max(10, targets * 10);
      var raw = Math.round((Math.max(0, hits * 10 - falseAlarms * 5) / possible) * 100);
      if (perfect && avg && avg < 700) raw += 15;

      /* Reaction time trend: did the second half beat the first? */
      var half = Math.floor(reactionTimes.length / 2);
      var firstHalf = reactionTimes.slice(0, half);
      var lastHalf = reactionTimes.slice(half);
      var mean = function (a) {
        return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0;
      };
      var improved = half > 0 && mean(lastHalf) < mean(firstHalf);

      g.finish({
        raw: raw,
        accuracy: accuracy,
        metrics: {
          targets_shown: targets,
          targets_detected: hits,
          missed_targets: misses,
          false_alarms: falseAlarms,
          avg_reaction_time_ms: avg,
          reaction_time_improving: improved,
          stimulus_interval_ms: interval
        },
        tooEasy: accuracy > 90 && avg > 0 && avg < 500,
        tooHard: accuracy < 70,
        verdict: perfect ? "Lightning reactions!" :
                 accuracy >= 80 ? (improved ? "You're getting faster!" : "Sharp work!") :
                 "Good effort"
      });
    }

    g.intro(function () {
      layout();
      g.say(hard
        ? "Tap only when you see the " + target.name + " " + targetShape
        : "Tap the " + target.name + " squares. Tap as fast as you can.");

      /* A short lead-in so the first stimulus is not a surprise. */
      var countIn = 3;
      document.getElementById("sub").textContent = "Starting in " + countIn + "…";
      var ci = setInterval(function () {
        countIn--;
        if (countIn > 0) {
          document.getElementById("sub").textContent = "Starting in " + countIn + "…";
          g.tone(480, 90);
        } else {
          clearInterval(ci);
          document.getElementById("sub").textContent = "Tap the area above when you see the target";
          g.tone(760, 160);
          nextTrial();
          loop = setInterval(nextTrial, interval);
        }
      }, 800);
    });
  }

  global.MBSpeed = { start: start };
})(window);
