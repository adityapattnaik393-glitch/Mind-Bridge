# 🎯 MindBridge Gemini Chatbox - EXACT FILE LOCATIONS & LINE NUMBERS

---

## 📁 **FILE 1: `package.json`**

**Location:** Root directory  
**Action:** Add Gemini dependency

**Find this section (usually around line 10-15):**
```json
"dependencies": {
  "express": "^4.x",
  "cors": "^2.x",
  "supabase": "^2.x",
  "resend": "^0.x"
}
```

**Change to (ADD THIS LINE):**
```json
"dependencies": {
  "express": "^4.x",
  "cors": "^2.x",
  "supabase": "^2.x",
  "resend": "^0.x",
  "@google/generative-ai": "^0.3.0"
}
```

**Command to run after:**
```bash
npm install
```

---

## 📁 **FILE 2: `.env`**

**Location:** Root directory  
**Action:** Add Gemini API key

**Add this line at the END of the file:**
```env
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

**Example `.env` file:**
```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-key
APP_URL=http://localhost:5000
GEMINI_API_KEY=AIzaSyD...your-key...
RESEND_API_KEY=re_your_key
EMAIL_FROM=MindBridge <alerts@your-domain.com>
```

---

## 📁 **FILE 3: `server.js` (MAIN FILE - 4 ADDITIONS)**

**Location:** Root directory

### **ADDITION 1: Import Gemini (Around line 3-5)**

**Find these lines:**
```javascript
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
```

**Add AFTER line 5:**
```javascript
const { GoogleGenerativeAI } = require("@google/generative-ai");
```

**Result should look like:**
```javascript
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");  // ← NEW LINE
```

---

### **ADDITION 2: Initialize Gemini (Around line 10-20)**

**Find this section (after require statements and .env loading):**
```javascript
require("dotenv").config();

const app = express();
```

**Add BETWEEN `require("dotenv").config();` and `const app = express();`:**

```javascript
// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY
      })
    : null;

if (!genAI && process.env.NODE_ENV === "production") {
    console.warn("⚠️ GEMINI_API_KEY not configured. AI features disabled.");
}
```

**Result:**
```javascript
require("dotenv").config();

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY
      })
    : null;

if (!genAI && process.env.NODE_ENV === "production") {
    console.warn("⚠️ GEMINI_API_KEY not configured. AI features disabled.");
}

const app = express();
```

---

### **ADDITION 3: Add Helper Function (Around line 150-200)**

**Find where your other helper functions are** (look for `async function authenticate()` or `async function readProfile()`)

**Add this function in that same section:**

```javascript
/* ---- Helper: Get Patient Context for AI ---- */
async function getPatientAIContext(auth) {
    const profile = await readProfile(auth);

    const { data: scores, error } = await auth.db
        .from("game_scores")
        .select(
            "game_type, category, score, attempts, duration_seconds, created_at"
        )
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(30);

    if (error) {
        throw new Error("Unable to load patient game history.");
    }

    return {
        patient: {
            name: profile.patientName,
            age: profile.age,
            language: profile.language?.label || "English",
            region: profile.region
        },
        recentGames: scores || []
    };
}
```

---

### **ADDITION 4: Add AI Routes (Around line 400-500)**

**Find this section** (look for `app.post("/api/notify-caregiver"` or similar API routes)

**Add BEFORE the `/api/notify-caregiver` route:**

```javascript
/* ============================================================
   AI CHAT ROUTE
============================================================ */
app.post("/api/ai/chat", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!genAI) {
        return res.status(503).json({
            error: "AI service is not configured."
        });
    }

    try {
        const message = String(req.body?.message || "").trim();

        if (!message) {
            return res.status(400).json({
                error: "Message is required."
            });
        }

        if (message.length > 1000) {
            return res.status(400).json({
                error: "Message is too long."
            });
        }

        const context = await getPatientAIContext(auth);

        const prompt = `
You are MindBridge, a friendly cognitive companion for an elderly person.

IMPORTANT:
- Be warm, patient and simple.
- Use short sentences.
- Avoid complicated medical terminology.
- Do not pretend to be a doctor.
- Do not diagnose dementia or any medical condition.
- If asked for medical advice, suggest contacting a healthcare professional.
- Encourage conversation and positive engagement.
- Respond in the patient's preferred language when possible.

PATIENT INFORMATION:
Name: ${context.patient.name}
Age: ${context.patient.age}
Preferred language: ${context.patient.language}
Region: ${context.patient.region}

RECENT COGNITIVE GAME HISTORY:
${JSON.stringify(context.recentGames, null, 2)}

PATIENT MESSAGE:
${message}

Give a warm, conversational response.
`;

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const result = await model.generateContent(prompt);
        const reply = result.response.text();

        res.json({
            reply: reply || "I'm here with you. Tell me more."
        });

    } catch (error) {
        console.error("Gemini chat error:", error);
        res.status(500).json({
            error: "The AI assistant is temporarily unavailable."
        });
    }
});

/* ============================================================
   WORD GARDEN AI ROUTE
============================================================ */
app.post("/api/ai/word-question", async (req, res) => {
    const auth = await authenticate(req, res);
    if (!auth) return;

    if (!genAI) {
        return res.status(503).json({
            error: "AI service is not configured."
        });
    }

    try {
        const context = await getPatientAIContext(auth);

        const usedWords = Array.isArray(req.body?.usedWords)
            ? req.body.usedWords
            : [];

        const safeUsedWords = usedWords
            .map(word => String(word).trim())
            .filter(Boolean)
            .slice(-100);

        const prompt = `Generate a simple vocabulary exercise for an elderly patient.

PATIENT:
Name: ${context.patient.name}
Age: ${context.patient.age}
Language: ${context.patient.language}

RECENT PERFORMANCE:
${JSON.stringify(context.recentGames.slice(0, 5))}

WORDS ALREADY USED:
${JSON.stringify(safeUsedWords)}

Generate ONE NEW vocabulary question.

Rules:
1. Do NOT repeat any previously used word
2. Use simple, everyday vocabulary
3. Create exactly 4 options
4. One option must be the correct answer
5. Avoid obscure words
6. Use familiar objects, foods, places, emotions

Respond ONLY with this exact JSON format:
{
  "prompt": "Which word means happy?",
  "options": ["Joyful", "Chair", "Rain", "Window"],
  "answer": "Joyful",
  "word": "Joyful"
}

Do not include any other text.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();

        // Remove markdown code blocks if present
        if (responseText.startsWith("```json")) {
            responseText = responseText.slice(7);
        }
        if (responseText.startsWith("```")) {
            responseText = responseText.slice(3);
        }
        if (responseText.endsWith("```")) {
            responseText = responseText.slice(0, -3);
        }

        const question = JSON.parse(responseText.trim());

        // Validate response
        if (
            !question.prompt ||
            !Array.isArray(question.options) ||
            question.options.length !== 4 ||
            !question.answer ||
            !question.word
        ) {
            throw new Error("Invalid question format from Gemini.");
        }

        if (safeUsedWords.includes(question.word.toLowerCase())) {
            console.log("Word already used, retrying...");
            return res.status(409).json({
                error: "Word repeated. Try again."
            });
        }

        res.json(question);

    } catch (error) {
        console.error("Word Garden AI error:", error.message);
        res.status(500).json({
            error: "Unable to generate a new word exercise."
        });
    }
});
```

---

## 📁 **FILE 4: `supabase/schema.sql`**

**Location:** `supabase/` folder  
**Action:** Add Word Garden History table

**Add this at the END of the file (after all existing tables):**

```sql
-- ============================================================================
-- WORD GARDEN HISTORY  (track used words to prevent repetition)
-- ============================================================================

create table if not exists public.word_garden_history (
    id bigint generated by default as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    word text not null,
    prompt text not null,
    created_at timestamptz not null default now()
);

create index if not exists word_garden_history_user_idx
    on public.word_garden_history (user_id, created_at desc);

-- Enable RLS
alter table public.word_garden_history enable row level security;

drop policy if exists "own words" on public.word_garden_history;
create policy "own words" on public.word_garden_history
    for all using (auth.uid() = user_id);
```

**Then run this in Supabase SQL Editor:**
1. Log into Supabase
2. Go to SQL Editor
3. Paste the code above
4. Click "Run"

---

## 📁 **FILE 5: `public/patient.html`**

**Location:** `public/` folder  
**Action:** Add Chat UI section

**Find this line** (usually around line 40-80):
```html
<script src="app.js"></script>
<script src="i18n.js"></script>
<script src="patient.js"></script>
```

**Find the `<main>` section** (usually starts with `<main class="patient-dashboard">`). Look for where the games section starts (around line 100-150).

**Add this BEFORE the games section** (before `<section class="panel">` that contains games):

```html
<!-- AI CHAT SECTION -->
<section class="panel">
    <div class="panel-head">
        <h3>🤖 MindBridge AI Companion</h3>
        <p class="sub">Chat with your cognitive companion</p>
    </div>

    <div id="aiChatMessages" class="ai-chat-messages">
        <div class="ai-message">
            👋 Hello! I'm here to chat with you. What's on your mind?
        </div>
    </div>

    <form id="aiChatForm" class="ai-chat-form">
        <input
            id="aiChatInput"
            type="text"
            maxlength="1000"
            placeholder="Talk to MindBridge AI..."
            autocomplete="off"
        />
        <button id="aiChatSend" class="btn" type="submit">Send</button>
    </form>
</section>
```

**Example of where to add (patient.html):**
```html
    <!-- ... existing header code ... -->

    <!-- AI CHAT SECTION -->  ← ADD HERE
    <section class="panel">
        <div class="panel-head">
            <h3>🤖 MindBridge AI Companion</h3>
            ...
    </section>

    <!-- GAMES SECTION (already exists) -->
    <section class="panel">
        <div class="panel-head">
            <h3>🎮 Cognitive Exercises</h3>
            ...
```

---

## 📁 **FILE 6: `public/patient.js`**

**Location:** `public/` folder  
**Action:** Add chat JavaScript

**Find the END of the file** (usually after all game-related code, around line 300-500)

**Add this at the very END:**

```javascript
/* ============================================================
   MINDBRIDGE AI CHAT
============================================================ */

var aiChatForm = document.getElementById("aiChatForm");
var aiChatInput = document.getElementById("aiChatInput");
var aiChatMessages = document.getElementById("aiChatMessages");
var aiChatSend = document.getElementById("aiChatSend");

function addAIMessage(text, type) {
    var message = document.createElement("div");
    message.className = type === "user"
        ? "user-message"
        : "ai-message";
    message.textContent = text;
    aiChatMessages.appendChild(message);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
}

if (aiChatForm) {
    aiChatForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        var message = aiChatInput.value.trim();
        if (!message) return;

        addAIMessage(message, "user");
        aiChatInput.value = "";
        aiChatInput.disabled = true;
        aiChatSend.disabled = true;

        var thinking = document.createElement("div");
        thinking.className = "ai-message";
        thinking.textContent = "Thinking...";
        aiChatMessages.appendChild(thinking);

        try {
            var result = await MB.api("/api/ai/chat", {
                method: "POST",
                body: JSON.stringify({ message: message })
            });

            thinking.remove();
            addAIMessage(result.reply, "ai");

            // Use browser voice if available
            if (typeof speak === "function") {
                speak(result.reply);
            }

        } catch (error) {
            thinking.remove();
            addAIMessage(
                "I'm having trouble connecting. Please try again.",
                "ai"
            );
            handleError(error);

        } finally {
            aiChatInput.disabled = false;
            aiChatSend.disabled = false;
            aiChatInput.focus();
        }
    });
}
```

**Example (end of patient.js):**
```javascript
    // ... existing game code ...
    closeGameModal();
});

/* ============================================================
   MINDBRIDGE AI CHAT  ← ADD FROM HERE
============================================================ */
var aiChatForm = document.getElementById("aiChatForm");
...
```

---

## 📁 **FILE 7: `public/style.css`**

**Location:** `public/` folder  
**Action:** Add chat styling

**Find the END of the file** (usually line 500+)

**Add this at the very END:**

```css
/* ============================================================
   AI CHAT STYLING
============================================================ */

.ai-chat-messages {
    height: 320px;
    overflow-y: auto;
    padding: 16px;
    border-radius: 12px;
    background: #f9faf8;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
}

.ai-message,
.user-message {
    max-width: 80%;
    padding: 12px 16px;
    border-radius: 12px;
    line-height: 1.5;
    word-wrap: break-word;
}

.ai-message {
    align-self: flex-start;
    background: white;
    border: 1px solid #e0e0e0;
    color: #333;
}

.user-message {
    align-self: flex-end;
    background: #d4f1d4;
    color: #1a3a1a;
}

.ai-chat-form {
    display: flex;
    gap: 10px;
    margin-top: 12px;
}

.ai-chat-form input {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid #d0d5ce;
    font-size: 16px;
    font-family: inherit;
}

.ai-chat-form input:focus {
    outline: none;
    border-color: #66bb6a;
    box-shadow: 0 0 0 2px rgba(102, 187, 106, 0.1);
}

.ai-chat-form button {
    padding: 12px 20px;
    border-radius: 8px;
    background: #66bb6a;
    color: white;
    border: none;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.2s;
}

.ai-chat-form button:hover {
    background: #558b57;
}

.ai-chat-form button:disabled {
    background: #ccc;
    cursor: not-allowed;
}
```

---

## ✅ **QUICK CHECKLIST**

- [ ] **package.json** - Added `@google/generative-ai` dependency
- [ ] **npm install** - Ran the command
- [ ] **.env** - Added `GEMINI_API_KEY=your-key`
- [ ] **server.js Line 5** - Imported GoogleGenerativeAI
- [ ] **server.js Line 10-15** - Initialized genAI
- [ ] **server.js Line 150-170** - Added helper function
- [ ] **server.js Line 400+** - Added both API routes
- [ ] **supabase/schema.sql** - Added word_garden_history table
- [ ] **supabase** - Ran SQL in SQL Editor
- [ ] **public/patient.html** - Added chat section
- [ ] **public/patient.js** - Added chat JavaScript at end
- [ ] **public/style.css** - Added chat CSS at end
- [ ] **Test locally** - `npm start` and verify chat works

---

## 🧪 **TEST LOCALLY**

```bash
cd your-project-directory

# Install dependencies
npm install

# Start server
npm start

# Open browser
# http://localhost:5000

# Create account → Log in → Test chat
```

---

## 🚀 **DEPLOY TO RENDER**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Gemini AI chatbox"
   git push origin main
   ```

2. **Update Render Environment:**
   - Go to Render.com → Your Service
   - Environment → Add Variable
   - Key: `GEMINI_API_KEY`
   - Value: `your-actual-gemini-key`
   - Save and Redeploy

3. **Test on Production:**
   - Visit your Render URL
   - Create account → Test chat

---

## 🐛 **COMMON ERRORS & FIXES**

### Error: `Cannot find module '@google/generative-ai'`
**Fix:** Run `npm install` again

### Error: `GEMINI_API_KEY is undefined`
**Fix:** Check your `.env` file has the actual key, not placeholder

### Chat button doesn't work
**Fix:** Check browser console (F12 → Console) for errors

### AI responds with "service not configured"
**Fix:** Verify `GEMINI_API_KEY` is set in `.env`

---

That's it! Follow this guide line by line and you'll have a working Gemini chatbox! 🎉
