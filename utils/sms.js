const twilio = require("twilio");

async function sendSms({ to, body }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !from) {
        const error = new Error(
            "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in .env"
        );
        error.code = "TWILIO_MISSING_CONFIG";
        console.error(error.message);
        throw error;
    }

    const client = twilio(accountSid, authToken);

    try {
        const message = await client.messages.create({
            body,
            from,
            to
        });
        console.log("SMS sent! SID:", message.sid, "To:", to);
        return message;
    } catch (error) {
        console.error("Twilio API failed:", error.message);
        throw error;
    }
}

module.exports = sendSms;