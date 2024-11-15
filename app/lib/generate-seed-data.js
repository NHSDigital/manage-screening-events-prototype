// app/lib/generate-seed-data.js
// node app/lib/generate-seed-data.js

const { faker } = require('@faker-js/faker');
const weighted = require('weighted');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const { generateParticipant } = require('./generators/participant-generator');
const { generateClinicsForBSU } = require('./generators/clinic-generator');
const { generateEvent } = require('./generators/event-generator');

// Load existing data
const breastScreeningUnits = require('../data/breast-screening-units');
const ethnicities = require('../data/ethnicities');

const generateData = async () => {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.paths.generatedData)) {
    fs.mkdirSync(config.paths.generatedData, { recursive: true });
  }

  // Generate base data
  console.log('Generating participants...');
  const participants = Array.from(
    { length: config.generation.numberOfParticipants }, 
    () => generateParticipant({ ethnicities, breastScreeningUnits })
  );

  console.log('Generating clinics and events...');
  const clinics = [];
  const events = [];

  // Calculate date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - config.clinics.daysBeforeToday);

  for (let i = 0; i < config.clinics.daysToGenerate; i++) {
    const clinicDate = new Date(startDate);
    clinicDate.setDate(clinicDate.getDate() + i);

    // Generate clinics for each BSU
    breastScreeningUnits.forEach(unit => {
      const newClinics = generateClinicsForBSU({
        date: clinicDate,
        breastScreeningUnit: unit
      });

      // Generate events for each clinic
      newClinics.forEach(clinic => {
        const clinicEvents = clinic.slots
          .filter(() => Math.random() < config.generation.bookingProbability)
          .map(slot => {
            const participant = faker.helpers.arrayElement(participants);
            return generateEvent({
              slot,
              participant,
              clinic,
              outcomeWeights: config.screening.outcomes
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
      path.join(config.paths.generatedData, filename),
      JSON.stringify(data, null, 2)
    );
  };

  writeData('participants.json', { participants });
  writeData('clinics.json', { clinics });
  writeData('events.json', { events });
  writeData('generation-info.json', { 
    generatedAt: new Date().toISOString(),
    stats: {
      participants: participants.length,
      clinics: clinics.length,
      events: events.length
    }
  });

  console.log('\nData generation complete!');
  console.log(`Generated:`);
  console.log(`- ${participants.length} participants`);
  console.log(`- ${clinics.length} clinics`);
  console.log(`- ${events.length} events`);
};

// Export the function instead of running it immediately
module.exports = generateData;

// Only run if this file is being run directly
if (require.main === module) {
  generateData().catch(console.error);
}
