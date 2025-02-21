// app/lib/generators/symptoms-generator.js

const { faker } = require('@faker-js/faker')
const weighted = require('weighted')

// Constants for symptom generation
const SYMPTOM_TYPES = {
  breast_lump: {
    weight: 0.4,
    requiresLocation: true,
    descriptions: [
      'Hard lump that doesn\'t move',
      'Soft, moveable lump',
      'Small, pea-sized lump',
      'Several small lumps in the same area',
      'Tender lump that varies with menstrual cycle'
    ]
  },
  breast_shape: {
    weight: 0.2,
    requiresLocation: true,
    descriptions: [
      'Change in size or shape of breast',
      'Swelling that doesn\'t go down',
      'One breast has become larger',
      'Breast feels different to the other one',
      'Visible dent or dimpling'
    ]
  },
  nipple_changes: {
    weight: 0.15,
    requiresLocation: true,
    descriptions: [
      'Clear discharge when pressed',
      'Bloody discharge',
      'Nipple has become inverted',
      'Rash around nipple',
      'Crusting or scaling of nipple'
    ]
  },
  skin_changes: {
    weight: 0.15,
    requiresLocation: true,
    descriptions: [
      'Red patches of skin',
      'Dimpling or puckering',
      'Dry, flaking skin',
      'Redness and warmth',
      'Orange peel texture'
    ]
  },
  other: {
    weight: 0.1,
    requiresLocation: false,
    descriptions: [
      'General breast pain',
      'Unusual sensation or tenderness',
      'Burning sensation',
      'Sharp, shooting pains',
      'Heavy or achy feeling'
    ]
  }
}

const DURATIONS = {
  under_3_months: 0.6,
  over_3_months: 0.3,
  unknown: 0.1
}

const INVESTIGATION_DETAILS = [
  'GP examined and said to monitor for changes',
  'Discussed with practice nurse at last appointment',
  'Had ultrasound scan 2 weeks ago, waiting for results',
  'Doctor said it was normal but to come back if concerned',
  'Previously had mammogram which was clear',
  'GP did physical examination, referred for ultrasound',
  'Practice nurse checked at routine appointment',
  'Called 111, advised to see GP for assessment',
  'Saw GP yesterday, waiting for referral letter',
  'GP examined and said likely hormonal changes',
  'Breast clinic did examination last month, no concerns',
  'Hospital did scan, said to come back in 6 months',
  'Emergency GP examined, said not urgent but to monitor',
  'Consultant examined at last clinic visit',
  'Private clinic did mammogram, all normal',
  'GP prescribed antibiotics for possible infection',
  'Hospital breast clinic did biopsy, waiting for results',
  'Pharmacist recommended seeing GP, appointment next week',
  'Walk-in centre examined, advised follow up with GP',
  'GP took blood tests, coming back for results',
  'Hospital did ultrasound, said tissue changes normal',
  'Breast care nurse examined at screening unit',
  'GP wanted to monitor for three months then review',
  'Community clinic did examination, no immediate concerns',
  'Specialist examined, ordered further tests'
]

/**
 * Generate a single symptom
 * @param {Object} options - Generation options
 * @param {string} [options.type] - Force specific symptom type
 * @param {boolean} [options.requireInvestigation] - Force investigation status
 * @returns {Object} Generated symptom
 */
const generateSymptom = (options = {}) => {
  // Pick symptom type if not specified
  const type = options.type || weighted.select(
    Object.fromEntries(
      Object.entries(SYMPTOM_TYPES).map(([key, data]) => [key, data.weight])
    )
  )

  const typeData = SYMPTOM_TYPES[type]

  // Generate basic symptom data
  const symptom = {
    type,
    duration: weighted.select(DURATIONS),
    details: faker.helpers.arrayElement(typeData.descriptions),
    hasBeenInvestigated: options.requireInvestigation ?? Math.random() < 0.3
  }

  // Add location if required for this type
  if (typeData.requiresLocation) {
    symptom.location = weighted.select({
      left: 0.4,
      right: 0.4,
      both: 0.2
    })
  }

  // Add investigation details if investigated
  if (symptom.hasBeenInvestigated) {
    symptom.investigationDetails = faker.helpers.arrayElement(INVESTIGATION_DETAILS)
  }

  return symptom
}

/**
 * Generate a set of symptoms for a person
 * @param {Object} options - Generation options
 * @param {number} [options.probabilityOfSymptoms=0.15] - Chance of having any symptoms
 * @param {number} [options.maxSymptoms=3] - Maximum number of symptoms to generate
 * @returns {Array} Array of generated symptoms
 */
const generateSymptoms = (options = {}) => {
  const {
    probabilityOfSymptoms = 0.15,
    maxSymptoms = 3
  } = options

  // Determine if they have any symptoms
  if (Math.random() > probabilityOfSymptoms) {
    return []
  }

  // Determine how many symptoms (weighted towards fewer)
  const numberOfSymptoms = weighted.select({
    1: 0.6,
    2: 0.3,
    3: 0.1
  })

  // Track used types to avoid duplicates
  const usedTypes = new Set()
  const symptoms = []

  // Generate symptoms, avoiding duplicate types
  while (symptoms.length < numberOfSymptoms && symptoms.length < maxSymptoms) {
    // Filter to unused types
    const availableTypes = Object.entries(SYMPTOM_TYPES)
      .filter(([key]) => !usedTypes.has(key))

    // Stop if no types left
    if (availableTypes.length === 0) break

    // Generate weights object from remaining types
    const weights = Object.fromEntries(
      availableTypes.map(([key, data]) => [key, data.weight])
    )

    // Pick a type and generate symptom
    const type = weighted.select(weights)
    const symptom = generateSymptom({ type })

    usedTypes.add(type)
    symptoms.push(symptom)
  }

  return symptoms
}

module.exports = {
  generateSymptom,
  generateSymptoms,
  // Export constants for testing/reference
  SYMPTOM_TYPES,
  DURATIONS,
  INVESTIGATION_DETAILS
}