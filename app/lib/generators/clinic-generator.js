// app/lib/generators/clinic-generator.js

const { faker } = require('@faker-js/faker');
const generateId = require('../utils/id-generator');
const dayjs = require('dayjs');
const config = require('../../config');

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

const determineClinicStatus = (date) => {
  const now = dayjs();
  const clinicDate = dayjs(date).startOf('day');
  const today = now.startOf('day');

  if (clinicDate.isBefore(today)) {
    return 'closed';
  }
  if (clinicDate.isAfter(today)) {
    return 'scheduled';
  }
  return 'in_progress';  // it's today
};

const generateMobileSiteName = () => {
  const sites = [
    "Tesco Extra Banbury",
    "Witney Community Hospital",
    "Thame Community Hospital",
    "Bicester Community Hospital",
    "Sainsbury's Kidlington",
    "Carterton Health Centre",
    "Wantage Community Hospital",
    "Tesco Faringdon",
    "Didcot Civic Hall",
    "Chipping Norton Health Centre"
  ];
  
  return faker.helpers.arrayElement(sites);
};

// Generate multiple clinics for a BSU on a given day
const generateClinicsForBSU = ({ date, breastScreeningUnit, config: clinicConfig }) => {
  // Determine number of clinics for this BSU today (1-2)
  const numberOfClinics = Math.random() < 0.3 ? 2 : 1;
  
  // Randomly select locations from available ones
  const selectedLocations = faker.helpers.arrayElements(
    breastScreeningUnit.locations,
    { min: numberOfClinics, max: numberOfClinics }
  );
  
  return selectedLocations.map(location => {
    return {
      id: generateId(),
      date: date.toISOString().split('T')[0],
      breastScreeningUnitId: breastScreeningUnit.id,
      clinicType: location.type,
      locationId: location.id,
      siteName: location.type === 'mobile_unit' ? generateMobileSiteName() : null,
      slots: generateTimeSlots(date, clinicConfig),
      status: determineClinicStatus(date),
      staffing: {
        mamographers: [],
        radiologists: [],
        support: []
      },
      targetBookings: clinicConfig.targetBookings,
      targetAttendance: clinicConfig.targetAttendance,
      notes: null
    };
  });
};

module.exports = {
  generateClinicsForBSU
};
