// app/lib/generate-seed-data.js

const { faker } = require('@faker-js/faker');
const weighted = require('weighted');
const fs = require('fs');
const path = require('path');

const { generateParticipant } = require('./generators/participant-generator');
const { generateClinicsForBSU } = require('./generators/clinic-generator');
const { generateEvent } = require('./generators/event-generator');

// Load existing data
const breastScreeningUnits = require('../data/breast-screening-units');
const ethnicities = require('../data/ethnicities');

const CONFIG = {
  numberOfParticipants: 1000,
  outputPath: path.join(__dirname, '../data/generated'),
  clinicDefaults: {
    slotsPerDay: 32,
    daysToGenerate: 5,
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 8
  },
  eventOutcomes: {
    'clear': 0.95,
    'needs_further_tests': 0.04,
    'cancer_detected': 0.01
  }
};

const generateData = async () => {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(CONFIG.outputPath)) {
    fs.mkdirSync(CONFIG.outputPath, { recursive: true });
  }

  // Generate base data
  console.log('Generating participants...');
  const participants = Array.from({ length: CONFIG.numberOfParticipants }, () => 
    generateParticipant({ ethnicities, breastScreeningUnits })
  );

  console.log('Generating clinics and events...');
  const clinics = [];
  const events = [];

  // Calculate date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 3);

  for (let i = 0; i < CONFIG.clinicDefaults.daysToGenerate; i++) {
    const clinicDate = new Date(startDate);
    clinicDate.setDate(clinicDate.getDate() + i);

    // Generate clinics for each BSU (currently just Oxford)
    breastScreeningUnits.forEach(unit => {
      const newClinics = generateClinicsForBSU({
        date: clinicDate,
        breastScreeningUnit: unit,
        config: CONFIG.clinicDefaults
      });

      // Generate events for each clinic
      newClinics.forEach(clinic => {
        const clinicEvents = clinic.slots
          .filter(slot => Math.random() > 0.2)
          .map(slot => {
            const participant = faker.helpers.arrayElement(participants);
            return generateEvent({
              slot,
              participant,
              clinic,
              outcomeWeights: CONFIG.eventOutcomes
            });
          });

        events.push(...clinicEvents);
      });

      clinics.push(...newClinics);
    });
  }

  // Write generated data to files
  const writeData = (filename, data) => {
    fs.writeFileSync(
      path.join(CONFIG.outputPath, filename),
      JSON.stringify(data, null, 2)
    );
  };

  writeData('participants.json', { participants });
  writeData('clinics.json', { clinics });
  writeData('events.json', { events });

  console.log('\nData generation complete!');
  console.log(`Generated:`);
  console.log(`- ${participants.length} participants`);
  console.log(`- ${clinics.length} clinics`);
  console.log(`- ${events.length} events`);
};

// Run the generator
generateData().catch(console.error);
