// app/lib/generators/clinic-generator.js

const { faker } = require('@faker-js/faker');
const generateId = require('../utils/id-generator');
const dayjs = require('dayjs');
const config = require('../../config');


const generateTimeSlots = (date, sessionTimes) => {
  const { slotDurationMinutes } = config.clinics;
  
  const slots = [];
  const startTime = new Date(`${date.toISOString().split('T')[0]}T${sessionTimes.startTime}`);
  const endTime = new Date(`${date.toISOString().split('T')[0]}T${sessionTimes.endTime}`);
  
  let currentTime = new Date(startTime);
  while (currentTime < endTime) {
    const slotId = generateId();
    slots.push({
      id: slotId,
      dateTime: new Date(currentTime).toISOString(),
      type: 'screening',
      capacity: 2,
      bookedCount: 0,
      period: `${sessionTimes.startTime}-${sessionTimes.endTime}`
    });
    currentTime.setMinutes(currentTime.getMinutes() + slotDurationMinutes);
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

const determineSessionType = (sessionTimes) => {
  const startHour = parseInt(sessionTimes.startTime.split(':')[0], 10);
  return startHour < 12 ? 'morning' : 'afternoon';
};

const generateClinic = (date, location, breastScreeningUnit, sessionTimes) => {
  const slots = generateTimeSlots(date, sessionTimes);
  
  return {
    id: generateId(),
    date: date.toISOString().split('T')[0],
    breastScreeningUnitId: breastScreeningUnit.id,
    clinicType: location.type,
    locationId: location.id,
    siteName: location.type === 'mobile_unit' ? generateMobileSiteName() : null,
    slots,
    status: determineClinicStatus(date),
    staffing: {
      mamographers: [],
      radiologists: [],
      support: []
    },
    targetCapacity: {
      bookingPercent: config.clinics.targetBookingPercent,
      attendancePercent: config.clinics.targetAttendancePercent,
      totalSlots: slots.length * 2
    },
    notes: null,
    sessionTimes,
    sessionType: determineSessionType(sessionTimes)
  };
};

const generateClinicsForBSU = ({ date, breastScreeningUnit }) => {
  // Determine number of clinic locations for this day (1-2)
  const numberOfLocations = Math.random() < 0.3 ? 2 : 1;
  
  // Randomly select locations
  const selectedLocations = faker.helpers.arrayElements(
    breastScreeningUnit.locations,
    { min: numberOfLocations, max: numberOfLocations }
  );
  
  // Generate clinics for each location
  return selectedLocations.flatMap(location => {
    // Use location-specific patterns if available, otherwise use BSU patterns
    const sessionPatterns = location.sessionPatterns || breastScreeningUnit.sessionPatterns;
    
    // Randomly select a pattern
    const selectedPattern = faker.helpers.arrayElement(sessionPatterns);
    
    if (selectedPattern.type === 'single') {
      // For single sessions, create one clinic
      return [generateClinic(date, location, breastScreeningUnit, selectedPattern.sessions[0])];
    } else {
      // For paired sessions, create two clinics
      return selectedPattern.sessions.map(sessionTimes => 
        generateClinic(date, location, breastScreeningUnit, sessionTimes)
      );
    }
  });
};

module.exports = {
  generateClinicsForBSU
};
