// app/lib/utils/status.js

/**
 * Define status groups for easier checking
 * @type {Object}
 */
const STATUS_GROUPS = {
  completed: ['event_complete', 'event_partially_screened'],
  final: ['event_complete', 'event_partially_screened', 'event_did_not_attend', 'event_attended_not_screened', 'event_cancelled'],
  active: ['event_scheduled', 'event_checked_in'],
  needs_reading: ['event_complete', 'event_partially_screened'],
}

/**
 * Check if a status belongs to a specific group
 * @param {string} status - The status to check
 * @param {string} group - The group to check against
 * @returns {boolean} Whether the status belongs to the group
 */
const isStatusInGroup = (status, group) => {
  if (!STATUS_GROUPS[group]) return false
  return STATUS_GROUPS[group].includes(status)
}

/**
 * Get status from either a status string or event object
 * @param {string|Object} input - Status string or event object
 * @returns {string|null} The status or null if invalid
 */
const getStatus = (input) => {
  if (!input) return null
  if (typeof input === 'string') return input
  return input.status || null
}

/**
 * Check if a status represents a completed event
 * @param {string|Object} input - Status string or event object
 * @returns {boolean} Whether the status is completed
 */
const isCompleted = (input) => {
  const status = getStatus(input)
  if (!status) return false
  return isStatusInGroup(status, 'completed')
}

/**
 * Check if a status represents a final state
 * @param {string|Object} input - Status string or event object
 * @returns {boolean} Whether the status is final
 */
const isFinal = (input) => {
  const status = getStatus(input)
  if (!status) return false
  return isStatusInGroup(status, 'final')
}

/**
 * Check if a status represents an active event
 * @param {string|Object} input - Status string or event object
 * @returns {boolean} Whether the status is active
 */
const isActive = (input) => {
  const status = getStatus(input)
  if (!status) return false
  return isStatusInGroup(status, 'active')
}

/**
 * Check if a status indicates reading is needed
 * @param {string|Object} input - Status string or event object
 * @returns {boolean} Whether reading is needed
 */
const needsReading = (input) => {
  const status = getStatus(input)
  if (!status) return false
  return isStatusInGroup(status, 'needs_reading')
}

/**
 * Map a status to its corresponding tag colour in NHS.UK frontend
 * @param {string} status - The status to map
 * @returns {string} The tag colour
 */
const getStatusTagColour = (status) => {
  const colourMap = {
    // Clinic statuses
    scheduled: 'blue', // default blue
    in_progress: 'blue',
    closed: 'grey',

    // Event statuses
    event_scheduled: 'blue', // default blue
    event_checked_in: '', // no colour will get solid dark blue
    event_complete: 'green',
    event_partially_screened: 'orange',
    event_did_not_attend: 'red',
    event_cancelled: 'red',
    event_attended_not_screened: 'orange',

    // Image reading
    not_started: 'grey',
    unread: 'grey',
    skipped: 'white',

    // Image reading results
    normal: 'green',
    recall_for_assessment: 'red',
    technical_recall: 'orange',

    // Image status
    available: 'green',
    requested: 'orange',
    not_in_pacs: 'grey',

  }
  return colourMap[status.toLowerCase()] || ''
}

/**
 * Map a status to its corresponding text
 * @param {string} status - The status to map
 * @returns {string} The tag text
 */
const getStatusText = (status) => {
  const statusMap = {
    // Clinic statuses
    event_scheduled: 'Confirmed', // default blue
    // Event statuses
    event_checked_in: 'Checked in', // no colour will get solid dark blue
    event_complete: 'Screened',
    event_partially_screened: 'Partially screened',
    event_did_not_attend: 'Did not attend',
    event_attended_not_screened: 'Attended not screened',
    event_cancelled: 'Cancelled',

    // "technical-recall": 'Technical recall',
    // "recall-for-assesment": 'Recall for assessment',
  }
  return statusMap[status] || ''
}

const filterEventsByStatus = (events, filter) => {
  switch (filter) {
    case 'scheduled':
      return events.filter(e => e.status === 'event_scheduled')
    case 'checked-in':
      return events.filter(e => e.status === 'event_checked_in')
    case 'complete':
      return events.filter(e => isFinal(e))
    case 'remaining':
      return events.filter(e => isActive(e))
    default:
      return events
  }
}

module.exports = {
  isCompleted,
  isFinal,
  isActive,
  needsReading,
  getStatusTagColour,
  getStatusText,
  filterEventsByStatus,
  // Export groups for testing/reference
  STATUS_GROUPS,
}
