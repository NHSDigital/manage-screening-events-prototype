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
  removeEmpty,
  findById,
}
