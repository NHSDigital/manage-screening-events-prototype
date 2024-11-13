// Use this file to change prototype configuration.
const path = require('path');


module.exports = {
  // Service name
  serviceName: 'Manage screening events',

  // Port to run nodemon on locally
  port: 2000,

  // Automatically stores form data, and send to all views
  useAutoStoreData: 'true',

  // Enable cookie-based session store (persists on restart)
  // Please note 4KB cookie limit per domain, cookies too large will silently be ignored
  useCookieSessionStore: 'false',

  // Enable or disable built-in docs and examples.
  useDocumentation: true,

  paths: {
    generatedData: path.join(__dirname, 'data/generated')
  },

  // Clinic settings
  clinics: {
    // Timing
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 8,
    slotsPerDay: 32,

    // Capacity
    targetBookings: 60,
    targetAttendance: 40,

    // Date range for generating data
    daysToGenerate: 7,
    daysBeforeToday: 3
  },

  screening: {
    // Outcomes and their probabilities
    outcomes: {
      clear: 0.95,
      needs_further_tests: 0.04,
      cancer_detected: 0.01
    },
    
    // Standard images taken during screening
    standardImages: ['RCC', 'LCC', 'RMLO', 'LMLO']
  },

  // Data generation settings
  generation: {
    numberOfParticipants: 1000,
    bookingProbability: 0.8  // 80% of slots are booked
  }
};
