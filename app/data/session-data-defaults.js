// app/data/session-data-defaults.js

const users = require("./users");
const breastScreeningUnits = require("./breast-screening-units");
const ethnicities = require("./ethnicities");

// Load generated data
let participants = [];
let clinics = [];
let events = [];

try {
  participants = require("./generated/participants.json").participants;
  clinics = require("./generated/clinics.json").clinics;
  events = require("./generated/events.json").events;
} catch (err) {
  console.warn('Generated data files not found. Please run the data generator first.');
}

module.exports = {
  users,
  currentUser: users[0],
  breastScreeningUnits,
  participants,
  clinics,
  events
};
