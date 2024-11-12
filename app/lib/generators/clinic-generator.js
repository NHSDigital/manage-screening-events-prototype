// app/lib/generators/clinic-generator.js

const { faker } = require('@faker-js/faker');
const generateId = require('../utils/id-generator');
const weighted = require('weighted');

const CLINIC_TYPES = [
  { type: 'hospital', weight: 0.7 },
  { type: 'mobile_unit', weight: 0.3 }
];

const generateTimeSlots = (date, config) => {
  const slots = [];
  const startTime = new Date(`${date.toISOString().split('T')[0]}T${config.startTime}`);
  const endTime = new Date(`${date.toISOString().split('T')[0]}T${config.endTime}`);
  
  let currentTime = new Date(startTime);
  while (currentTime < endTime) {
    const slotId = generateId();
    slots.push({
      id: slotId,
      dateTime: new Date(currentTime).toISOString(),
      type: 'screening',
      capacity: 2,
      bookedCount: 0
    });
    currentTime.setMinutes(currentTime.getMinutes() + config.slotDurationMinutes);
  }
  return slots;
};

// Generate multiple clinics for a BSU on a given day
const generateClinicsForBSU = ({ date, breastScreeningUnit, config }) => {
  // Determine number of clinics for this BSU today (1-2)
  const numberOfClinics = Math.random() < 0.3 ? 2 : 1;
  
  return Array.from({ length: numberOfClinics }, () => {
    // If this is the second clinic for the day, make it more likely to be a mobile unit
    const isSecondClinic = numberOfClinics === 2;
    const clinicType = weighted.select(
      CLINIC_TYPES.map(t => t.type),
      CLINIC_TYPES.map(t => isSecondClinic ? (t.type === 'mobile_unit' ? 0.7 : 0.3) : t.weight)
    );

    return {
      id: generateId(),
      date: date.toISOString().split('T')[0],
      breastScreeningUnitId: breastScreeningUnit.id,
      clinicType,
      location: clinicType === 'hospital' ? 
        breastScreeningUnit.address :
        generateMobileLocation(breastScreeningUnit),
      slots: generateTimeSlots(date, config),
      status: date < new Date() ? 'completed' : 'scheduled',
      staffing: {
        mamographers: [],
        radiologists: [],
        support: []
      },
      targetBookings: 60,
      targetAttendance: 40,
      notes: null
    };
  });
};

const generateMobileLocation = (bsu) => {
  const locations = [
    'Community Centre',
    'Health Centre',
    'Leisure Centre',
    'Shopping Centre Car Park',
    'Supermarket Car Park'
  ];
  
  const location = faker.helpers.arrayElement(locations);
  return {
    name: `${faker.location.city()} ${location}`,
    address: {
      line1: faker.location.streetAddress(),
      city: faker.location.city(),
      postcode: faker.location.zipCode('??# #??')
    }
  };
};

module.exports = {
  generateClinicsForBSU
};
