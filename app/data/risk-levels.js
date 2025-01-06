// app/data/risk-levels.js

module.exports = {

  routine: {
    weight: 0.85,
    frequency: 36, // months
    ageRange: {
      upper: 70,
      lower: 50
    }
  },
  moderate: {
    weight: 0.1,
    frequency: 12, // months
    ageRange: {
      upper: 50,
      lower: 40
    }
  },
  high: {
    weight: 0.05,
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
