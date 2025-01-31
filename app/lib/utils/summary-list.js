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
    if (!isEmpty(value)) return row

    const keyText = row.actions?.items?.[0]?.visuallyHiddenText || row.key.text.toLowerCase()
    const href = row.actions?.items?.[0]?.href || '#'


    return {
      ...row,
      value: {
        html: `<a href="${href}" class="nhsuk-link">Enter ${keyText}</a>`
        // html: `<a href="${href}" class="nhsuk-link">Enter details</a>`
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