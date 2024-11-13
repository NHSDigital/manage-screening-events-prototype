// app/data/session-data-defaults.js

const users = require("./users");
const breastScreeningUnits = require("./breast-screening-units");
const ethnicities = require("./ethnicities");
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');

// Check if generated data folder exists and create if needed
const generatedDataPath = path.join(__dirname, 'generated');
if (!fs.existsSync(generatedDataPath)) {
  fs.mkdirSync(generatedDataPath);
}

let participants = [];
let clinics = [];
let events = [];
let generationInfo = {
  generatedAt: 'Never',
  stats: { participants: 0, clinics: 0, events: 0 }
};

// Check if we need to regenerate data
const generationInfoPath = path.join(generatedDataPath, 'generation-info.json');
let needsRegeneration = true;

if (fs.existsSync(generationInfoPath)) {
  try {
    generationInfo = JSON.parse(fs.readFileSync(generationInfoPath));
    const generatedDate = dayjs(generationInfo.generatedAt).startOf('day');
    const today = dayjs().startOf('day');
    needsRegeneration = !generatedDate.isSame(today, 'day');
  } catch (err) {
    console.warn('Error reading generation info:', err);
    needsRegeneration = true;
  }
}

// Generate or load data
if (needsRegeneration) {
  console.log('Generating new seed data...');
  require('../lib/generate-seed-data.js');
  
  // Save generation info
  fs.writeFileSync(
    generationInfoPath, 
    JSON.stringify({ generatedAt: new Date().toISOString() })
  );
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
  events,
  generationInfo
};
