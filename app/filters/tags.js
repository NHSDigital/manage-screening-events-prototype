// app/filters/tags.js

const { formatWords, sentenceCase, snakeCase } = require('../lib/utils/strings')
const { getStatusTagColour } = require('../lib/utils/status')

/**
 * Convert a status string into an NHS tag
 * @param {string} status - Status to convert
 * @param {Object} [options] - Optional configuration
 * @returns {string} HTML for tag component
 */
const toTag = (status, options = {}) => {
  if (!status) return ''

  // Format the status text for display
  const text = options.text || sentenceCase(formatWords(status))

  // Format the status for use in class names
  const statusForClass = snakeCase(status)

  // Get the colour class
  const colourClass = options.colour || getStatusTagColour(statusForClass)

  // Build classes string
  const classes = [
    'nhsuk-tag',
    colourClass ? `nhsuk-tag--${colourClass}` : '',
    options.classes || '',
  ].filter(Boolean).join(' ')

  // Generate tag HTML
  return `<strong class="${classes}">${text}</strong>`
}

module.exports = {
  toTag,
}