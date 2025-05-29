// app/lib/utils/summary-list.js

const _ = require('lodash')

/**
 * Check if a value should be considered empty/missing
 * @param {any} value - Value to check
 * @returns {boolean} True if value should be considered empty
 */
const isEmpty = (value) => {
  if (_.isString(value)) {
    return value.trim() === '' || value.toLowerCase() === 'incomplete'
  }
  return value === null || value === undefined
}

/**
 * Convert value object to "Enter X" link if empty
 * @param {Object} row - Summary list row
 * @returns {Object} Modified row with enter link if empty
 */
const showMissingInformationLink = (summaryList) => {
  if (!summaryList?.rows) return summaryList

  const updatedRows = summaryList.rows.map(row => {

    const value = row.value?.text || row.value?.html
    const hasAction = row.actions && row.actions.items && row.actions.items.length > 0

    // If value is not empty or there are no existing actions, return row as is
    if (!isEmpty(value) || (!hasAction)) return row

    const keyText = row.actions?.items?.[0]?.visuallyHiddenText || row.key.text.toLowerCase()
    const href = row.actions?.items?.[0]?.href || '#'

    return {
      ...row,
      value: {
        html: `<a href="${href}" class="nhsuk-link">Enter ${keyText} details</a>`
      },
      actions: {
        items: []
      }
    }
  })

  return {
    ...summaryList,
    rows: updatedRows
  }
}

module.exports = {
  showMissingInformationLink
}