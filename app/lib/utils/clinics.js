// app/lib/utils/clinics.js

/**
 * Find a clinic by ID
 * @param {Array} clinics - Array of all clinics
 * @param {string} id - id of clinic to find
 */
const findById = (clinics, id) => {
  return clinics.find(c => c.id === id);
};

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

module.exports = {
  findById,
  getTodaysClinics,
  getClinicEvents,
  formatTimeSlot
};
