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
// const hasExistingEvents = (participant, events, startDate, endDate) => {
//   return events.some(event => {
//     if (event.participantId !== participant.id) return false;
//     const eventDate = dayjs(event.timing.startTime).startOf('day');
//     return eventDate.isAfter(startDate) && eventDate.isBefore(endDate);
//   });
// };

// Scheduling helper functions
const getEligibleParticipants = (allParticipants, clinicDate) => {
  const clinicDay = dayjs(clinicDate);
  
  return allParticipants.filter(participant => {
    const age = clinicDay.diff(dayjs(participant.demographicInformation.dateOfBirth), 'year');
    return age >= 50 && age <= 70;
  });
};

// const assignParticipantsToSlots = (slots, eligibleParticipants) => {
//   const assignments = [];
//   const usedParticipants = new Set();
  
//   slots.forEach(slot => {
//     const availableParticipants = eligibleParticipants.filter(p => !usedParticipants.has(p.id));
    
//     for (let i = 0; i < slot.capacity; i++) {
//       if (availableParticipants.length === 0) break;
      
//       const randomIndex = Math.floor(Math.random() * availableParticipants.length);
//       const participant = availableParticipants[randomIndex];
      
//       assignments.push({
//         slot,
//         participant
//       });
      
//       usedParticipants.add(participant.id);
//       availableParticipants.splice(randomIndex, 1);
//     }
//   });
  
//   return assignments;
// };

const generateSnapshot = (date, participants, unit) => {
  const eligibleParticipants = getEligibleParticipants(participants, date);
  const clinics = [];
  const events = [];
  const usedParticipantsInSnapshot = new Set();
  
  // Generate a week of clinics
  for (let i = 0; i < 7; i++) {
    const clinicDate = dayjs(date).add(i, 'day');
    const newClinics = generateClinicsForBSU({
      date: clinicDate.toDate(),
      breastScreeningUnit: unit
    });
    
    newClinics.forEach(clinic => {
      clinic.slots
        .filter(() => Math.random() < config.generation.bookingProbability)
        .forEach(slot => {
          const availableParticipants = eligibleParticipants.filter(p => !usedParticipantsInSnapshot.has(p.id));
          if (availableParticipants.length === 0) return;
          
          for (let i = 0; i < slot.capacity; i++) {
            if (availableParticipants.length === 0) break;
            const randomIndex = Math.floor(Math.random() * availableParticipants.length);
            const participant = availableParticipants[randomIndex];
            
            const event = generateEvent({
              slot,
              participant,
              clinic,
              outcomeWeights: config.screening.outcomes[clinic.clinicType]
            });
            
            events.push(event);
            usedParticipantsInSnapshot.add(participant.id);
            availableParticipants.splice(randomIndex, 1);
          }
        });
      
      clinics.push(clinic);
    });
  }
  
  return { clinics, events };
};


const generateData = async () => {
  if (!fs.existsSync(config.paths.generatedData)) {
    fs.mkdirSync(config.paths.generatedData, { recursive: true });
  }

  console.log('Generating participants...');
  const participants = Array.from(
    { length: config.generation.numberOfParticipants }, 
    () => generateParticipant({ ethnicities, breastScreeningUnits })
  );

  console.log('Generating clinics and events...');
  const allClinics = [];
  const allEvents = [];

  const today = dayjs().startOf('day');
  const snapshots = [
    today.subtract(9, 'year'),
    today.subtract(6, 'year'),
    today.subtract(3, 'year'),
    today
  ];

  breastScreeningUnits.forEach(unit => {
    snapshots.forEach(date => {
      const { clinics, events } = generateSnapshot(date, participants, unit);
      allClinics.push(...clinics);
      allEvents.push(...events);
    });
  });

  // Write generated data to files
  const writeData = (filename, data) => {
    fs.writeFileSync(
      path.join(config.paths.generatedData, filename),
      JSON.stringify(data, null, 2)
    );
  };

  writeData('participants.json', { participants });
  writeData('clinics.json', { clinics: allClinics });
  writeData('events.json', { events: allEvents });
  writeData('generation-info.json', { 
    generatedAt: new Date().toISOString(),
    stats: {
      participants: participants.length,
      clinics: allClinics.length,
      events: allEvents.length
    }
  });


  console.log('\nData generation complete!');
  console.log(`Generated:`);
  console.log(`- ${participants.length} participants`);
  console.log(`- ${allClinics.length} clinics`);
  console.log(`- ${allEvents.length} events`);
};

// Export the function instead of running it immediately
module.exports = generateData;

// Only run if this file is being run directly
if (require.main === module) {
  generateData().catch(console.error);
}
