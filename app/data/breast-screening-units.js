// app/data/breast-screening-units.js

module.exports = [
  {
    id: 'm5ekcxvu', // Must be hardcoded so it matches generated data
    name: 'West Sussex BSS',
    address: {
      line1: 'Breast Screening Unit',
      line2: 'Worthing Hospital',
      line3: 'Lyndhurst Rd',
      line4: 'Headington',
      city: 'Worthing',
      postcode: 'BN11 2DH',
    },
    phoneNumber: '01865235621',
    abbreviation: 'WSB',
    // clinicTypes: ['screening', 'assessment'], // Can do both
    clinicTypes: ['screening'],
    riskLevelHandling: [
      'routine',
      'moderate',
    ],
    // Default operating hours for the BSU
    sessionPatterns: [
      // {
      //   name: 'full_day',
      //   type: 'single',
      //   sessions: [
      //     { startTime: '09:00', endTime: '17:00' },
      //   ],
      // },
      {
        name: 'split_day',
        type: 'paired',
        sessions: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '13:00', endTime: '17:00' },
        ],
      },
    ],
    locations: [
      {
        id: 'duif1ywp', // Must be hardcoded so it matches generated data
        name: 'West Sussex BSS',
        type: 'hospital',
        isMainSite: true,
        // Main sites can handle all supported risk levels
        riskLevelHandling: [
          'routine',
          'moderate',
        ],
        address: {
          line1: 'Breast Screening Unit',
          line2: 'Worthing Hospital',
          line3: 'Lyndhurst Rd',
          line4: 'Headington',
          city: 'Worthing',
          postcode: 'BN11 2DH',
        },
      },
      {
        id: '2yt5dukk', // Must be hardcoded so it matches generated data
        name: 'Mobile Unit JA1 CP7',
        type: 'mobile_unit',
        isMainSite: false,
        clinicTypes: ['screening'], // Can only do screening
        // Mobile units only handle routine screening
        riskLevelHandling: [
          'routine',
        ],
        registration: 'JA1 CP7',
        // Override BSU session patterns for this location
        sessionPatterns: [
          {
            name: 'full_day',
            type: 'single',
            sessions: [
              { startTime: '09:00', endTime: '17:00' },
            ],
          },
        ],
      },
      {
        id: 'acxcdcnj', // Must be hardcoded so it matches generated data
        name: 'Mobile Unit WX71 HCR',
        type: 'mobile_unit',
        isMainSite: false,
        clinicTypes: ['screening'], // Can only do screening
        // Mobile units only handle routine screening
        riskLevelHandling: [
          'routine',
        ],
        registration: 'WX71 HCR',
        // Override BSU session patterns for this location
        sessionPatterns: [
          {
            name: 'full_day',
            type: 'single',
            sessions: [
              { startTime: '09:00', endTime: '17:00' },
            ],
          },
        ],
      },
      // {
      //   id: "acjdcnj", // Must be hardcoded so it matches generated data
      //   name: "Mobile Unit CD1 5HR",
      //   type: "mobile_unit",
      //   isMainSite: false,
      //   clinicTypes: ['screening'],  // Can only do screening
      //   // Mobile units only handle routine screening
      //   riskLevelHandling: [
      //     'routine',
      //   ],
      //   registration: "CD1 5HR",
      //   // Override BSU session patterns for this location
      //   sessionPatterns: [
      //     {
      //       name: 'full_day',
      //       type: 'single',
      //       sessions: [
      //         { startTime: "09:00", endTime: "17:00" }
      //       ]
      //     }
      //   ]
      // }
    ],
  },
]
