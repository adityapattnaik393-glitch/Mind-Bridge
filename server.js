const path = require("path");
const fs = require("fs");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
    Object.assign(process.env, require("dotenv").parse(fs.readFileSync(envPath)));
}

const app = express();
const port = Number(process.env.PORT || 5000);
const publicPath = path.join(__dirname, "public");
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

app.use(express.json());
app.use(express.static(publicPath));

function requireSupabase(res) {
    if (!supabase) {
        res.status(503).json({ error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env." });
        return false;
    }
    return true;
}

async function getUser(req, res) {
    if (!requireSupabase(res)) return null;
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
        res.status(401).json({ error: "Sign in is required." });
        return null;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
        res.status(401).json({ error: "Your session has expired. Please sign in again." });
        return null;
    }
    return data.user;
}

app.get("/api/health", (req, res) => {
    res.json({ ok: true, supabaseConfigured: Boolean(supabase) });
});

app.get("/api/config", (req, res) => {
    res.json({ supabaseConfigured: Boolean(supabase) });
});

app.post("/api/auth/login", async (req, res) => {
    if (!requireSupabase(res)) return;
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    res.json({ session: data.session, user: data.user });
});

app.post("/api/auth/signup", async (req, res) => {
    if (!requireSupabase(res)) return;
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) return res.status(400).json({ error: "Name, email, and password are required." });
    if (password.length < 6) return res.status(400).json({ error: "Use a password with at least 6 characters." });

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
    });
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ session: data.session, user: data.user, needsEmailConfirmation: !data.session });
});

app.get("/api/patient", async (req, res) => {
    const user = await getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
        .from("patients")
        .select("id, name, age, region, preferred_language, streak")
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    const profile = data || {};
    res.json({
        _id: profile.id || user.id,
        id: profile.id || user.id,
        name: profile.name || user.user_metadata?.name || user.email?.split("@")[0] || "Patient",
        age: profile.age || 72,
        region: profile.region || "Imphal, Manipur",
        preferredLanguage: profile.preferred_language || "English",
        streak: profile.streak || 0
    });
});

app.get("/api/scores", async (req, res) => {
    const user = await getUser(req, res);
    if (!user) return;

    const { data, error } = await supabase
        .from("game_scores")
        .select("id, game_type, score, attempts, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post("/api/scores", async (req, res) => {
    const user = await getUser(req, res);
    if (!user) return;
    const { name, score, attempts = 1 } = req.body || {};
    const numericScore = Number(score);
    if (!name || !Number.isFinite(numericScore)) return res.status(400).json({ error: "A game name and score are required." });

    const { data, error } = await supabase
        .from("game_scores")
        .insert({ user_id: user.id, game_type: name, score: Math.max(0, Math.min(100, numericScore)), attempts })
        .select("id, game_type, score, attempts, created_at")
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

app.post("/api/notify-caregiver", async (req, res) => {
    const user = await getUser(req, res);
    if (!user) return;
    const { alertTitle } = req.body || {};
    if (!alertTitle) return res.status(400).json({ error: "Alert title is required." });

    const { error } = await supabase.from("cognitive_alerts").insert({
        user_id: user.id,
        alert_title: alertTitle,
        status: "Acknowledged"
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: "Caregiver alert acknowledged." });
});

app.use((req, res) => res.sendFile(path.join(publicPath, "index.html")));

app.listen(port, () => {
    console.log(`MindBridge running at http://localhost:${port}`);
});
