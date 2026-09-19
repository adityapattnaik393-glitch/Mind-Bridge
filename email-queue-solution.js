// ============================================================
// EMAIL QUEUE SERVICE - PREVENTS BLOCKING
// ============================================================

const { Resend } = require("resend");

class EmailQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.maxRetries = 3;
        this.retryDelay = 5000; // 5 seconds
    }

    async send(emailData) {
        // Add to queue immediately
        this.queue.push({
            ...emailData,
            retries: 0,
            createdAt: new Date()
        });

        // Start processing if not already running
        if (!this.isProcessing) {
            this.processQueue();
        }

        // Return immediately - don't wait for email to actually send
        return { queued: true, id: emailData.to };
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const emailData = this.queue.shift();

            try {
                const result = await this.sendEmail(emailData);
                console.log(`✅ Email sent to ${emailData.to}:`, result.id);
            } catch (error) {
                console.error(`❌ Email failed for ${emailData.to}:`, error.message);

                // Retry logic
                if (emailData.retries < this.maxRetries) {
                    emailData.retries++;
                    console.log(
                        `🔄 Retrying (${emailData.retries}/${this.maxRetries}) in ${this.retryDelay}ms...`
                    );

                    // Re-queue with exponential backoff
                    await new Promise(resolve =>
                        setTimeout(resolve, this.retryDelay * emailData.retries)
                    );
                    this.queue.push(emailData);
                } else {
                    console.error(
                        `⚠️ Email to ${emailData.to} failed after ${this.maxRetries} retries`
                    );
                    // Log to database for manual review
                    await this.logFailedEmail(emailData, error);
                }
            }

            // Small delay between emails
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.isProcessing = false;
    }

    async sendEmail(emailData) {
        if (typeof emailData.deliver === "function") {
            return emailData.deliver(emailData);
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        // Add timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Email send timeout")), 30000)
        );

        const sendPromise = resend.emails.send({
            from: process.env.EMAIL_FROM || "noreply@mindbridge.local",
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html
        });

        return Promise.race([sendPromise, timeoutPromise]);
    }

    async logFailedEmail(emailData, error) {
        try {
            // Optional: Log to database
            console.log(`📝 Failed email logged: ${emailData.to}`, {
                error: error.message,
                timestamp: new Date()
            });
        } catch (err) {
            console.error("Failed to log email failure:", err);
        }
    }
}

module.exports = new EmailQueue();
