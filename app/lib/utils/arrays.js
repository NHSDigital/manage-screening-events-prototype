// app/lib/utils/arrays.js
var _ = require('lodash');


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

const push = (array, item) => {
  let newArray = [...array]
  newArray.push(_.cloneDeep(item)) // clone needed to stop this mutating original
  return newArray
}

module.exports = {
  push,
  findById
};
