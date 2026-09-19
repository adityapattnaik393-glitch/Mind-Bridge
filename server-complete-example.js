// ============================================================
// COMPLETE SERVER EXAMPLE WITH EMAIL QUEUE
// ============================================================
// Replace your existing server.js with this pattern

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==================== IMPORTS ====================
const emailQueue = require("./utils/email-queue");

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.static("public"));

// ==================== SUPABASE CLIENT ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ==================== UTILITIES ====================

function verifyAuthToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return { valid: false, error: "Missing authorization header" };
    }
    return { valid: true, token: authHeader.slice(7) };
}

// ==================== API ENDPOINTS ====================

/**
 * POST /api/notify-caregiver
 * Send notification to caregiver (NON-BLOCKING)
 */
app.post("/api/notify-caregiver", async (req, res) => {
    try {
        // Verify auth token
        const auth = verifyAuthToken(req);
        if (!auth.valid) {
            return res.status(401).json({ error: auth.error });
        }

        // Get authenticated user
        const { data, error: authError } = await supabase.auth.getUser(auth.token);
        if (authError || !data.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = data.user.id;
        const { alert_message, score, session_duration } = req.body;

        // Validate input
        if (!alert_message || !alert_message.trim()) {
            return res.status(400).json({ error: "alert_message is required" });
        }

        // Fetch patient data
        const { data: patient, error: patientError } = await supabase
            .from("patients")
            .select("name, caretaker_name, caretaker_email")
            .eq("user_id", userId)
            .single();

        if (patientError || !patient || !patient.caretaker_email) {
            return res.status(404).json({ error: "Patient or caretaker email not found" });
        }

        // ✅ CRITICAL: Return immediately (don't wait for email)
        res.status(202).json({
            success: true,
            message: "Notification queued for delivery",
            queued_at: new Date().toISOString()
        });

        // ✅ Queue email in background (fire and forget)
        const emailHTML = generateAlertEmail({
            patientName: patient.name,
            caretakerName: patient.caretaker_name,
            alertMessage: alert_message,
            score,
            duration: session_duration
        });

        emailQueue.send({
            to: patient.caretaker_email,
            subject: `🧠 MindBridge Alert: ${patient.name}`,
            html: emailHTML
        }).catch(err => {
            console.error(`❌ Failed to queue email for ${patient.caretaker_email}:`, err.message);
        });

        // Optional: Log to database
        await logAlertToDatabase(userId, {
            alert_message,
            score,
            session_duration,
            recipient_email: patient.caretaker_email
        }).catch(err => {
            console.error("Failed to log alert:", err.message);
        });

    } catch (error) {
        console.error("Notify caregiver error:", error);
        return res.status(500).json({ 
            error: "Failed to process notification",
            message: error.message 
        });
    }
});

/**
 * GET /api/email-queue-status
 * Debug endpoint to check email queue status
 */
app.get("/api/email-queue-status", (req, res) => {
    res.json({
        queued_emails: emailQueue.queue.length,
        is_processing: emailQueue.isProcessing,
        max_retries: emailQueue.maxRetries,
        retry_delay_ms: emailQueue.retryDelay,
        pending_jobs: emailQueue.queue.map(email => ({
            to: email.to,
            subject: email.subject,
            retries: email.retries,
            created_at: email.createdAt
        }))
    });
});

/**
 * POST /api/game-score
 * Save game score (example endpoint)
 */
app.post("/api/game-score", async (req, res) => {
    try {
        const auth = verifyAuthToken(req);
        if (!auth.valid) {
            return res.status(401).json({ error: auth.error });
        }

        const { data, error: authError } = await supabase.auth.getUser(auth.token);
        if (authError || !data.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = data.user.id;
        const { score, duration_seconds, game_name } = req.body;

        const { error } = await supabase
            .from("game_scores")
            .insert({
                user_id: userId,
                score,
                duration_seconds,
                game_name
            });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ success: true });

    } catch (error) {
        console.error("Game score error:", error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/patient-stats
 * Get patient statistics (example endpoint)
 */
app.get("/api/patient-stats", async (req, res) => {
    try {
        const auth = verifyAuthToken(req);
        if (!auth.valid) {
            return res.status(401).json({ error: auth.error });
        }

        const { data, error: authError } = await supabase.auth.getUser(auth.token);
        if (authError || !data.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = data.user.id;

        const { data: stats, error } = await supabase
            .from("daily_progress")
            .select("*")
            .eq("user_id", userId)
            .order("day", { ascending: false })
            .limit(7);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        return res.json({ stats });

    } catch (error) {
        console.error("Stats error:", error);
        return res.status(500).json({ error: error.message });
    }
});

// ==================== HELPER FUNCTIONS ====================

function generateAlertEmail({ patientName, caretakerName, alertMessage, score, duration }) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
                .header h1 { font-size: 28px; margin-bottom: 8px; }
                .content { padding: 30px 20px; }
                .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .stats { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                .stat-row:last-child { border-bottom: none; }
                .stat-label { font-weight: 600; color: #666; }
                .stat-value { color: #333; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🧠 MindBridge Care Alert</h1>
                    <p>Patient Activity Notification</p>
                </div>
                
                <div class="content">
                    <p>Hello <strong>${caretakerName}</strong>,</p>
                    <p style="margin-top: 15px;">We wanted to inform you about an activity from your patient ${patientName}:</p>
                    
                    <div class="alert-box">
                        <p><strong>Alert Message:</strong></p>
                        <p>${escapeHTML(alertMessage)}</p>
                    </div>
                    
                    <div class="stats">
                        <p style="margin-bottom: 15px; font-weight: 600; color: #333;">Session Details:</p>
                        ${score !== undefined ? `<div class="stat-row"><span class="stat-label">📊 Score</span><span class="stat-value">${score}</span></div>` : ''}
                        ${duration ? `<div class="stat-row"><span class="stat-label">⏱️ Duration</span><span class="stat-value">${Math.round(duration / 60)} minutes</span></div>` : ''}
                        <div class="stat-row"><span class="stat-label">🕐 Timestamp</span><span class="stat-value">${new Date().toLocaleString('en-IN')}</span></div>
                    </div>
                    
                    <p>Please log in to your MindBridge dashboard to see more details about this activity.</p>
                </div>
                
                <div class="footer">
                    <p>This is an automated alert from MindBridge. Please do not reply to this email.</p>
                    <p style="margin-top: 10px; color: #999;">© 2024 MindBridge. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

async function logAlertToDatabase(userId, alertData) {
    try {
        const { error } = await supabase
            .from("cognitive_alerts")
            .insert({
                user_id: userId,
                alert_message: alertData.alert_message,
                alert_type: "caregiver_notification",
                score: alertData.score || null,
                session_duration: alertData.session_duration || null,
                recipient_email: alertData.recipient_email,
                status: "queued",
                created_at: new Date().toISOString()
            });

        if (error) {
            console.warn("Failed to log alert to database:", error.message);
        }
    } catch (error) {
        console.error("Database logging error:", error);
    }
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== STARTUP ====================

// Monitor email queue
setInterval(() => {
    if (emailQueue.queue.length > 0) {
        console.log(`📧 Email Queue Status:`, {
            pending: emailQueue.queue.length,
            processing: emailQueue.isProcessing,
            timestamp: new Date().toISOString()
        });
    }
}, 60000);

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║         MindBridge Server Running      ║
╠════════════════════════════════════════╣
║  🚀 URL: http://localhost:${PORT}
║  📧 Email Queue: Enabled
║  🔐 Auth: Supabase
║  📊 Status: Ready
╚════════════════════════════════════════╝
    `);
});

module.exports = app;
