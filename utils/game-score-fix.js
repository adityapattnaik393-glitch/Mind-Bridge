// ============================================================
// ISSUE ANALYSIS & FIXES
// ============================================================

// PROBLEM 1: API Endpoint Mismatch
// The frontend calls: /api/scores
// The server has: /api/game-score
// Result: 404 error, scores never saved ❌

// PROBLEM 2: Streak Not Updating
// The streak column exists in patients table
// But there's no trigger/function to update it ❌

// PROBLEM 3: Recent Activity Not Showing
// No endpoint to fetch recent activity
// Dashboard can't display game history ❌

// ============================================================
// SOLUTION: Add these endpoints to your server.js
// ============================================================

const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ==================== UTILITY FUNCTIONS ====================

function verifyAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return { valid: false, error: "Missing authorization header" };
    }
    return { valid: true, token: authHeader.slice(7) };
}

async function calculateStreak(userId) {
    try {
        // Get all dates with game sessions, ordered by date descending
        const { data, error } = await supabase
            .from("game_scores")
            .select("created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) {
            return 0;
        }

        // Convert to dates (IST timezone)
        const dates = data.map(row => {
            const date = new Date(row.created_at);
            // Convert to IST
            date.setHours(date.getHours() + 5);
            date.setMinutes(date.getMinutes() + 30);
            return date.toISOString().split('T')[0];
        });

        // Get unique dates
        const uniqueDates = [...new Set(dates)].map(d => new Date(d));
        uniqueDates.sort((a, b) => b - a); // descending

        // Calculate streak
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < uniqueDates.length; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);

            const currentDate = new Date(uniqueDates[i]);
            currentDate.setHours(0, 0, 0, 0);

            if (checkDate.getTime() === currentDate.getTime()) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error("Error calculating streak:", error);
        return 0;
    }
}

// ==================== API ENDPOINTS ====================

/**
 * FIX #1: Match frontend expectation - use /api/scores
 * POST /api/scores
 * Save game score (matches frontend's saveGameScore() call)
 */
app.post("/api/scores", async (req, res) => {
    try {
        const auth = verifyAuthToken(req);
        if (!auth.valid) {
            return res.status(401).json({ error: auth.error });
        }

        const { data: userData, error: authError } = await supabase.auth.getUser(auth.token);
        if (authError || !userData.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = userData.user.id;
        const { name, score, difficulty, durationSeconds } = req.body;

        // Validate required fields
        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({ error: "Invalid score" });
        }

        // Insert game score into database
        const { data, error } = await supabase
            .from("game_scores")
            .insert({
                user_id: userId,
                score: score,
                game_name: name || "unknown",
                difficulty: difficulty || "medium",
                duration_seconds: durationSeconds || 180
            })
            .select();

        if (error) {
            console.error("Database insert error:", error);
            return res.status(400).json({ error: error.message });
        }

        // Calculate and update streak after saving score
        const newStreak = await calculateStreak(userId);
        
        // Update streak in patients table
        await supabase
            .from("patients")
            .update({ streak: newStreak })
            .eq("user_id", userId);

        console.log(`✅ Score saved: ${name} - ${score} points (streak: ${newStreak})`);

        return res.status(201).json({
            success: true,
            score_id: data?.[0]?.id,
            streak: newStreak,
            message: "Score saved successfully"
        });

    } catch (error) {
        console.error("Score API error:", error);
        return res.status(500).json({ 
            error: "Failed to save score",
            details: error.message 
        });
    }
});

/**
 * FIX #2: Keep /api/game-score for compatibility
 * POST /api/game-score
 * Alternative endpoint (redirects to /api/scores)
 */
app.post("/api/game-score", async (req, res) => {
    try {
        const auth = verifyAuthToken(req);
        if (!auth.valid) {
            return res.status(401).json({ error: auth.error });
        }

        const { data: userData, error: authError } = await supabase.auth.getUser(auth.token);
        if (authError || !userData.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = userData.user.id;
        const { score, duration_seconds, game_name } = req.body;

        // Validate
        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({ error: "Invalid score" });
        }

        // Insert score
        const { data, error } = await supabase
            .from("game_scores")
            .insert({
                user_id: userId,
                score: score,
                game_name: game_name || "game",
                duration_seconds: duration_seconds || 180
            })
            .select();

        if (error) {
            console.error("Database insert error:", error);
            return res.status(400).json({ error: error.message });
        }

        // Update streak
        const newStreak = await calculateStreak(userId);
        
        await supabase
            .from("patients")
            .update({ streak: newStreak })
            .eq("user_id", userId);

        console.log(`✅ Score saved: ${game_name} - ${score} (streak: ${newStreak})`);

        return res.status(201).json({
            success: true,
            score_id: data?.[0]?.id,
            streak: newStreak
        });

    } catch (error) {
        console.error("Game score error:", error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * FIX #3: Get recent activity
 * GET /api/recent-activity
 * Get recent game sessions for dashboard display
 */
app.get("/api/recent-activity", async (req, res) => {
    try {
        const auth = verifyAuthToken(req);
        if (!auth.valid) {
            return res.status(401).json({ error: auth.error });
        }

        const { data: userData, error: authError } = await supabase.auth.getUser(auth.token);
        if (authError || !userData.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = userData.user.id;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;

        // Fetch recent scores
        const { data: scores, error } = await supabase
            .from("game_scores")
            .select("id, score, game_name, difficulty, duration_seconds, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Format response
        const activity = scores.map(score => ({
            id: score.id,
            game: score.game_name,
            score: score.score,
            difficulty: score.difficulty,
            duration: Math.round(score.duration_seconds / 60), // convert to minutes
            timestamp: score.created_at,
            date: new Date(score.created_at).toLocaleDateString('en-IN')
        }));

        return res.json({
            success: true,
            recent_activity: activity,
            total_sessions: scores.length
        });

    } catch (error) {
        console.error("Recent activity error:", error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * FIX #3: Get patient stats including streak
 * GET /api/patient-stats
 * Get daily progress and streak information
 */
app.get("/api/patient-stats", async (req, res) => {
    try {
        const auth = verifyAuthToken(req);
        if (!auth.valid) {
            return res.status(401).json({ error: auth.error });
        }

        const { data: userData, error: authError } = await supabase.auth.getUser(auth.token);
        if (authError || !userData.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = userData.user.id;

        // Get patient info (includes streak)
        const { data: patient, error: patientError } = await supabase
            .from("patients")
            .select("streak, name")
            .eq("user_id", userId)
            .single();

        if (patientError || !patient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // Get daily progress for last 7 days
        const { data: stats, error: statsError } = await supabase
            .from("daily_progress")
            .select("day, sessions, avg_score, best_score, minutes")
            .eq("user_id", userId)
            .order("day", { ascending: false })
            .limit(7);

        if (statsError) {
            return res.status(400).json({ error: statsError.message });
        }

        return res.json({
            success: true,
            patient: {
                name: patient.name,
                streak: patient.streak || 0
            },
            daily_stats: stats || [],
            total_days: stats?.length || 0
        });

    } catch (error) {
        console.error("Patient stats error:", error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/streak
 * Get current streak for a user
 */
app.get("/api/streak", async (req, res) => {
    try {
        const auth = verifyAuthToken(req);
        if (!auth.valid) {
            return res.status(401).json({ error: auth.error });
        }

        const { data: userData, error: authError } = await supabase.auth.getUser(auth.token);
        if (authError || !userData.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = userData.user.id;

        // Get from patients table
        const { data: patient, error } = await supabase
            .from("patients")
            .select("streak")
            .eq("user_id", userId)
            .single();

        if (error || !patient) {
            return res.status(404).json({ error: "Streak not found" });
        }

        return res.json({
            success: true,
            streak: patient.streak || 0
        });

    } catch (error) {
        console.error("Streak error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// ==================== EXPORT ====================

module.exports = app;
