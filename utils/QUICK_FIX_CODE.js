// ============================================================
// QUICK FIX: Copy these functions directly into server.js
// ============================================================

// Add this to the top of your server.js:
const calculateStreak = async (userId) => {
    try {
        const { data } = await supabase
            .from("game_scores")
            .select("created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (!data || data.length === 0) return 0;

        const dates = [...new Set(data.map(row => 
            new Date(row.created_at).toISOString().split('T')[0]
        ))];

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < dates.length; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            
            if (checkDate.toISOString().split('T')[0] === dates[i]) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error("Streak calc error:", error);
        return 0;
    }
};

// ============================================================
// FIX #1: Add this endpoint (CRITICAL - matches frontend call)
// ============================================================

app.post("/api/scores", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.slice(7);
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !userData.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = userData.user.id;
        const { name, score, difficulty, durationSeconds } = req.body;

        // Validate
        if (!name || typeof score !== 'number' || score < 0) {
            return res.status(400).json({ error: "Invalid input" });
        }

        // Save score
        const { data, error } = await supabase
            .from("game_scores")
            .insert({
                user_id: userId,
                score: score,
                game_name: name,
                difficulty: difficulty || "medium",
                duration_seconds: durationSeconds || 180
            })
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Calculate and update streak
        const newStreak = await calculateStreak(userId);
        await supabase.from("patients").update({ streak: newStreak }).eq("user_id", userId);

        console.log(`✅ Score saved: ${name} - ${score} (streak: ${newStreak})`);

        return res.status(201).json({
            success: true,
            score_id: data?.[0]?.id,
            streak: newStreak
        });

    } catch (error) {
        console.error("Score error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================================
// FIX #2: Add recent activity endpoint
// ============================================================

app.get("/api/recent-activity", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.slice(7);
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !userData.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = userData.user.id;
        const limit = parseInt(req.query.limit || 10);

        // Get recent scores
        const { data: scores, error } = await supabase
            .from("game_scores")
            .select("id, score, game_name, difficulty, duration_seconds, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        const activity = scores.map(score => ({
            id: score.id,
            game: score.game_name,
            score: score.score,
            difficulty: score.difficulty,
            duration: Math.round(score.duration_seconds / 60),
            timestamp: score.created_at,
            date: new Date(score.created_at).toLocaleDateString('en-IN')
        }));

        return res.json({ success: true, recent_activity: activity });

    } catch (error) {
        console.error("Activity error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================================
// FIX #3: Add streak endpoint
// ============================================================

app.get("/api/streak", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.slice(7);
        const { data: userData, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !userData.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = userData.user.id;

        // Get current streak
        const { data: patient, error } = await supabase
            .from("patients")
            .select("streak")
            .eq("user_id", userId)
            .single();

        if (error || !patient) {
            return res.status(404).json({ error: "Not found" });
        }

        return res.json({ success: true, streak: patient.streak || 0 });

    } catch (error) {
        console.error("Streak error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// ============================================================
// THEN: Run this SQL in Supabase
// ============================================================

/*
-- Run in Supabase SQL Editor

-- Create trigger function
create or replace function public.calculate_and_update_streak()
returns trigger as $$
declare
  v_streak integer := 0;
begin
  with date_list as (
    select distinct (created_at at time zone 'Asia/Kolkata')::date as game_date
    from public.game_scores
    where user_id = new.user_id
    order by game_date desc
  ),
  consecutive as (
    select game_date,
           row_number() over (order by game_date desc) as days_back
    from date_list
  )
  select count(*)
  into v_streak
  from consecutive
  where game_date >= current_date - (days_back - 1);

  update public.patients
  set streak = coalesce(v_streak, 0)
  where user_id = new.user_id;

  return new;
end;
$$ language plpgsql;

-- Create trigger
drop trigger if exists update_streak_on_score_insert on public.game_scores;
create trigger update_streak_on_score_insert
after insert on public.game_scores
for each row
execute procedure public.calculate_and_update_streak();

-- Update view
drop view if exists public.daily_progress;
create or replace view public.daily_progress
with (security_invoker = true) as
select
  gs.user_id,
  (gs.created_at at time zone 'Asia/Kolkata')::date as day,
  count(*) as sessions,
  round(avg(gs.score))::int as avg_score,
  max(gs.score) as best_score,
  min(gs.score) as low_score,
  round(sum(coalesce(gs.duration_seconds, 180)) / 60.0)::int as minutes,
  p.streak
from public.game_scores gs
join public.patients p on gs.user_id = p.user_id
group by gs.user_id, (gs.created_at at time zone 'Asia/Kolkata')::date, p.streak;
*/

// ============================================================
// TEST IT
// ============================================================

// 1. Play a game in the app
// 2. Game should end and save score
// 3. Check browser console for success message
// 4. Check recent activity:

/*
curl -X GET http://localhost:5000/api/recent-activity \
  -H "Authorization: Bearer YOUR_TOKEN"

// Should return:
{
  "success": true,
  "recent_activity": [
    {
      "id": 1,
      "game": "candy-crush",
      "score": 150,
      "duration": 5,
      "timestamp": "2024-01-15T...",
      "date": "15/01/2024"
    }
  ]
}
*/

// 5. Check streak:

/*
curl -X GET http://localhost:5000/api/streak \
  -H "Authorization: Bearer YOUR_TOKEN"

// Should return:
{
  "success": true,
  "streak": 1
}
*/

// ============================================================
// THAT'S IT! Your game scores will now:
// ✅ Save to database
// ✅ Update streak automatically  
// ✅ Show in recent activity
// ✅ Display in dashboards
// ============================================================
