// app/lib/generators/people-generator.js
const { faker } = require('@faker-js/faker');
const generateId = require('../utils/id-generator');
const weighted = require('weighted');

// Helper functions for name formatting
const formatName = (person) => ({
  get fullName() {
    const middleName = person.demographicInformation.middleName;
    return [
      person.demographicInformation.firstName,
      middleName,
      person.demographicInformation.lastName
    ].filter(Boolean).join(' ');
  },
  get shortName() {
    return `${person.demographicInformation.firstName} ${person.demographicInformation.lastName}`;
  }
});

// Function to generate SX number
const generateSXNumber = (bsuAbbreviation) => {
  const digits = Array.from({ length: 6 }, () => 
    faker.number.int(9)
  ).join('');
  return `${bsuAbbreviation}${digits}`;
};

// NHS Number Generator
const generateNHSNumber = () => {
  // Generate 9 random digits
  const baseNumber = Array.from({ length: 9 }, () => 
    faker.number.int(9)
  ).join('');
  
  // Calculate check digit
  // NHS number validation: multiply each digit by (11 - position)
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(baseNumber[i]) * (11 - (i + 1));
  }
  const checkDigit = (11 - (sum % 11)) % 11;
  const finalCheckDigit = checkDigit === 10 ? 0 : checkDigit;
  
  return `${baseNumber}${finalCheckDigit}`;
};

const generateParticipant = ({ ethnicities, breastScreeningUnits }) => {
  const id = generateId();
  
  // Randomly assign to a BSU
  const assignedBSU = faker.helpers.arrayElement(breastScreeningUnits);
  
  // Define ethnicity distributions
  const ethnicityGroups = Object.keys(ethnicities);
  const ethnicityWeights = [0.85, 0.08, 0.03, 0.02, 0.02];
  
  const ethnicGroup = weighted.select(ethnicityGroups, ethnicityWeights);
  const ethnicBackground = faker.helpers.arrayElement(ethnicities[ethnicGroup]);

  const middleName = Math.random() < 0.3 ? faker.person.firstName('female') : null;

  return {
    id,
    sxNumber: generateSXNumber(assignedBSU.abbreviation),
    assignedBSU: assignedBSU.id,
    demographicInformation: {
      firstName: faker.person.firstName('female'),
      middleName,
      lastName: faker.person.lastName(),
      dateOfBirth: faker.date.birthdate({ 
        min: 50, 
        max: 70, 
        mode: 'age' 
      }).toISOString(),
      address: {
        line1: faker.location.streetAddress(),
        line2: faker.location.secondaryAddress(),
        city: faker.location.city(),
        postcode: faker.location.zipCode('??# #??')
      },
      phone: faker.phone.number('07### ######'),
      email: faker.internet.email(),
      ethnicGroup,
      ethnicBackground
    },
    medicalInformation: {
      nhsNumber: generateNHSNumber(),
      riskFactors: generateRiskFactors(),
      familyHistory: generateFamilyHistory(),
      previousCancerHistory: generatePreviousCancerHistory()
    },
    currentHealthInformation: {
      isPregnant: false,
      onHRT: Math.random() < 0.1,
      hasBreastImplants: Math.random() < 0.05,
      recentBreastSymptoms: generateRecentSymptoms(),
      medications: generateMedications()
    }
  };
};

const generateRiskFactors = () => {
  const factors = [];
  const possibleFactors = {
    'family_history': 0.15,
    'dense_breast_tissue': 0.1,
    'previous_radiation_therapy': 0.05,
    'obesity': 0.2,
    'alcohol_consumption': 0.15
  };

  Object.entries(possibleFactors).forEach(([factor, probability]) => {
    if (Math.random() < probability) {
      factors.push(factor);
    }
  });

  return factors;
};

const generateFamilyHistory = () => {
  if (Math.random() > 0.15) return null; // 15% chance of family history

  return {
    hasFirstDegreeHistory: Math.random() < 0.7, // 70% of those with family history
    affectedRelatives: faker.helpers.arrayElements(
      ['mother', 'sister', 'daughter', 'grandmother', 'aunt'],
      { min: 1, max: 3 }
    )
  };
};

const generatePreviousCancerHistory = () => {
  if (Math.random() > 0.02) return null; // 2% chance of previous cancer

  return {
    yearDiagnosed: faker.date.past({ years: 20 }).getFullYear(),
    type: faker.helpers.arrayElement([
      'ductal_carcinoma_in_situ',
      'invasive_ductal_carcinoma',
      'invasive_lobular_carcinoma'
    ]),
    treatment: faker.helpers.arrayElements([
      'surgery',
      'radiotherapy',
      'chemotherapy',
      'hormone_therapy'
    ], { min: 1, max: 3 })
  };
};

const generateRecentSymptoms = () => {
  if (Math.random() > 0.1) return null; // 10% chance of recent symptoms

  return faker.helpers.arrayElements([
    'lump',
    'pain',
    'nipple_discharge',
    'skin_changes',
    'shape_change'
  ], { min: 1, max: 2 });
};

const generateMedications = () => {
  if (Math.random() > 0.3) return []; // 30% chance of medications

  return faker.helpers.arrayElements([
    'hormone_replacement_therapy',
    'blood_pressure_medication',
    'diabetes_medication',
    'cholesterol_medication'
  ], { min: 1, max: 3 });
};

module.exports = {
  generateParticipant
};
