const mongoose = require('mongoose');

const GameScoreSchema = new mongoose.Schema({
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: true 
  },
  gameType: { type: String, default: 'Memory Recall - Cultural Pairs' },
  score: { type: Number, required: true },
  attempts: { type: Number, required: true },
  difficultyLevel: { type: Number, default: 1 },
  // Fields populated by the AI Agent
  aiSpokenMessage: { type: String, default: '' },
  aiClinicalObservation: { type: String, default: '' },
  completedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GameScore', GameScoreSchema);