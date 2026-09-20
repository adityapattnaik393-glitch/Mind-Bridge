# MindBridge Games — Install Guide

15 cognitive games, a progression hub, and caretaker analytics. Built against
your existing backend. **No database changes, no new API endpoints.**

---

## 1. Install

Copy the `public/` folder into your repo, keeping the structure.

**New files (safe to drop in):**

```
public/games-hub.js            menu, 80% gates, adaptive difficulty, saveGameScore
public/games-hub.css
public/games-integration.js    patient.html wiring
public/caretaker-games.js      analytics panel
public/caretaker-games.css
public/games/                  15 games + shared kit  (new folder)
```

**Two files replace yours:**

```
public/patient.html            + 1 stylesheet link, + 2 script tags
public/caretaker.html          + 1 stylesheet link, + 1 script tag
```

These are your originals with tags added, nothing removed. If you'd rather
patch by hand, add to `patient.html`:

```html
<link rel="stylesheet" href="games-hub.css">      <!-- in <head> -->

<script src="games-hub.js"></script>              <!-- after patient.js -->
<script src="games-integration.js"></script>
```

and to `caretaker.html`:

```html
<link rel="stylesheet" href="caretaker-games.css">  <!-- in <head> -->
<script src="caretaker-games.js"></script>          <!-- after caretaker.js -->
```

Load order matters: `app.js` → `patient.js` → `games-hub.js` → `games-integration.js`.
The hub needs `window.MB` from `app.js`.

Then deploy. Nothing else to configure.

---

## 2. How it hangs together

```
patient taps "Start Games"
   └─ games-integration.js opens the existing #modalBg
        └─ games-hub.js renders the menu (locks, last scores, coins, streak)
             └─ selected game loads in an iframe:
                games/<id>.html?level=N&boost=-1|0|1&session=<id>
                  └─ game ends, kit.js posts the payload to the parent
                       └─ hub normalises it and POSTs /api/scores
                            └─ 'mb:game-saved' fires → dashboard refreshes
```

`games-integration.js` **clones `#startBtn` before binding**, which drops any
listener `patient.js` already attached. Your old three-game flow won't fire
alongside the hub. Nothing in `patient.js` needs editing.

---

## 3. Two deviations from the roadmap — both forced by your codebase

**The endpoint.** The roadmap specifies `POST /api/game-score`. Your live
frontend doesn't use it: `offline.js` calls
`MB.api('/api/scores', {name, score, difficulty, durationSeconds})`, and your
own `utils/GAME_SCORE_FIX_GUIDE.md` documents that `/api/game-score` returning
404 was the bug being fixed. The hub posts to `/api/scores` in that exact
shape, so the new games save through the identical path as your existing ones.

**Score range.** `supabase/schema.sql` has `check (score between 0 and 100)`.
The prompt file asks for `score: [0-150 with bonus]` (Speed Reaction),
`[0-200]` (Slow Spotter), `[0-120]` (Number Ladder). Those inserts would be
rejected by Postgres. Each game computes raw points exactly as specified, then
normalises to 0–100 before saving. Raw points are preserved in
`payload.raw_points` and surfaced on the end-of-game screen.

---

## 4. Bugs found and fixed while building

A scoring audit across all 15 games turned up five problems. Since the unlock
gate is exactly 80%, small errors mattered.

| Game | Problem | Fix |
|---|---|---|
| Sound Story | Perfect run capped at **96%** — per-round rounding lost points | Final total computed once at game end |
| Location Link | Perfect run capped at **98%** — same cause | Same |
| Dual Task Master | Perfect run capped at **91%** — same cause | Same |
| Memory Grid | 6 extra card flips dropped you to **73%** — unreasonably harsh | Rebalanced; same run now scores 88% |
| Number Ladder | **Un-failable** — you can't finish without tapping every number, so it always scored 100% and its gate was meaningless | Wrong taps now cost 3 points each |

All 15 games verified: a flawless run reaches exactly 100%.

---

## 5. Progression rules as implemented

- **5 levels per game.** Score ≥80% to clear a level and unlock the next.
  Below 80% replays the same level.
- **Tier gates.** Medium opens once **3 easy games** have cleared level 3.
  Hard opens once 3 medium games have cleared level 3.
- **Adaptive difficulty.** The hub averages the last 3 plays of that game and
  passes `boost` into the URL: avg >85% → `+1` (more items, faster), avg <60%
  → `-1` (fewer, slower), otherwise `0`. Each game maps `boost` onto its own
  parameters, so difficulty genuinely changes rather than just the numbers.
- **Motivation.** 10 coins per game, +5 at 90%+. Day-streak counter. Badges at
  1/10/25 games, 5-day streak, and each tier unlock.

Progress lives in `localStorage` under `mindbridge_games_v1`. Scores go to
Supabase; the progression state is local, so clearing site data resets locks
but not the caretaker's history.

Reset during testing: `MBGamesHub.resetProgress()` in the console.

---

## 6. Testing checklist

**Per game** — all 15 verified against this:

- [x] No external dependencies (no CDN, no image or audio files — shapes are
      inline SVG, icons are system emoji, tones are WebAudio)
- [x] Touch targets ≥50×50px; body text 18px; high-contrast palette
- [x] Voice narration is a toggle, remembered across games, never required —
      every spoken line also appears as on-screen text
- [x] `saveGameScore()` fires with the full payload
- [x] Score clamped to 0–100 before it reaches the database
- [x] Mobile responsive down to 360px
- [x] `prefers-reduced-motion` respected
- [x] Visible keyboard focus rings

**Cross-game** — verified in a simulated session:

- [x] Three games in sequence without a page reload
- [x] Tier gating (medium locked until 3 easy games clear level 3)
- [x] 80% gate: 79% → retry → 81% unlocks correctly
- [x] Adaptive triggers at avg 92 → harder, 50 → easier, 72 → unchanged
- [x] Data persists between games

**Still needs your hands on a real device** (I can't run a browser here):

- [ ] Play each game on an actual phone — timing feel, especially Speed
      Reaction and Dual Task Master, which are pace-sensitive
- [ ] Confirm a score appears in the caretaker dashboard within 5 seconds
- [ ] Check voice narration on your target devices (iOS Safari picks voices
      differently from Android Chrome)

---

## 7. One open question on your side

`patient.js` is loaded by `patient.html` but **wasn't in the codebase dump**,
so I couldn't see whether it already defines `saveGameScore` or binds
`#startBtn`. The integration is written defensively and should be fine either
way — but if you send me that file I can confirm rather than guess.

Related: `schema.sql` declares `game_type text not null`, while the fix-guide's
`/api/scores` inserts `game_name`. I couldn't see your live `server.js` to know
which is actually in use. The new games post the same body as your existing
ones, so if scores save today they'll save now. If you hit a null-constraint
error, that mismatch is the cause.

---

## 8. Answers to the questions in your overview doc

**Are 3–5 minute games right?** Yes for easy and medium — that's where
older-adult attention tends to hold. The hard tier runs 4–8 minutes because
Location Link and Mixed Challenge need a learn phase before testing. Three
games per session lands you at 15–20 minutes, which matches your target.

**Hard tier: mix game types or keep separate?** Kept separate, with one
deliberate exception. Mixed Challenge is the only game combining mechanics
(memory + speed), so it reads as a capstone rather than as confusion. Your
roadmap's own "don't mix mechanics within a game" rule is otherwise respected.

**Voice: essential or optional?** Optional toggle, on by default, remembered
across games. Every narrated line is also on screen, so a patient with the
toggle off or a device with no speech support loses nothing.

**Difficulty menu or automatic only?** Both, deliberately. Tier progression is
gated (patients can't skip ahead), but within an unlocked tier they choose any
game freely. Forcing a single next-game would fight the variety that prevents
the plateau effect you're trying to avoid.
