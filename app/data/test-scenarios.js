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
    participant: {
      id: 'bc724e9f',
      demographicInformation: {
        firstName: 'Janet',
        middleName: null,
        lastName: 'Williams',
        dateOfBirth: '1959-07-22',
        ethnicGroup: null,
        ethnicBackground: null,
      },
      extraNeeds: ['Wheelchair user'],
      config: {
        defaultRiskLevel: 'routine',
        repeatViews: ['RMLO'],
        scheduling: {
          whenRelativeToToday: 0,
          status: 'event_scheduled',
          approximateTime: '10:30',
        },
      },
    },
  },
  {
    participant: {
      id: 'aab45c3d',
      demographicInformation: {
        firstName: 'Dianna',
        lastName: 'McIntosh',
        middleName: 'Rose',
        dateOfBirth: '1964-03-15',
        ethnicGroup: null,
        ethnicBackground: null,
      },
      extraNeeds: null,
      config: {
        defaultRiskLevel: 'routine',
        scheduling: {
          whenRelativeToToday: 0,
          status: 'event_checked_in',
          approximateTime: '11:30',
          // slotIndex: 20,
        },
      },
    },
  },
]
