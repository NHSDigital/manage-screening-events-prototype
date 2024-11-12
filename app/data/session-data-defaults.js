// app/data/session-data-defaults.js

const users = require("./users");
const breastScreeningUnits = require("./breast-screening-units");
const ethnicities = require("./ethnicities");
const path = require('path');
const fs = require('fs');

// Check if generated data folder exists
const generatedDataPath = path.join(__dirname, 'generated');

let participants = [];
let clinics = [];
let events = [];

// Generate data if folder doesn't exist
if (!fs.existsSync(generatedDataPath)) {
  console.log('Generating seed data...');
  require('../lib/generate-seed-data.js');
}

// Load generated data
try {
  participants = require("./generated/participants.json").participants;
  clinics = require("./generated/clinics.json").clinics;
  events = require("./generated/events.json").events;
} catch (err) {
  console.warn('Error loading generated data:', err);
}

module.exports = {
  users,
  currentUser: users[0],
  breastScreeningUnits,
  participants,
  clinics,
  events
};
