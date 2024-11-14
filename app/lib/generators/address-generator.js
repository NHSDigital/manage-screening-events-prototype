// app/lib/utils/address-generator.js

const { faker } = require('@faker-js/faker');

// Common UK street names
const STREETS = [
  'High Street',
  'Church Road',
  'Station Road',
  'Victoria Road',
  'Manor Road',
  'The Green',
  'Queens Road',
  'Kings Road',
  'New Road',
  'School Lane',
  'Mill Lane',
  'The Avenue',
  'Park Road',
  'London Road',
  'York Road'
];

/**
 * Extract postcode area (first 1-2 letters) from a full postcode
 * @param {string} postcode - Full UK postcode
 * @returns {string} Postcode area (e.g., 'OX' from 'OX3 7LE')
 */
const getPostcodeArea = (postcode) => {
  return postcode.match(/^[A-Z]{1,2}/)[0];
};

/**
 * Get the postcode district (number after area) from a full postcode
 * @param {string} postcode - Full UK postcode
 * @returns {string} Postcode district number
 */
const getPostcodeDistrict = (postcode) => {
  return postcode.match(/^[A-Z]{1,2}(\d+)/)[1];
};

/**
 * Generate a random postcode in the same area as the reference postcode
 * @param {string} referencePostcode - Postcode to base the new one on
 * @returns {string} New postcode in same area
 */
const generateNearbyPostcode = (referencePostcode) => {
  const area = getPostcodeArea(referencePostcode);
  const district = getPostcodeDistrict(referencePostcode);
  
  // Generate nearby district number (±1 of reference, staying in valid range)
  const districtNum = parseInt(district);
  const nearbyDistrict = faker.helpers.arrayElement([
    districtNum,
    Math.max(1, districtNum - 1),
    districtNum + 1
  ]);
  
  // Generate random sector (0-9) and unit (two letters)
  const sector = faker.number.int({ min: 0, max: 9 });
  const unit = faker.helpers.arrayElement('ABCDEFGHJKLMNPQRSTUWXYZ') + 
               faker.helpers.arrayElement('ABCDEFGHJKLMNPQRSTUWXYZ');
  
  return `${area}${nearbyDistrict} ${sector}${unit}`;
};

/**
 * Generate list of nearby towns/areas based on BSU location
 * @param {Object} bsu - Breast screening unit object
 * @returns {Array} List of nearby towns/areas
 */
const generateNearbyAreas = (bsu) => {
  // Start with the BSU's own city and any address parts that look like areas
  const areas = new Set([
    bsu.address.city,
    bsu.address.line4,
    ...bsu.locations
      .filter(l => l.type === 'hospital')
      .map(l => l.address.city)
      .filter(Boolean)
  ].filter(Boolean));

  // Add some generated nearby areas
  for(let i = 0; i < 5; i++) {
    areas.add(faker.location.city());
  }

  return Array.from(areas);
};

/**
 * Generate an address appropriate for the BSU area
 * @param {Object} bsu - Breast screening unit object
 * @returns {Object} Generated address object
 */
const generateBSUAppropriateAddress = (bsu) => {
  const nearbyAreas = generateNearbyAreas(bsu);
  
  return {
    line1: `${faker.number.int({ min: 1, max: 300 })} ${faker.helpers.arrayElement(STREETS)}`,
    line2: Math.random() < 0.3 ? `${faker.word.adjective()} House` : null,
    city: faker.helpers.arrayElement(nearbyAreas),
    postcode: generateNearbyPostcode(bsu.address.postcode)
  };
};

module.exports = {
  generateBSUAppropriateAddress
};
