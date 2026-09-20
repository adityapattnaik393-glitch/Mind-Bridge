/* ============================================================================
   Location Link — shared engine for the medium and hard variants.
   Based on the Cambridge "Game Show" paired-associate task: an object is
   shown in a location, then later the player must recall where it lived.

   Call MBLocationLink.start({ variant: "medium" | "hard" }).
   ==========================================================================*/

(function (global) {
  "use strict";

  var LOCATIONS = [
    { icon: "🏠", name: "the house",  color: "#E2ECF7" },
    { icon: "🚗", name: "the car",    color: "#E4F3EA" },
    { icon: "🌳", name: "the park",   color: "#FBEED9" },
    { icon: "🏢", name: "the office", color: "#EDE6F7" }
  ];

  var OBJECTS = [
    { icon: "🍎", name: "apple" },   { icon: "🔑", name: "key" },
    { icon: "📖", name: "book" },    { icon: "☂️", name: "umbrella" },
    { icon: "👓", name: "glasses" }, { icon: "☕", name: "cup" },
    { icon: "🧦", name: "sock" },    { icon: "✏️", name: "pencil" },
    { icon: "🕰️", name: "clock" },   { icon: "💐", name: "flowers" },
    { icon: "📱", name: "phone" },   { icon: "🧢", name: "hat" }
  ];

  function start(opts) {
    var hard = opts.variant === "hard";

    var g = MBGame.init({
      id: hard ? "advanced-location-link" : "location-link",
      name: hard ? "Advanced Location Link" : "Location Link",
      difficulty: hard ? "hard" : "medium",
      maxRaw: 110,
      howTo: "First you will be shown some objects, each sitting in one place. " +
             "Try to remember where each object belongs. Then each object comes " +
             "back on its own and you tap the place it came from." +
             (hard ? " This time there are more objects and a time limit." : ""),
      example: "If the apple was in the house, tap the house when the apple returns.",
      voiceLine: "Remember where each object belongs."
    });

    /* -------------------------------------------------------- parameters */
    var objectCount = hard
      ? g.clamp(7 + Math.floor((g.level - 1) / 2) + g.boost, 6, 9)
      : g.clamp(5 + Math.floor((g.level - 1) / 2) + g.boost, 4, 7);

    var showMs = hard
      ? g.clamp(2000 - (g.level - 1) * 150, 1200, 2000)
      : g.clamp(2800 - (g.level - 1) * 150, 1800, 2800);

    /* Hard adds a per-question time limit; medium has none. */
    var answerMs = hard ? g.clamp(6000 - (g.level - 1) * 400, 3500, 6000) : 0;

    /* Hard shows each object twice, so recall must survive interference. */
    var passes = hard ? 2 : 1;

    var pairs = [];      /* {object, locationIndex} */
    var quiz = [];
    var asked = 0, correct = 0, raw = 0, coins = 0;

    /* ------------------------------------------------------------- build */

    function layout() {
      g.stage.innerHTML = "";

      var prompt = g.el("p", "mb-prompt", "");
      prompt.id = "prompt";
      g.stage.appendChild(prompt);

      var objRow = g.el("div", "objrow");
      objRow.id = "objrow";
      g.stage.appendChild(objRow);

      var grid = g.el("div", "locgrid");
      grid.id = "locgrid";
      LOCATIONS.forEach(function (loc, i) {
        var b = g.el("button", "loc");
        b.type = "button";
        b.style.background = loc.color;
        b.dataset.index = String(i);
        b.setAttribute("aria-label", loc.name);
        b.innerHTML = '<span class="loc-icon">' + loc.icon + '</span>' +
                      '<span class="loc-name">' + loc.name + '</span>';
        b.addEventListener("click", function () { onPick(i, b); });
        grid.appendChild(b);
      });
      g.stage.appendChild(grid);

      var sub = g.el("p", "mb-sub", "");
      sub.id = "sub";
      g.stage.appendChild(sub);
    }

    function setPrompt(t) { document.getElementById("prompt").textContent = t; }
    function setSub(t) { document.getElementById("sub").textContent = t; }

    function lockLocations(state) {
      Array.prototype.forEach.call(
        document.getElementById("locgrid").children,
        function (b) { b.disabled = state; b.classList.toggle("dim", state); });
    }

    function showObject(obj, atIndex) {
      var row = document.getElementById("objrow");
      row.innerHTML = "";
      var chip = g.el("div", "objchip mb-pop");
      chip.innerHTML = '<span class="obj-icon">' + obj.icon + '</span>' +
                       '<span class="obj-name">' + obj.name + '</span>';
      row.appendChild(chip);

      Array.prototype.forEach.call(
        document.getElementById("locgrid").children,
        function (b, i) { b.classList.toggle("spotlight", i === atIndex); });
    }

    /* ------------------------------------------------------ learn phase */

    async function learnPhase() {
      lockLocations(true);

      /* Assign each object to a location, spread evenly. */
      var objs = g.sample(OBJECTS, objectCount);
      pairs = objs.map(function (o, i) {
        return { object: o, loc: i % LOCATIONS.length };
      });
      pairs = g.shuffle(pairs);

      for (var p = 0; p < pairs.length; p++) {
        var pair = pairs[p];
        g.setProgress("Learning " + (p + 1) + " / " + pairs.length);
        setPrompt("Remember: the " + pair.object.name + " is in " + LOCATIONS[pair.loc].name);
        setSub("Learned " + p + "/" + pairs.length + " objects");
        showObject(pair.object, pair.loc);
        g.say("Remember, the " + pair.object.name + " is in " + LOCATIONS[pair.loc].name);
        g.tone(600, 140);
        await g.wait(showMs);
      }

      Array.prototype.forEach.call(
        document.getElementById("locgrid").children,
        function (b) { b.classList.remove("spotlight"); });

      setPrompt("Now let's see what you remember");
      setSub("Each object comes back — tap where it belongs");
      g.say("Now, tap the place each object came from.");
      await g.wait(1600);

      /* Hard repeats the whole set so the memory is tested twice. */
      quiz = [];
      for (var k = 0; k < passes; k++) quiz = quiz.concat(g.shuffle(pairs));
      askNext();
    }

    /* ------------------------------------------------------- quiz phase */

    var current = null, answering = false;

    function askNext() {
      if (asked >= quiz.length) return endGame();
      current = quiz[asked];
      asked++;
      answering = true;

      g.setProgress(asked + " / " + quiz.length);
      g.flash("");
      lockLocations(false);

      setPrompt("Where does the " + current.object.name + " belong?");
      setSub("Tap the place");
      showObject(current.object, -1);
      g.say("Where is the " + current.object.name + "?");

      if (answerMs) {
        g.countdown(answerMs, function () {
          if (!answering) return;
          answering = false;
          lockLocations(true);
          reveal(current.loc);
          g.flash("Time's up — it was in " + LOCATIONS[current.loc].name, "no");
          setTimeout(askNext, 1500);
        });
      }
    }

    function reveal(index) {
      Array.prototype.forEach.call(
        document.getElementById("locgrid").children,
        function (b, i) { if (i === index) b.classList.add("correct"); });
      setTimeout(clearMarks, 1300);
    }

    function clearMarks() {
      Array.prototype.forEach.call(
        document.getElementById("locgrid").children,
        function (b) { b.classList.remove("correct", "wrong"); });
    }

    function onPick(index, btn) {
      if (!answering) return;
      answering = false;
      g.cancelCountdown();
      lockLocations(true);

      if (index === current.loc) {
        correct++;
        raw += Math.round(100 / quiz.length);
        coins += 2;
        g.addPoints(Math.round(100 / quiz.length));
        btn.classList.add("correct");
        g.flash("Correct! The " + current.object.name + " was in " +
                LOCATIONS[index].name + "   +2 coins ✨", "ok");
        g.say("Correct.");
      } else {
        btn.classList.add("wrong");
        reveal(current.loc);
        g.flash("It was in " + LOCATIONS[current.loc].name, "no");
        g.say("It was in " + LOCATIONS[current.loc].name);
      }

      setTimeout(function () { clearMarks(); askNext(); }, 1500);
    }

    /* ------------------------------------------------------------- end */

    function endGame() {
      var accuracy = Math.round((correct / quiz.length) * 100);

      /* Exact final total: per-question rounding would otherwise stop a
         flawless game short of 100. */
      raw = accuracy;
      if (accuracy === 100) raw += 10;     /* spec: +10 for a perfect game */

      g.finish({
        raw: raw,
        accuracy: accuracy,
        metrics: {
          objects_learned: pairs.length,
          questions_asked: quiz.length,
          correct_recalls: correct,
          location_memory_strength: accuracy
        },
        tooEasy: accuracy === 100,
        tooHard: accuracy < 60,
        verdict: accuracy === 100 ? "Remarkable memory!" :
                 accuracy >= 80 ? "Strong recall!" : "Good effort"
      });
    }

    g.intro(function () {
      layout();
      learnPhase();
    });
  }

  global.MBLocationLink = { start: start };
})(window);
