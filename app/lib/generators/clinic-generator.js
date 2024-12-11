// app/lib/generators/clinic-generator.js

const { faker } = require('@faker-js/faker');
const generateId = require('../utils/id-generator');
const dayjs = require('dayjs');
const weighted = require('weighted');
const config = require('../../config');

const determineclinicType = (location, breastScreeningUnit) => {
  // First check location-specific service types
  const clinicTypes = location.clinicTypes || breastScreeningUnit.clinicTypes;

  // If still no service types, default to screening
  if (!clinicTypes) {
    return 'screening';
  }

  // If location/BSU only supports one service type, use that
  if (clinicTypes.length === 1) {
    return clinicTypes[0];
  }

  // For locations that can do both, weight towards screening
  return weighted.select({
    'screening': 0.8,
    'assessment': 0.2
  });
};

const generateTimeSlots = (date, sessionTimes, clinicType) => {
  const { slotDurationMinutes } = config.clinics;
  
  const slots = [];
  const startTime = new Date(`${date.toISOString().split('T')[0]}T${sessionTimes.startTime}`);
  const endTime = new Date(`${date.toISOString().split('T')[0]}T${sessionTimes.endTime}`);
  
  let currentTime = new Date(startTime);
  while (currentTime < endTime) {
    const slotId = generateId();
    const slotStartTime = new Date(currentTime);
    const slotEndTime = new Date(currentTime);
    slotEndTime.setMinutes(slotEndTime.getMinutes() + slotDurationMinutes);

    slots.push({
      id: slotId,
      dateTime: slotStartTime.toISOString(),
      endDateTime: slotEndTime.toISOString(),
      duration: slotDurationMinutes,
      type: clinicType,
      // capacity: 1,
      // Don't support smart clinics yet
      capacity: clinicType === 'assessment' ? 1 : 2, // Assessment clinics don't double book
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
  const endHour = parseInt(sessionTimes.endTime.split(':')[0], 10);
  
  // If clinic spans 6 or more hours, consider it all day
  const duration = endHour - startHour;
  if (duration >= 6) {
    return 'all day';
  }
  
  // For shorter sessions, determine morning or afternoon based on start time
  return startHour < 12 ? 'morning' : 'afternoon';
};

const generateClinic = (date, location, breastScreeningUnit, sessionTimes) => {
  const clinicType = determineclinicType(location, breastScreeningUnit);
  const slots = generateTimeSlots(date, sessionTimes, clinicType);
  
  return {
    id: generateId(),
    date: date.toISOString().split('T')[0],
    breastScreeningUnitId: breastScreeningUnit.id,
    locationType: location.type,
    clinicType,
    locationId: location.id,
    siteName: location.type === 'mobile_unit' ? generateMobileSiteName() : null,
    slots,
    status: determineClinicStatus(date),
    staffing: {
      mammographers: [],
      radiologists: [],
      support: []
    },
    targetCapacity: {
      bookingPercent: clinicType === 'assessment' ? 100 : config.clinics.targetBookingPercent,
      attendancePercent: clinicType === 'assessment' ? 95 : config.clinics.targetAttendancePercent,
      // totalSlots: slots.length,
      // not supporting Smart clinics yet
      totalSlots: slots.length * (clinicType === 'assessment' ? 1 : 2)
    },
    notes: null,
    sessionTimes,
    sessionType: determineSessionType(sessionTimes)
  };
};

const generateClinicsForBSU = ({ date, breastScreeningUnit }) => {
  // Each location has an 95% chance of running clinics on any given day
  const selectedLocations = breastScreeningUnit.locations.filter(() => Math.random() < 0.95);
  
  // Generate clinics for each selected location
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
