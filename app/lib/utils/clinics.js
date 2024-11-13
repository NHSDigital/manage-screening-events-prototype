// app/lib/utils/clinics.js


const config = require('../../config');


/**
 * Get today's clinics
 * @param {Array} clinics - Array of all clinics
 */
const getTodaysClinics = (clinics) => {
  const today = new Date().toISOString().split('T')[0];
  return clinics.filter(c => c.date === today);
};

/**
 * Get events for a specific clinic
 * @param {Array} events - Array of all events
 * @param {string} clinicId - Clinic ID to filter by
 */
const getClinicEvents = (events, clinicId) => {
  if (!events || !clinicId) return [];
  console.log(`Looking for events with clinicId: ${clinicId}`);
  console.log(`Found ${events.filter(e => e.clinicId === clinicId).length} events`);
  return events.filter(e => e.clinicId === clinicId);
};


/**
 * Format clinic time slot
 * @param {string} dateTime - ISO date string
 */
const formatTimeSlot = (dateTime) => {
  const date = new Date(dateTime);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculate the end time of a slot
 * @param {string} slotDateTime - ISO date string
 * @returns {Date} End time of slot
 */
const getSlotEndTime = (slotDateTime) => {
  const date = new Date(slotDateTime);
  date.setMinutes(date.getMinutes() + config.clinics.slotDurationMinutes);
  return date;
};

/**
 * Get clinic opening hours
 * @param {Object} clinic - Clinic object
 * @returns {Object} Start and end times as Date objects
 */
const getClinicHours = (clinic) => {
  if (!clinic?.slots?.length) return null;
  
  const firstSlot = clinic.slots[0];
  const lastSlot = clinic.slots[clinic.slots.length - 1];
  
  return {
    start: new Date(firstSlot.dateTime),
    end: getSlotEndTime(lastSlot.dateTime)
  };
};


module.exports = {
  getTodaysClinics,
  getClinicEvents,
  formatTimeSlot,
  getClinicHours
};
