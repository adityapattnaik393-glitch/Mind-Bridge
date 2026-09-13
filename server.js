const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');
const Patient = require('./models/Patient');
const GameScore = require('./models/GameScore');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dementia_care_db';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Basic CORS restriction
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Guard against payload bloat
app.use(express.static(path.join(__dirname, 'public')));

// 1. Safe Patient Lookup (Creates fallback if none exists)
app.get('/api/patient', async (req, res) => {
  try {
    let patient = await Patient.findOne();
    if (!patient) {
      patient = await Patient.create({
        name: 'Elderly Participant',
        age: 73,
        region: 'North Eastern Region (NER)',
        caregiverName: 'Assigned Caregiver',
        caregiverPhone: '+91 9876543210'
      });
    }
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Database error fetching patient' });
  }
});

// 2. Score Submission with Input Validation
app.post('/api/scores', async (req, res) => {
  try {
    const { patientId, score, attempts, difficultyLevel, patientName } = req.body;

    // Strict validation
    if (!patientId || !mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ error: 'Valid patientId is required.' });
    }
    if (typeof score !== 'number' || typeof attempts !== 'number') {
      return res.status(400).json({ error: 'Score and attempts must be numeric.' });
    }

    let aiSpokenMessage = 'Well done on completing today’s activity.';
    let aiCaregiverNote = 'Session recorded within expected engagement range.';

    // AI Companion Call
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are a supportive, gentle companion for an elderly user engaging in cognitive stimulation exercises.
Name: ${patientName || 'Friend'}. Score: ${score}/100 with ${attempts} attempts.
Provide a JSON response with:
1. "spokenMessage": Max 2 sentences, calm, warm, encouraging North Eastern hospitality tone.
2. "caregiverNote": 1 objective sentence describing engagement pace (non-diagnostic, assistive observation only).
Return ONLY raw JSON: {"spokenMessage": "...", "caregiverNote": "..."}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const raw = response.text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(raw);
        aiSpokenMessage = parsed.spokenMessage || aiSpokenMessage;
        aiCaregiverNote = parsed.caregiverNote || aiCaregiverNote;
      } catch (aiErr) {
        console.warn('AI fallback used:', aiErr.message);
      }
    }

    const newScore = new GameScore({
      patientId,
      score: Math.min(100, Math.max(0, score)),
      attempts: Math.max(1, attempts),
      difficultyLevel: difficultyLevel || 1,
      aiSpokenMessage,
      aiClinicalObservation: aiCaregiverNote // Retains compatibility with schema
    });

    await newScore.save();
    res.status(201).json({ success: true, data: newScore });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error saving score' });
  }
});

// 3. Caregiver Dashboard Feed
app.get('/api/scores/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID format.' });
    }

    const scores = await GameScore.find({ patientId })
      .sort({ completedAt: -1 })
      .limit(10);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve logs.' });
  }
});

// Startup: Await MongoDB connection before listening
async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Fatal: Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

startServer();