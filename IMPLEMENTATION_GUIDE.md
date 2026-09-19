# Email Queue Implementation Guide - MindBridge

## Problem Summary
Your app is **blocking requests** while sending emails during the render/response cycle. When Resend API times out, it freezes your entire request, causing:
- ❌ ENETUNREACH errors
- ❌ Connection timeouts
- ❌ Client hanging/timeouts
- ❌ Poor user experience

---

## Solution: Async Email Queue

### Step 1: Add Email Queue Module
Save the email queue code as `utils/email-queue.js`:

```javascript
// utils/email-queue.js
const { Resend } = require("resend");

class EmailQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.maxRetries = 3;
        this.retryDelay = 5000;
    }

    async send(emailData) {
        this.queue.push({
            ...emailData,
            retries: 0,
            createdAt: new Date()
        });

        if (!this.isProcessing) {
            this.processQueue();
        }

        return { queued: true };
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const emailData = this.queue.shift();
            try {
                const result = await this.sendEmail(emailData);
                console.log(`✅ Email sent to ${emailData.to}`);
            } catch (error) {
                console.error(`❌ Email failed for ${emailData.to}:`, error.message);
                
                if (emailData.retries < this.maxRetries) {
                    emailData.retries++;
                    await new Promise(r => 
                        setTimeout(r, this.retryDelay * emailData.retries)
                    );
                    this.queue.push(emailData);
                }
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        
        this.isProcessing = false;
    }

    async sendEmail(emailData) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Email send timeout")), 30000)
        );

        const sendPromise = resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html
        });

        return Promise.race([sendPromise, timeoutPromise]);
    }
}

module.exports = new EmailQueue();
```

---

### Step 2: Update Your API Endpoint

**BEFORE (Blocking):**
```javascript
app.post("/api/notify-caregiver", async (req, res) => {
    try {
        // ... validation code ...
        
        // ❌ THIS BLOCKS THE RESPONSE
        const result = await resend.emails.send({
            from: process.env.EMAIL_FROM,
            to: caretaker_email,
            subject: "Alert",
            html: htmlContent
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

**AFTER (Non-Blocking):**
```javascript
const emailQueue = require("./utils/email-queue");

app.post("/api/notify-caregiver", async (req, res) => {
    try {
        // ... validation code ...
        
        // ✅ RETURN IMMEDIATELY
        res.status(202).json({
            success: true,
            message: "Notification queued",
            queued_at: new Date()
        });

        // ✅ SEND EMAIL IN BACKGROUND (no await)
        emailQueue.send({
            to: caretaker_email,
            subject: "Alert",
            html: htmlContent
        }).catch(err => {
            console.error("Queue error:", err);
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

### Step 3: Secure Email Configuration

Add timeout handling to your `.env`:

```env
# Email Service
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=MindBridge <alerts@yourdomain.com>

# Queue Settings
EMAIL_QUEUE_MAX_RETRIES=3
EMAIL_QUEUE_RETRY_DELAY=5000
EMAIL_TIMEOUT_MS=30000
```

---

### Step 4: Handle Network Issues

Create a wrapper for all email operations:

```javascript
// utils/safe-email.js
const emailQueue = require("./email-queue");

async function safeQueueEmail({ to, subject, html }) {
    try {
        // Validate email format
        if (!to || !to.includes("@")) {
            console.warn(`Invalid email: ${to}`);
            return { error: "Invalid email address" };
        }

        // Queue without blocking
        await emailQueue.send({ to, subject, html });
        return { success: true, queued: true };
        
    } catch (error) {
        console.error("Email queue error:", error);
        // Don't throw - return error object
        return { error: error.message };
    }
}

module.exports = { safeQueueEmail };
```

---

### Step 5: Update Application Code

If you have email sending in other places (e.g., signup, form submission), update them all:

```javascript
// Old way (blocking)
const result = await sendEmail(recipient, subject, html);

// New way (non-blocking)
emailQueue.send({ to: recipient, subject, html });
return res.json({ success: true }); // Return immediately
```

---

## Testing

### Test 1: Verify Non-Blocking Response
```bash
curl -X POST http://localhost:5000/api/notify-caregiver \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"alert_message": "Test", "score": 100}'
```

Expected: **Instant response** (202 Accepted), email sends in background

### Test 2: Check Queue Status
Add this debug endpoint:

```javascript
app.get("/api/email-queue-status", (req, res) => {
    const emailQueue = require("./utils/email-queue");
    res.json({
        queued: emailQueue.queue.length,
        isProcessing: emailQueue.isProcessing,
        queue: emailQueue.queue.map(e => ({
            to: e.to,
            retries: e.retries,
            createdAt: e.createdAt
        }))
    });
});
```

---

## Monitoring & Logging

Add this to your startup:

```javascript
const emailQueue = require("./utils/email-queue");

// Log queue status every minute
setInterval(() => {
    console.log(`📧 Email Queue Status:`, {
        pending: emailQueue.queue.length,
        isProcessing: emailQueue.isProcessing,
        timestamp: new Date().toISOString()
    });
}, 60000);
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Emails still not sending | `RESEND_API_KEY` not set | Check `.env` file |
| Queue grows indefinitely | No retry mechanism | Increase `maxRetries` or check Resend status |
| Client timeout (30s+) | Old blocking code still running | Update ALL email calls to use queue |
| ENETUNREACH errors | Network connectivity issues | Add retry with exponential backoff |

---

## Production Checklist

- [ ] Email queue is running as background process
- [ ] All API endpoints return immediately (202 Accepted for emails)
- [ ] Resend API key is in `.env`, not hardcoded
- [ ] Email failures are logged to database
- [ ] Monitoring shows queue status
- [ ] Rate limiting prevents email flooding
- [ ] Timeout set to 30 seconds max

---

## Next Steps

1. **Implement the email queue** (Step 1-2)
2. **Test with curl** to verify non-blocking response
3. **Monitor logs** for successful sends
4. **Deploy to production** with queue running
5. **Add database logging** for failed emails (optional but recommended)

---

## Support

If emails still fail:
1. Check `.env` for `RESEND_API_KEY`
2. Verify Resend account is active
3. Check email address format
4. Review console logs for specific errors
5. Check network connectivity to Resend API

