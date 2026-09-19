// ============================================================
// FIXED API ENDPOINT - NON-BLOCKING EMAIL
// ============================================================
// Location: server.js or routes/notify.js

const emailQueue = require("./email-queue-solution");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * POST /api/notify-caregiver
 * 
 * BEFORE (BLOCKING):
 * - await resend.emails.send() ← Blocks response until email sent
 * - Client hangs if Resend times out
 * 
 * AFTER (NON-BLOCKING):
 * - Add to queue immediately
 * - Return success to client
 * - Send email in background
 */
async function notifyCaregiver(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing authorization header" });
        }

        const token = authHeader.slice(7);

        // Verify token with Supabase
        const { data, error: authError } = await supabase.auth.getUser(token);
        if (authError || !data.user) {
            return res.status(401).json({ error: "Invalid token" });
        }

        const userId = data.user.id;
        const { alert_message, score, session_duration } = req.body;

        // Fetch patient data
        const { data: patient, error: patientError } = await supabase
            .from("patients")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (patientError || !patient) {
            return res.status(404).json({ error: "Patient not found" });
        }

        // =====================================================
        // CRITICAL FIX: Queue email instead of awaiting it
        // =====================================================
        
        // Return immediately to client
        res.status(202).json({
            success: true,
            message: "Notification queued",
            queued_at: new Date()
        });

        // Send email in background (non-blocking)
        const emailData = {
            to: patient.caretaker_email,
            subject: `MindBridge Alert: ${patient.name}`,
            html: generateEmailHTML({
                patientName: patient.name,
                caretakerName: patient.caretaker_name,
                alertMessage: alert_message,
                score: score,
                duration: session_duration,
                timestamp: new Date()
            })
        };

        // Queue without awaiting
        emailQueue.send(emailData).catch(err => {
            console.error("Failed to queue email:", err);
        });

        // Also log alert to database
        await logAlertToDatabase(userId, {
            alert_message,
            score,
            session_duration,
            recipient_email: patient.caretaker_email,
            status: "queued"
        });

    } catch (error) {
        console.error("Notify caregiver error:", error);
        // Return 500 but don't hang
        res.status(500).json({ error: "Internal server error" });
    }
}

function generateEmailHTML({ patientName, caretakerName, alertMessage, score, duration, timestamp }) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; }
                .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
                .stats { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🧠 MindBridge Care Alert</h1>
                </div>
                <div class="content">
                    <p>Hi <strong>${caretakerName}</strong>,</p>
                    
                    <div class="alert">
                        <p><strong>Alert for ${patientName}:</strong></p>
                        <p>${alertMessage}</p>
                    </div>
                    
                    <div class="stats">
                        <p><strong>Session Details:</strong></p>
                        <p>📊 Score: ${score || 'N/A'}</p>
                        <p>⏱️ Duration: ${duration ? duration + ' seconds' : 'N/A'}</p>
                        <p>🕐 Timestamp: ${timestamp.toLocaleString('en-IN')}</p>
                    </div>
                    
                    <p>Please review the patient dashboard for more details.</p>
                </div>
                <div class="footer">
                    <p>This is an automated alert from MindBridge. Please do not reply to this email.</p>
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
                score: alertData.score,
                session_duration: alertData.session_duration,
                recipient_email: alertData.recipient_email,
                status: alertData.status
            });

        if (error) {
            console.error("Failed to log alert to database:", error);
        }
    } catch (err) {
        console.error("Database logging error:", err);
    }
}

module.exports = { notifyCaregiver };
