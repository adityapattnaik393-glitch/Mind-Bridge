# MindBridge

MindBridge is a Supabase-backed cognitive care dashboard with email/password authentication, persisted game scores, a live weekly chart, caregiver email alerts, three playable exercises, and browser voice narration.

## Run locally

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [supabase/schema.sql](supabase/schema.sql).
3. Copy `.env` and add:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

4. Add email alerts if you want `/api/notify-caregiver` to send email:

```env
RESEND_API_KEY=re_your_key
EMAIL_FROM=MindBridge <alerts@your-verified-domain.com>
```

5. Install and start:

```bash
npm install
npm start
```

Open http://localhost:5000. Create an account with a real email address, confirm it if Supabase email confirmation is enabled, then sign in with that email and password. The phone number is optional contact information only.

## Security

The backend may use `SUPABASE_SECRET_KEY` for server-side requests. Never put that key, a Supabase service-role key, Resend key, Gemini key, or database password in browser code or commit them to Git. If a secret has been exposed, rotate it in the provider dashboard immediately. A publishable/anon key is only needed for a browser-side Supabase client, which this app does not use.

The backend verifies the Supabase access token before reading or writing patient data, scores, or caregiver alerts. Row-level security in [supabase/schema.sql](supabase/schema.sql) adds a second ownership boundary inside Supabase. Caregiver alerts are always logged in Supabase; when Resend is configured, `/api/notify-caregiver` also sends them to the authenticated caretaker email.
# proxy-blocker-all-folders
this folder contains all the code and api key for sih problem statement
