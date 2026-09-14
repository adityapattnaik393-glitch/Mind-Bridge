const { Resend } = require("resend");

async function sendEmail({ to, subject, html }) {
    if (!to) {
        throw new Error("Caregiver email is not available.");
    }
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
        console.warn("Email provider is not configured. Email alert skipped.");
        return null;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
    });

    if (result.error) throw new Error(result.error.message || "Email delivery failed.");
    console.log("Caregiver email sent:", result.data?.id || "accepted");
    return result.data;
}

module.exports = sendEmail;
