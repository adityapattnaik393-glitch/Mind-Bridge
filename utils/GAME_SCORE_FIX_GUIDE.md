# Game Score & Streak Fix - Complete Implementation Guide

## 🔴 Issues Identified

### Issue 1: Game Scores Not Saving
**Problem:**
- Frontend calls `/api/scores` endpoint
- Server only has `/api/game-score` endpoint
- Result: 404 error, scores never reach database

**Evidence:**
```javascript
// Frontend (app.js, line 4241)
const saved = await MB.api('/api/scores', {  // ← Calls /api/scores
    method: 'POST',
    body: JSON.stringify({...})
});

// Server (server.js, line 2291)
app.post("/api/game-score", ...)  // ← But server has /api/game-score
```

### Issue 2: Streak Not Updating
**Problem:**
- Streak column exists in `patients` table
- No trigger or function updates it when scores are saved
- Stays at 0 forever

**Root Cause:**
- Missing database trigger on `game_scores` table
- No streak calculation logic in API endpoint

### Issue 3: Recent Activity Not Showing
**Problem:**
- No `/api/recent-activity` endpoint
- Dashboard can't fetch recent game sessions
- Can't display activity in both patient and caretaker views

**Root Cause:**
- Missing API endpoint to retrieve user's recent scores

### Issue 4: Daily Progress Not Showing Streak
**Problem:**
- `daily_progress` view doesn't include streak
- Dashboard can't display streak in stats

---

## 🟢 Solution Overview

### Step 1: Add Missing API Endpoints
- Create `/api/scores` endpoint (matches frontend)
- Keep `/api/game-score` for compatibility
- Add `/api/recent-activity` for activity display
- Update `/api/patient-stats` to include streak

### Step 2: Update Database Schema
- Add trigger to auto-calculate streak on score insert
- Update `daily_progress` view to include streak
- Add indexes for performance

### Step 3: Implement Streak Calculation
- Function to count consecutive days with game sessions
- Automatic trigger on new score
- Timezone-aware (IST)

---

## 📋 Implementation Steps

### STEP 1: Add API Endpoints to server.js

Copy the code from `game-score-fix.js` to your `server.js`:

```bash
# Location in your project:
server.js  (or wherever your Express app is)
```

Key endpoints to add:

```javascript
// 1. FIX: Match frontend endpoint
app.post("/api/scores", async (req, res) => {
    // Accepts: { name, score, difficulty, durationSeconds }
    // Returns: { success, score_id, streak }
    // ✅ Saves score
    // ✅ Calculates streak
    // ✅ Updates patients table
});

// 2. KEEP: For compatibility
app.post("/api/game-score", async (req, res) => {
    // Accepts: { score, duration_seconds, game_name }
    // Returns: { success, score_id, streak }
});

// 3. NEW: Get recent activity
app.get("/api/recent-activity", async (req, res) => {
    // Returns: { recent_activity, total_sessions }
    // Shows last 10 games with timestamps
});

// 4. UPDATE: Include streak in stats
app.get("/api/patient-stats", async (req, res) => {
    // Returns: { patient: { streak }, daily_stats }
});

// 5. NEW: Direct streak access
app.get("/api/streak", async (req, res) => {
    // Returns: { streak }
});
```

### STEP 2: Update Database Schema

Run the SQL from `database-streak-updates.sql` in Supabase SQL Editor:

```bash
# In Supabase Dashboard:
1. Go to: SQL Editor
2. Create new query
3. Copy all content from database-streak-updates.sql
4. Run the query
```

What it does:
- ✅ Updates `daily_progress` view to include streak
- ✅ Creates trigger function for streak calculation
- ✅ Creates trigger on `game_scores` table insert
- ✅ Adds indexes for performance
- ✅ Backfills existing streak values

### STEP 3: Update Frontend (app.js)

No changes needed! The frontend code already:
- Calls `window.offlineManager.saveGameScore()`
- Which calls `/api/scores` (now will work!)
- Which passes data to the API

---

## 🧪 Testing

### Test 1: Verify API Endpoints Exist

```bash
# Check if /api/scores endpoint works
curl -X POST http://localhost:5000/api/scores \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "candy-crush",
    "score": 150,
    "difficulty": "medium",
    "durationSeconds": 300
  }'

# Expected: HTTP 201 Created
# Response: { "success": true, "score_id": 123, "streak": 5 }
```

### Test 2: Verify Streak Updates

```bash
# Play a game and check streak
curl http://localhost:5000/api/streak \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "streak": 1 }

# Play another game on same day, streak should stay 1
# Play next day, streak should increase to 2
```

### Test 3: Verify Recent Activity

```bash
curl http://localhost:5000/api/recent-activity \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: { "success": true, "recent_activity": [...], "total_sessions": 5 }
```

### Test 4: Verify Database

Go to Supabase Dashboard:

```sql
-- Check if trigger exists
select trigger_name from information_schema.triggers 
where event_object_table = 'game_scores';
-- Expected: update_streak_on_score_insert

-- Check if view has streak
select column_name from information_schema.columns 
where table_name = 'daily_progress' and column_name = 'streak';
-- Expected: streak

-- Check patient streak values
select name, streak, created_at from patients limit 5;
-- Expected: streak > 0 for active users

-- Check recent scores
select user_id, score, game_name, created_at 
from game_scores 
order by created_at desc limit 5;
-- Expected: Recent scores appear here
```

---

## 🔧 Implementation Checklist

- [ ] Copy code from `game-score-fix.js` to server.js
- [ ] Replace/update `/api/scores` endpoint
- [ ] Verify `/api/game-score` endpoint works
- [ ] Add new endpoints: `/api/recent-activity`, `/api/streak`
- [ ] Run SQL from `database-streak-updates.sql`
- [ ] Test score saving with curl
- [ ] Test streak calculation
- [ ] Check Supabase for trigger creation
- [ ] Play a test game in app
- [ ] Verify score appears in database
- [ ] Verify streak updates
- [ ] Check dashboard shows recent activity
- [ ] Deploy to production

---

## 🐛 Troubleshooting

### Scores still not saving?

```bash
# Check 1: Browser console for errors
# Open DevTools → Console
# Look for fetch errors when game ends

# Check 2: Network tab
# DevTools → Network
# Find POST to /api/scores
# Check response status (should be 201)
# Check response body for error message

# Check 3: Server logs
# npm start
# Look for "✅ Score saved:" message
# Or error messages

# Check 4: Database
# Query game_scores table:
select * from game_scores order by created_at desc limit 5;
# Should show recent games
```

### Streak shows 0?

```bash
# Check 1: Verify scores are saving first
select count(*) from game_scores where user_id = 'YOUR_USER_ID';
# Should return > 0

# Check 2: Check trigger is firing
# Play a game and run:
select streak from patients where user_id = 'YOUR_USER_ID';
# Should update automatically

# Check 3: Verify trigger exists
select trigger_name from information_schema.triggers 
where event_object_table = 'game_scores';
# Should show: update_streak_on_score_insert
```

### Recent activity endpoint returns empty?

```bash
# Check 1: Verify scores exist
select count(*) from game_scores 
where user_id = 'YOUR_USER_ID' 
and created_at > now() - interval '30 days';
# Should return > 0

# Check 2: Check endpoint logs
# Server logs should show activity requests

# Check 3: Verify token is valid
# Use same token from API test
```

---

## 📊 Expected Behavior After Fix

### Before Fix ❌
```
1. User plays game
2. Game ends, tries to save score
3. API call to /api/scores → 404 Not Found
4. Score lost, not saved
5. Dashboard shows: recent activity empty, streak 0
```

### After Fix ✅
```
1. User plays game
2. Game ends, saves score
3. API call to /api/scores → 201 Created
4. Score saved to database
5. Trigger auto-calculates streak
6. Dashboard shows:
   - Recent activity with all games
   - Updated streak count
   - Daily progress with stats
   - Caretaker sees all data
```

---

## 📈 File Structure After Implementation

```
your-project/
├── server.js  (UPDATED: add endpoints)
├── supabase/
│   └── schema.sql  (UPDATED: add trigger)
├── public/
│   ├── app.js  (no changes needed)
│   ├── patient.html  (will show recent activity)
│   └── caretaker.html  (will show stats & streak)
└── node_modules/
```

---

## 🚀 Deployment

### Local Testing
```bash
npm start
# Play a game
# Check browser console for success message
# Verify database has score
```

### Production Deployment
```bash
# 1. Update server.js with new endpoints
# 2. Deploy to production
# 3. Run SQL schema updates in Supabase
# 4. Test with real user account
# 5. Monitor logs for errors
```

---

## ⚡ Quick Reference

### API Endpoints Added

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/scores` | POST | Save game score | `{success, score_id, streak}` |
| `/api/game-score` | POST | Alt save endpoint | `{success, score_id, streak}` |
| `/api/recent-activity` | GET | Get recent games | `{recent_activity, total_sessions}` |
| `/api/patient-stats` | GET | Get stats + streak | `{patient, daily_stats}` |
| `/api/streak` | GET | Get current streak | `{streak}` |

### Database Changes

| Component | Change | Purpose |
|-----------|--------|---------|
| `daily_progress` view | Add `streak` column | Show streak in stats |
| `game_scores` table | Add trigger | Auto-calc streak |
| `patients` table | Update `streak` column | Store streak value |

---

## 📞 Support

If issues persist:
1. Check console logs (browser & server)
2. Verify database trigger exists
3. Confirm endpoints are added
4. Test with curl commands
5. Check Supabase RLS policies
6. Review error messages carefully

For more help, refer to:
- `game-score-fix.js` - Complete API code
- `database-streak-updates.sql` - Database setup
- Supabase docs on triggers
