// app/data/test-scenarios.js

/**
 * Test scenarios define specific participants and events that should always exist
 * in the generated data. This ensures we have consistent test cases.
 * 
 * Only specify what needs to be consistent - any unspecified fields will be randomly generated.
 * This allows natural variation while maintaining key test conditions.
 */
module.exports = [
  {
    // The participant data matches our data model
    participant: {
      id: 'aab45c3d',
      demographicInformation: {
        firstName: 'Susan',
        lastName: 'Smith',
        middleName: null,
        dateOfBirth: '1964-03-15',
      },
      extraNeeds: ['Wheelchair user'],
    },
    // Scheduling is separate as it relates to clinic/event generation
    scheduling: {
      whenRelativeToToday: 0,
      status: 'checked_in',
      slotIndex: 20,
    },
  },
  {
    participant: {
      id: 'bc724e9f',
      demographicInformation: {
        firstName: 'Janet',
        lastName: 'Williams',
        dateOfBirth: '1959-07-22',
      },
    },
    scheduling: {
      whenRelativeToToday: 0,
      status: 'scheduled', 
      approximateTime: '10:30',
    },
  },
]
