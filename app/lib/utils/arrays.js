// app/lib/utils/arrays.js

const _ = require('lodash')

/**
 * Find an object by ID in an array
 * @param {Array} array - Array to search
 * @param {string} id - ID to find
 * @returns {Object} Found object or undefined
 */
const findById = (array, id) => {
  if (!array || !Array.isArray(array)) return undefined
  return array.find(item => item.id === id)
}

const push = (array, item) => {
  const newArray = [...array]
  newArray.push(_.cloneDeep(item)) // clone needed to stop this mutating original
  return newArray
}

/**
 * Check if an array includes a value
 * @param {Array} array - Array to check
 * @param {*} value - Value to look for
 * @returns {boolean} True if array includes value, false otherwise
 */
const includes = (array, value) => {
  if (!array || !Array.isArray(array)) return false
  return array.includes(value)
}

/**
* Find first array item where the specified key matches the value
* @param {Array} array - Array to search
* @param {string} key - Object key to match against
* @param {any} value - Value to find
* @returns {any} First matching item or undefined
* @example
* const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}]
* find(users, 'name', 'Bob') // Returns {id: 2, name: 'Bob'}
*/
const find = (array, key, value) => {
  if (!array || !Array.isArray(array)) return undefined
  return array.find(item => item[key] === value)
 }

/**
 * Remove empty items from arrays or strings
 * @param {Array|string} items - Items to filter
 * @returns {Array|string|undefined} Filtered items or undefined if empty
 */
const removeEmpty = (items) => {
  if (!items) return

  if (_.isString(items)) {
    return items.trim() || undefined
  }

  if (_.isArray(items)) {
    const filtered = items.filter(item => item && item !== '')
    return filtered.length ? filtered : undefined
  }
}

module.exports = {
  push,
  includes,
  find,
  removeEmpty,
  findById,
}
