// app/data/breast-screening-units.js
const generateId = require('../lib/utils/id-generator');

module.exports = [
  {
    id: "m5ekcxvu", // Must be hardcoded so it matches generated data
    name: "Oxford Breast Imaging Centre",
    address: {
      line1: "Surgery and Diagnostics Centre",
      line2: "Churchill Hospital",
      line3: "Old Road",
      line4: "Headington",
      city: "Oxford",
      postcode: "OX3 7LE"
    },
    phoneNumber: "01865235621",
    abbreviation: "OXF",
    serviceTypes: ['screening', 'assessment'],  // Can do both
    // Default operating hours for the BSU
    sessionPatterns: [
      {
        name: 'full_day',
        type: 'single',
        sessions: [
          { startTime: "09:00", endTime: "17:00" }
        ]
      },
      {
        name: 'split_day',
        type: 'paired',
        sessions: [
          { startTime: "09:00", endTime: "12:00" },
          { startTime: "13:00", endTime: "17:00" }
        ]
      }
    ],
    locations: [
      {
        id: "duif1ywp", // Must be hardcoded so it matches generated data
        name: "Churchill Hospital breast unit",
        type: "hospital",
        isMainSite: true,
        address: {
          line1: "Surgery and Diagnostics Centre",
          line2: "Churchill Hospital",
          line3: "Old Road",
          line4: "Headington",
          city: "Oxford",
          postcode: "OX3 7LE"
        }
      },
      // {
      //   id: generateId(),
      //   name: "Horton Hospital breast unit",
      //   type: "hospital",
      //   isMainSite: false,
      //   address: {
      //     line1: "Horton General Hospital",
      //     line2: "Oxford Road",
      //     city: "Banbury",
      //     postcode: "OX16 9AL"
      //   }
      // },
      {
        id: "2yt5dukk", // Must be hardcoded so it matches generated data
        name: "Mobile Unit JA1 CP7",
        type: "mobile_unit",
        isMainSite: false,
        serviceTypes: ['screening'],  // Can only do screening
        registration: "JA1 CP7",
        // Override BSU session patterns for this location
        sessionPatterns: [
          {
            name: 'full_day',
            type: 'single',
            sessions: [
              { startTime: "09:00", endTime: "17:00" }
            ]
          }
        ]
      },
      {
        id: "acxcdcnj", // Must be hardcoded so it matches generated data
        name: "Mobile Unit WX71 HCR",
        type: "mobile_unit",
        isMainSite: false,
        serviceTypes: ['screening'],  // Can only do screening
        registration: "WX71 HCR",
        // Override BSU session patterns for this location
        sessionPatterns: [
          {
            name: 'full_day',
            type: 'single',
            sessions: [
              { startTime: "09:00", endTime: "17:00" }
            ]
          }
        ]
      }
    ]
  }
];
