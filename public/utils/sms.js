const twilio = require("twilio");

async function sendSms({ to, body }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER; // Your +17372508034 number

    if (!accountSid || !authToken || !from) {
        console.warn("Twilio credentials missing. SMS skipped.");
        return;
    }

    const client = twilio(accountSid, authToken);

    try {
        const message = await client.messages.create({
            body: body,
            from: from,
            to: to,
        });
        console.log("SMS sent! SID:", message.sid);
        return message;
    } catch (error) {
        console.error("Twilio SMS failed:", error.message);
        throw error;
    }
}

module.exports = sendSms;