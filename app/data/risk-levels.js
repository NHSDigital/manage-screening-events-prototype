// app/data/risk-levels.js

module.exports = {
  routine: {
    frequency: 36, // months
    ageRange: {
      upper: 70,
      lower: 50
    }
  },
  moderate: {
    frequency: 12, // months
    ageRange: {
      upper: 50,
      lower: 40
    }
  },
  high: {
    frequency: 12, // months
    ageRange: {
      upper: 70,
      lower: 50
    }
  },
  // veryHigh: {
  //   frequency: 12, // months
  //   ageRange: {
  //     upper: 40,
  //   }
  // }
}
