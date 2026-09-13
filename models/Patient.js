const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Elderly Resident' },
  age: { type: Number, default: 74 },
  region: { type: String, default: 'Assam / North East India' },
  caregiverName: { type: String, default: 'Family Caregiver' },
  caregiverPhone: { type: String, default: '+91 9876543210' },
  preferredLanguage: { type: String, default: 'English' }
}, { timestamps: true });

module.exports = mongoose.model('Patient', PatientSchema);