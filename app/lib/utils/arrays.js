// app/lib/utils/arrays.js

/**
 * Find an object by ID in an array
 * @param {Array} array - Array to search
 * @param {string} id - ID to find
 * @returns {Object} Found object or undefined
 */
const findById = (array, id) => {
  if (!array || !Array.isArray(array)) return undefined;
  return array.find(item => item.id === id);
};

module.exports = {
  findById
};
