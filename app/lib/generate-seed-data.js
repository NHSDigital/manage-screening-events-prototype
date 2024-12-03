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
const getEligibleParticipants = (allParticipants, clinicDate) => {
  const clinicDay = dayjs(clinicDate);
  
  return allParticipants.filter(participant => {
    const age = clinicDay.diff(dayjs(participant.demographicInformation.dateOfBirth), 'year');
    return age >= 50 && age <= 70;
  });
};

const generateSnapshot = (date, allParticipants, unit) => {
  const clinics = [];
  const events = [];
  const usedParticipantsInSnapshot = new Set();
  let participants = [...allParticipants];
  
  // Pre-filter eligible participants once
  const clinicDate = dayjs(date);
  const eligibleParticipants = participants.filter(p => {
    const age = clinicDate.diff(dayjs(p.demographicInformation.dateOfBirth), 'year');
    return age >= 50 && age <= 70;
  });
  
  // Generate a week of clinics
  for (let i = 0; i < 7; i++) {
    const clinicDate = dayjs(date).add(i, 'day');
    const newClinics = generateClinicsForBSU({
      date: clinicDate.toDate(),
      breastScreeningUnit: unit
    });
    
    newClinics.forEach(clinic => {
      const bookableSlots = clinic.slots
        .filter(() => Math.random() < config.generation.bookingProbability);
        
      bookableSlots.forEach(slot => {
        // Filter from pre-filtered eligible participants
        const availableParticipants = eligibleParticipants.filter(p => 
          !usedParticipantsInSnapshot.has(p.id)
        );

        // If we need more participants, create them
        if (availableParticipants.length === 0) {
          const newParticipant = generateParticipant({ 
            ethnicities, 
            breastScreeningUnits: [unit]
          });
          participants.push(newParticipant);
          availableParticipants.push(newParticipant);
        }
        
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
  
  return { 
    clinics, 
    events, 
    newParticipants: participants.slice(allParticipants.length) 
  };
};

const generateData = async () => {
  if (!fs.existsSync(config.paths.generatedData)) {
    fs.mkdirSync(config.paths.generatedData, { recursive: true });
  }

  console.log('Generating initial participants...');
  let participants = Array.from(
    { length: config.generation.numberOfParticipants }, 
    () => generateParticipant({ ethnicities, breastScreeningUnits })
  );

  console.log('Generating clinics and events...');
  const today = dayjs().startOf('day');
  const snapshots = [
    today.subtract(9, 'year').add(3, 'month'),
    today.subtract(6, 'year').add(2, 'month'),
    today.subtract(3, 'year').add(1, 'month'),
    today.subtract(3, 'days')
  ];


  // Generate all data in batches per BSU
  const allData = breastScreeningUnits.map(unit => {
    const unitSnapshots = snapshots.map(date => generateSnapshot(date, participants, unit));
    return {
      clinics: [].concat(...unitSnapshots.map(s => s.clinics)),
      events: [].concat(...unitSnapshots.map(s => s.events)),
      newParticipants: [].concat(...unitSnapshots.map(s => s.newParticipants))
    };
  });

  // Combine all data
  const allClinics = [].concat(...allData.map(d => d.clinics));
  const allEvents = [].concat(...allData.map(d => d.events));
  const allNewParticipants = [].concat(...allData.map(d => d.newParticipants));

  // Combine initial and new participants
  const finalParticipants = [...participants, ...allNewParticipants];


  // breastScreeningUnits.forEach(unit => {
  //   snapshots.forEach(date => {
  //     const { clinics, events, newParticipants } = generateSnapshot(date, participants, unit);
  //     allClinics.push(...clinics);
  //     allEvents.push(...events);
  //     participants = [...participants, ...newParticipants];
  //   });
  // });

  const writeData = (filename, data) => {
    fs.writeFileSync(
      path.join(config.paths.generatedData, filename),
      JSON.stringify(data, null, 2)
    );
  };

  writeData('participants.json', { participants: finalParticipants });
  writeData('clinics.json', { 
    clinics: allClinics.map(clinic => ({
      ...clinic,
      slots: clinic.slots.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    }))
  });
  writeData('events.json', { events: allEvents });
  writeData('generation-info.json', { 
    generatedAt: new Date().toISOString(),
    stats: {
      participants: finalParticipants.length,
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
