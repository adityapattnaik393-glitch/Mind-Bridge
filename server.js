/* ============================================================================
 * MindBridge — server
 *
 * Auth model: the caretaker signs up and signs in with a MOBILE NUMBER.
 * Supabase Auth uses the caretaker's mobile number directly. The browser never
 * asks for or stores an email address.
 *
 * IMPORTANT Supabase setting: Authentication -> Sign In / Providers -> Phone
 * must be enabled, with phone confirmation disabled for password-only login.
 * ==========================================================================*/

const path = require("path");
const fs = require("fs");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const sendSms = require("./public/utils/sms");

const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
    Object.assign(process.env, require("dotenv").parse(fs.readFileSync(envPath)));
}

const app = express();
const port = Number(process.env.PORT || 5000);
const publicPath = path.join(__dirname, "public");

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

/* Base client — used for auth calls only (signUp / signIn / refresh). */
const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

/* Per-request client carrying the caller's access token, so Row Level Security
 * applies to every read and write no matter which key the server holds. */
function dbAs(token) {
    return createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
    });
}

app.use(express.json());
app.use(express.static(publicPath, { extensions: ["html"] }));

/* ------------------------------------------------------------------ helpers */

const SUPPORTED_LANGUAGES = [
    { code: "en", label: "English",            native: "English",        speech: "en-IN" },
    { code: "hi", label: "Hindi",              native: "हिन्दी",          speech: "hi-IN" },
    { code: "as", label: "Assamese",           native: "অসমীয়া",         speech: "as-IN" },
    { code: "mni", label: "Manipuri (Meitei)", native: "ꯃꯤꯇꯩꯂꯣꯟ",        speech: "mni-IN" },
    { code: "bn", label: "Bengali",            native: "বাংলা",           speech: "bn-IN" },
    { code: "ne", label: "Nepali",             native: "नेपाली",          speech: "ne-NP" },
    { code: "kha", label: "Khasi",             native: "Ka Ktien Khasi", speech: "en-IN" },
    { code: "lus", label: "Mizo",              native: "Mizo ṭawng",     speech: "en-IN" },
    { code: "brx", label: "Bodo",              native: "बर'",            speech: "hi-IN" },
    { code: "nag", label: "Nagamese",          native: "Nagamese",       speech: "en-IN" }
];

function languageByCode(code) {
    return SUPPORTED_LANGUAGES.find((item) => item.code === code) || SUPPORTED_LANGUAGES[0];
}

/** Strip formatting and return a plain digit string, or null if implausible. */
function normaliseMobile(input) {
    const digits = String(input || "").replace(/\D/g, "");
    const trimmed = digits.length === 12 && digits.startsWith("91") ? digits.slice(2)
        : digits.length === 11 && digits.startsWith("0") ? digits.slice(1)
        : digits;
    if (trimmed.length < 10 || trimmed.length > 15) return null;
    return trimmed;
}

function mobileToPhone(mobile) {
    return `+91${mobile}`;
}

function requireSupabase(res) {
    if (!supabase) {
        res.status(503).json({
            error: "Supabase is not configured. Add SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_ANON_KEY) to .env."
        });
        return false;
    }
    return true;
}

/** Verifies the bearer token and returns { user, db } or null (response sent). */
async function authenticate(req, res) {
    if (!requireSupabase(res)) return null;
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
        res.status(401).json({ error: "Please sign in to continue." });
        return null;
    }
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
        res.status(401).json({ error: "Your session has expired. Please sign in again.", expired: true });
        return null;
    }
    return { user: data.user, db: dbAs(token), token };
}

/** Local calendar date (YYYY-MM-DD) for a timestamp, in the app time zone. */
function localDay(value) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date(value));
}

function todayKey() {
    return localDay(new Date());
}

function shiftDay(key, days) {
    const date = new Date(`${key}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

const CATEGORY_BY_GAME = {
    "Word Garden": "Language",
    "Memory Match": "Memory",
    "Picture Path": "Focus"
};

/** Consecutive days with at least one session, counting back from today. */
function computeStreak(dayKeys) {
    const days = new Set(dayKeys);
    let cursor = todayKey();
    if (!days.has(cursor)) {
        cursor = shiftDay(cursor, -1);
        if (!days.has(cursor)) return 0;
    }
    let streak = 0;
    while (days.has(cursor)) {
        streak += 1;
        cursor = shiftDay(cursor, -1);
    }
    return streak;
}

function average(values) {
    if (!values.length) return 0;
    return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

/**
 * Wellbeing index — 60% recent performance, 20% consistency (days practised
 * this week), 20% trend (this week vs the week before).
 */
function wellbeingIndex(scores) {
    if (!scores.length) return { score: 0, trend: 0 };
    const today = todayKey();
    const weekStart = shiftDay(today, -6);
    const prevStart = shiftDay(today, -13);

    const thisWeek = scores.filter((row) => row.day >= weekStart);
    const prevWeek = scores.filter((row) => row.day >= prevStart && row.day < weekStart);

    const performance = average((thisWeek.length ? thisWeek : scores).map((row) => row.score));
    const activeDays = new Set(thisWeek.map((row) => row.day)).size;
    const consistency = Math.round((Math.min(activeDays, 7) / 7) * 100);

    const prevAverage = average(prevWeek.map((row) => row.score));
    const trend = prevAverage ? performance - prevAverage : 0;
    const trendScore = Math.max(0, Math.min(100, 50 + trend * 2.5));

    const index = Math.round(performance * 0.6 + consistency * 0.2 + trendScore * 0.2);
    return { score: Math.max(0, Math.min(100, index)), trend };
}

/* Starter reminders shown until the caretaker acknowledges them. */
const SEED_ALERTS = [
    { kind: "reminder", title: "Medicine reminder",   body: "Time for the scheduled afternoon medication.",              icon: "medicine" },
    { kind: "reminder", title: "Hydration check",     body: "A glass of water is due in the next 15 minutes.",           icon: "hydration" },
    { kind: "reminder", title: "Upcoming appointment", body: "Neurologist check-up scheduled for tomorrow at 10:00 AM.", icon: "appointment" }
];

/* -------------------------------------------------------------------- routes */

app.get("/api/health", (req, res) => {
    res.json({ ok: true, supabaseConfigured: Boolean(supabase) });
});

app.get("/api/config", (req, res) => {
    res.json({ supabaseConfigured: Boolean(supabase), languages: SUPPORTED_LANGUAGES });
});

/* ---- sign up -------------------------------------------------------------*/
app.post("/api/auth/signup", async (req, res) => {
    if (!requireSupabase(res)) return;
    const {
        caretakerName, patientName, mobile, password,
        languageCode = "en", age, region
    } = req.body || {};

    if (!caretakerName?.trim())  return res.status(400).json({ error: "Caretaker name is required." });
    if (!patientName?.trim())    return res.status(400).json({ error: "Patient name is required." });

    const normalised = normaliseMobile(mobile);
    if (!normalised) return res.status(400).json({ error: "Enter a valid mobile number (10 digits)." });
    if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const language = languageByCode(languageCode);
    const { data, error } = await supabase.auth.signUp({
        phone: mobileToPhone(normalised),
        password,
        options: {
            data: {
                caretaker_name: caretakerName.trim(),
                patient_name: patientName.trim(),
                mobile: normalised,
                preferred_language: language.label,
                language_code: language.code,
                age: Number(age) || 72,
                region: (region || "").trim() || "Imphal, Manipur"
            }
        }
    });

    if (error) {
        const alreadyExists = /already registered|already exists|User already/i.test(error.message);
        return res.status(alreadyExists ? 409 : 400).json({
            error: alreadyExists
                ? "This mobile number already has an account. Please sign in instead."
                : error.message
        });
    }

    /* Supabase hides duplicates by returning a user with no identities. */
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return res.status(409).json({ error: "This mobile number already has an account. Please sign in instead." });
    }

    if (!data.session) {
        return res.status(400).json({
            error: "Account created, but phone confirmation is switched on in Supabase. Turn off Authentication -> Providers -> Phone -> 'Confirm phone', then sign in."
        });
    }

    /* Belt and braces: the SQL trigger normally creates this row already. */
    const db = dbAs(data.session.access_token);
    await db.from("patients").upsert({
        user_id: data.user.id,
        name: patientName.trim(),
        caretaker_name: caretakerName.trim(),
        caretaker_mobile: normalised,
        preferred_language: language.label,
        language_code: language.code,
        age: Number(age) || 72,
        region: (region || "").trim() || "Imphal, Manipur",
        updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

    res.status(201).json({ session: data.session, user: data.user });
});

/* ---- sign in -------------------------------------------------------------*/
app.post("/api/auth/login", async (req, res) => {
    if (!requireSupabase(res)) return;
    const { mobile, password } = req.body || {};

    const normalised = normaliseMobile(mobile);
    if (!normalised) return res.status(400).json({ error: "Enter a valid mobile number (10 digits)." });
    if (!password)   return res.status(400).json({ error: "Please enter your password." });

    const { data, error } = await supabase.auth.signInWithPassword({
        phone: mobileToPhone(normalised),
        password
    });

    if (error) {
        const badCredentials = /invalid login credentials/i.test(error.message);
        return res.status(401).json({
            error: badCredentials
                ? "Mobile number or password is incorrect."
                : error.message
        });
    }

    res.json({ session: data.session, user: data.user });
});

/* ---- refresh -------------------------------------------------------------*/
app.post("/api/auth/refresh", async (req, res) => {
    if (!requireSupabase(res)) return;
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ error: "A refresh token is required." });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return res.status(401).json({ error: "Please sign in again." });
    res.json({ session: data.session, user: data.user });
});

/* ---- profile -------------------------------------------------------------*/
async function readProfile(auth) {
    const { data } = await auth.db
        .from("patients")
        .select("id, name, age, region, preferred_language, language_code, streak, caretaker_name, caretaker_mobile")
        .eq("user_id", auth.user.id)
        .maybeSingle();

    const meta = auth.user.user_metadata || {};
    const row = data || {};
    const code = row.language_code || meta.language_code || "en";
    const language = languageByCode(code);

    return {
        id: row.id || auth.user.id,
        patientName: row.name || meta.patient_name || "Patient",
        caretakerName: row.caretaker_name || meta.caretaker_name || "Caretaker",
        mobile: row.caretaker_mobile || meta.mobile || "",
        age: row.age || Number(meta.age) || 72,
        region: row.region || meta.region || "Imphal, Manipur",
        language: { code: language.code, label: language.label, native: language.native, speech: language.speech },
        streak: row.streak || 0
    };
}

app.get("/api/profile", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    try {
        res.json(await readProfile(auth));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch("/api/profile", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const { patientName, caretakerName, languageCode, age, region } = req.body || {};
    const patch = { updated_at: new Date().toISOString() };

    if (patientName?.trim())   patch.name = patientName.trim();
    if (caretakerName?.trim()) patch.caretaker_name = caretakerName.trim();
    if (region?.trim())        patch.region = region.trim();
    if (Number(age))           patch.age = Number(age);
    if (languageCode) {
        const language = languageByCode(languageCode);
        patch.language_code = language.code;
        patch.preferred_language = language.label;
    }

    const { error } = await auth.db.from("patients").update(patch).eq("user_id", auth.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(await readProfile(auth));
});

/* ---- scores --------------------------------------------------------------*/
app.get("/api/scores", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const limit = Math.min(Number(req.query.limit) || 60, 200);
    const { data, error } = await auth.db
        .from("game_scores")
        .select("id, game_type, category, score, attempts, duration_seconds, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map((row) => ({ ...row, day: localDay(row.created_at) })));
});

app.post("/api/scores", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { name, score, attempts = 1, durationSeconds = 180 } = req.body || {};
    const numericScore = Number(score);
    if (!name || !Number.isFinite(numericScore)) {
        return res.status(400).json({ error: "A game name and score are required." });
    }

    const { data, error } = await auth.db
        .from("game_scores")
        .insert({
            user_id: auth.user.id,
            game_type: name,
            category: CATEGORY_BY_GAME[name] || "Cognitive",
            score: Math.max(0, Math.min(100, Math.round(numericScore))),
            attempts: Math.max(1, Number(attempts) || 1),
            duration_seconds: Math.max(30, Number(durationSeconds) || 180)
        })
        .select("id, game_type, category, score, attempts, duration_seconds, created_at")
        .single();

    if (error) return res.status(500).json({ error: error.message });

    /* Keep the stored streak in step with the new session. */
    const { data: allDays } = await auth.db
        .from("game_scores")
        .select("created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(200);

    const streak = computeStreak((allDays || []).map((row) => localDay(row.created_at)));
    await auth.db
        .from("patients")
        .update({ streak, updated_at: new Date().toISOString() })
        .eq("user_id", auth.user.id);

    res.status(201).json({ ...data, day: localDay(data.created_at), streak });
});

/* ---- summary (drives both dashboards) ------------------------------------*/
app.get("/api/summary", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

    const { data, error } = await auth.db
        .from("game_scores")
        .select("id, game_type, category, score, attempts, duration_seconds, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(400);

    if (error) return res.status(500).json({ error: error.message });

    const sessions = (data || []).map((row) => ({
        ...row,
        day: localDay(row.created_at),
        category: row.category || CATEGORY_BY_GAME[row.game_type] || "Cognitive"
    }));

    /* --- day-by-day series, oldest first, gaps included as zero days ------ */
    const today = todayKey();
    const series = [];
    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const day = shiftDay(today, -offset);
        const rows = sessions.filter((row) => row.day === day);
        const scores = rows.map((row) => row.score);
        series.push({
            day,
            label: new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short" })
                .format(new Date(`${day}T12:00:00Z`)),
            dateLabel: new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "2-digit", month: "short" })
                .format(new Date(`${day}T12:00:00Z`)),
            sessions: rows.length,
            avgScore: average(scores),
            bestScore: scores.length ? Math.max(...scores) : 0,
            minutes: Math.round(rows.reduce((total, row) => total + (row.duration_seconds || 180), 0) / 60),
            isToday: day === today
        });
    }

    /* --- per-category breakdown ------------------------------------------ */
    const categories = {};
    sessions.forEach((row) => {
        const bucket = categories[row.category] || (categories[row.category] = { category: row.category, sessions: 0, scores: [] });
        bucket.sessions += 1;
        bucket.scores.push(row.score);
    });
    const breakdown = Object.values(categories)
        .map((bucket) => ({
            category: bucket.category,
            sessions: bucket.sessions,
            avgScore: average(bucket.scores),
            bestScore: Math.max(...bucket.scores)
        }))
        .sort((a, b) => b.sessions - a.sessions);

    /* --- headline numbers ------------------------------------------------- */
    const windowStart = shiftDay(today, -(days - 1));
    const windowRows = sessions.filter((row) => row.day >= windowStart);
    const allScores = sessions.map((row) => row.score);
    const streak = computeStreak(sessions.map((row) => row.day));
    const wellbeing = wellbeingIndex(sessions);

    res.json({
        profile: await readProfile(auth),
        totals: {
            sessions: sessions.length,
            sessionsInWindow: windowRows.length,
            sessionsToday: sessions.filter((row) => row.day === today).length,
            avgScore: average(windowRows.length ? windowRows.map((row) => row.score) : allScores),
            avgScoreAllTime: average(allScores),
            bestScore: allScores.length ? Math.max(...allScores) : 0,
            minutesInWindow: Math.round(windowRows.reduce((total, row) => total + (row.duration_seconds || 180), 0) / 60),
            minutesTotal: Math.round(sessions.reduce((total, row) => total + (row.duration_seconds || 180), 0) / 60),
            activeDays: new Set(windowRows.map((row) => row.day)).size,
            streak
        },
        wellbeing,
        series,
        breakdown,
        recent: sessions.slice(0, 12)
    });
});

/* ---- caregiver alerts ----------------------------------------------------*/
app.get("/api/alerts", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;

    const { data, error } = await auth.db
        .from("cognitive_alerts")
        .select("id, alert_title, alert_body, kind, status, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) return res.status(500).json({ error: error.message });

    const logged = (data || []).map((row) => ({
        id: `db-${row.id}`,
        title: row.alert_title,
        body: row.alert_body || "Acknowledged by the caretaker.",
        kind: row.kind || "reminder",
        status: row.status,
        createdAt: row.created_at
    }));

    const acknowledgedTitles = new Set(logged.map((row) => row.title.toLowerCase()));
    const pending = SEED_ALERTS
        .filter((alert) => !acknowledgedTitles.has(alert.title.toLowerCase()))
        .map((alert, index) => ({
            id: `seed-${index}`,
            title: alert.title,
            body: alert.body,
            kind: alert.kind,
            status: "Pending",
            createdAt: null
        }));

    res.json({ pending, logged });
});

async function logAlert(auth, body, res) {
    const { alertTitle, alertBody, kind = "reminder", status = "Acknowledged" } = body || {};
    if (!alertTitle) return res.status(400).json({ error: "An alert title is required." });

    const { data, error } = await auth.db
        .from("cognitive_alerts")
        .insert({
            user_id: auth.user.id,
            alert_title: alertTitle,
            alert_body: alertBody || null,
            kind,
            status
        })
        .select("id, alert_title, alert_body, kind, status, created_at")
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ success: true, alert: data });
    return true;
}

app.post("/api/alerts", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    await logAlert(auth, req.body, res);
});

/* Kept for compatibility with the earlier front-end call. */
app.post("/api/notify-caregiver", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const logged = await logAlert(auth, req.body, res);
    if (!logged) return;

    const { data: patientData } = await auth.db
        .from("patients")
        .select("name, caretaker_mobile")
        .eq("user_id", auth.user.id)
        .maybeSingle();
    const { alertTitle } = req.body || {};

    // 4. Send SMS using the utility
    try {
        await sendSms({
            to: patientData?.caretaker_mobile,
            body: `${patientData?.name || "Patient"}: ${alertTitle}. Please check in.`
        });
    } catch (smsError) {
        console.error("Caregiver SMS failed:", smsError.message);
        // We still return 200 because the database log was successful
    }
});

/* --------------------------------------------------------------- fallback */
app.use((req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
    res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(port, () => {
    console.log(`MindBridge running at http://localhost:${port}`);
    if (!supabase) console.warn("⚠  Supabase is not configured — add SUPABASE_URL and a key to .env");
    console.log(`Supabase configured: ${supabase ? "yes" : "no"}`);
});

module.exports = app;
