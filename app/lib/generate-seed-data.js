// app/lib/generate-seed-data.js
// node app/lib/generate-seed-data.js

const { faker } = require('@faker-js/faker');
const dayjs = require('dayjs');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const { generateParticipant } = require('./generators/participant-generator');
const { generateClinicsForBSU } = require('./generators/clinic-generator');
const { generateEvent } = require('./generators/event-generator');

// Load existing data
const breastScreeningUnits = require('../data/breast-screening-units');
const ethnicities = require('../data/ethnicities');

// Scheduling helper functions
const hasExistingEvents = (participant, events, startDate, endDate) => {
  return events.some(event => {
    if (event.participantId !== participant.id) return false;
    const eventDate = dayjs(event.timing.startTime).startOf('day');
    return eventDate.isAfter(startDate) && eventDate.isBefore(endDate);
  });
};

const getEligibleParticipants = (allParticipants, existingEvents, clinicDate) => {
  const clinicDay = dayjs(clinicDate);
  const startDate = clinicDay.subtract(3, 'year');
  const endDate = clinicDay.add(3, 'year');
  
  return allParticipants.filter(participant => {
    const age = clinicDay.diff(dayjs(participant.demographicInformation.dateOfBirth), 'year');
    if (age < 50 || age > 70) return false;
    return !hasExistingEvents(participant, existingEvents, startDate, endDate);
  });
};

const assignParticipantsToSlots = (slots, eligibleParticipants) => {
  const assignments = [];
  const usedParticipants = new Set();
  
  slots.forEach(slot => {
    const availableParticipants = eligibleParticipants.filter(p => !usedParticipants.has(p.id));
    
    for (let i = 0; i < slot.capacity; i++) {
      if (availableParticipants.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      const participant = availableParticipants[randomIndex];
      
      assignments.push({
        slot,
        participant
      });
      
      usedParticipants.add(participant.id);
      availableParticipants.splice(randomIndex, 1);
    }
  });
  
  return assignments;
};


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
  const today = dayjs().startOf('day');
  const startDate = today.subtract(config.clinics.daysBeforeToday, 'day');
  const endDate = today.add(config.clinics.daysToGenerate, 'day');

  let currentDate = startDate;
  while (currentDate.isBefore(endDate)) {
    breastScreeningUnits.forEach(unit => {
      const newClinics = generateClinicsForBSU({
        date: currentDate.toDate(),
        breastScreeningUnit: unit
      });

      newClinics.forEach(clinic => {
        const eligibleParticipants = getEligibleParticipants(
          participants,
          events,
          clinic.date
        );
        
        const assignments = assignParticipantsToSlots(
          clinic.slots.filter(() => Math.random() < config.generation.bookingProbability),
          eligibleParticipants
        );
        
        assignments.forEach(({ slot, participant }) => {
          const event = generateEvent({
            slot,
            participant,
            clinic,
            outcomeWeights: config.screening.outcomes[clinic.clinicType]
          });
          events.push(event);
        });
      });

      clinics.push(...newClinics);
    });
    
    currentDate = currentDate.add(1, 'day');
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
