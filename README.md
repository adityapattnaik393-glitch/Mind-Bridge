# MindBridge

MindBridge is a Supabase-backed cognitive care platform for older adults and their caregivers. It combines patient-facing cognitive games, a caregiver dashboard, session tracking, reminder alerts, AI-supported conversation tools, and structured data persistence.

This repository is the working app, not a starter template. The current codebase already includes the Express backend, frontend pages, game hub, Supabase integration, and the SQL schema needed to run it locally or deploy it.

## What is included

- Patient login and account creation with Supabase Auth
- Caregiver and patient profile flow
- Weekly and historical score summaries
- Streak tracking and progress analytics
- Multiple cognitive games and a game selection hub
- Caregiver reminder/alert workflow
- Optional email notifications via Resend or SMTP
- AI chat and word-question endpoints using Gemini
- Browser-based voice narration for game instructions and prompts

## Current project stage

This project is in a functional application stage, with a working backend and frontend wired to Supabase. It is intended to be run as a full-stack app with a proper database and environment variables configured.

The schema and server are already built around a caretaker-led sign-up flow, patient data ownership, and secure per-user access patterns. The code assumes a real Supabase project is configured and that environment secrets remain server-side only.

## Architecture

- Frontend: static pages under [public](public)
- Backend: [server.js](server.js)
- Data layer: Supabase Postgres via [supabase/schema.sql](supabase/schema.sql)
- Additional utilities: [utils](utils)

The app uses:

- Supabase Auth for account creation, login, and session validation
- Supabase Postgres for patient data, game scores, alerts, and gifts
- Express for REST endpoints and static asset serving
- Resend or SMTP for caregiver email notifications
- Gemini for AI features when configured

## Prerequisites

Before running the app, you need:

- Node.js 18+ or newer
- A Supabase project
- A configured PostgreSQL schema in Supabase
- A valid email provider if you want caregiver alert emails
- Optional: Gemini API key for AI features

## Quick start

1. Create or open a Supabase project.
2. In the Supabase SQL Editor, run [supabase/schema.sql](supabase/schema.sql).
3. Create a local environment file named `.env` in the project root.
4. Add the following values:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
APP_URL=http://localhost:5000
```

Optional configuration for care alerts:

```env
RESEND_API_KEY=re_your_key
EMAIL_FROM=MindBridge <alerts@your-verified-domain.com>
```

Optional configuration for AI features:

```env
GEMINI_API_KEY=your_gemini_key
```

Optional SMTP fallback if you are not using Resend:

```env
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
```

## Install and run

```bash
npm install
npm start
```

For local development with auto-restart:

```bash
npm run dev
```

Then open:

```text
http://localhost:5000
```

## First-time setup flow

1. Sign up with a real email address.
2. Confirm the email if Supabase email confirmation is enabled.
3. Sign in with the same email and password.
4. Complete the patient and caregiver profile flow.
5. Start using the patient dashboard and games.

> Supabase Auth may send a confirmation email. If confirmation is required, the redirect URL must include the app callback for the app to complete the flow correctly.

## Required redirect URL

In Supabase, add this redirect URL under Authentication → URL Configuration → Redirect URLs:

```text
http://localhost:5000/index.html?confirmed=1
```

For production, set `APP_URL` to your deployed HTTPS URL and add:

```text
https://your-domain.com/index.html?confirmed=1
```

## Important environment notes

- `SUPABASE_ANON_KEY` is a publishable key used by the browser or server; do not expose service-role keys in front-end code.
- The backend validates the bearer token before reading or writing patient data, scores, alerts, or gifts.
- Rows are protected by both server-side token validation and RLS policies in [supabase/schema.sql](supabase/schema.sql).
- Never commit real secrets to GitHub or expose them in browser-side JavaScript.

## Features and API behavior

### Authentication

The backend exposes endpoints such as:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`

### Patient data and games

- `GET /api/profile`
- `PATCH /api/profile`
- `GET /api/scores`
- `POST /api/scores`
- `GET /api/recent-activity`
- `GET /api/streak`
- `GET /api/summary`

These endpoints use the authenticated user's access token and ensure the data returned matches that user's own record.

### Alerts and caregiver notifications

- `GET /api/alerts`
- `POST /api/alerts`
- `GET /api/gifts`
- `POST /api/gifts`
- `POST /api/notify-caregiver`

The app logs alert events in Supabase and optionally sends an actual email using Resend when configured.

### AI support

Optional AI routes are available when `GEMINI_API_KEY` is set:

- `POST /api/ai/chat`
- `POST /api/ai/word-question`
- `POST /api/chat-with-gemini`

## Project structure

```text
.
├── public/                  # static frontend pages and client-side scripts
├── supabase/
│   └── schema.sql          # database schema and RLS setup
├── utils/                  # support scripts and fix notes
├── server.js               # main Express app
├── package.json            # Node dependencies and scripts
├── README.md               # project overview and setup guide
├── INSTALL.md              # older install notes, kept for reference
├── email-queue-solution.js
├── api-notify-caregiver-fixed.js
└── .env.example (if added locally)
```

## Security guidance

This project stores sensitive values in the server environment. Keep the following out of browser code and source control:

- Supabase service-role keys
- Resend API keys
- Gemini API keys
- SMTP passwords
- Any database passwords

If a secret is exposed, rotate it immediately in the provider dashboard.

## Troubleshooting

### Sign-up succeeds but user cannot sign in

- Confirm the user email is verified if email confirmation is enabled.
- Check Supabase Auth settings for redirect URLs.
- Ensure the schema has been applied before testing signup.

### No alerts or emails arrive

- Confirm `RESEND_API_KEY` and `EMAIL_FROM` are set.
- If using SMTP, ensure `EMAIL_USER` and `EMAIL_PASS` are valid.
- Check the app logs and Supabase alert rows for delivery state.

### API returns 401 or 403

- Sign in again to refresh the session.
- Ensure the Access token is sent as a bearer token in the Authorization header.
- Confirm the user has a valid row in Supabase and the RLS policies are active.

### Supabase not configured

- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env`.
- Make sure the project is created and active in Supabase.

## Notes

- The app is designed around a caregiver-facing workflow where a person helps manage a patient’s cognitive wellness.
- The project is intended for production-style local deployment and hosted use, not just static demo behavior.
- The maturity level is beyond a minimal prototype; the backend, schema, alerts, scoring flow, and dashboards are all part of the same app.

## License

This project is distributed under the repository license. Check the license file in the root directory for details.
