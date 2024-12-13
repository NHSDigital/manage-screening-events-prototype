// app/lib/utils/status.js

/**
 * Map a status to its corresponding tag colour in NHS.UK frontend
 * @param {string} status - The status to map
 * @returns {string} The tag colour
 */
const getStatusTagColour = (status) => {
  const colourMap = {
    // Clinic statuses
    scheduled: '', // default blue
    in_progress: 'blue',
    closed: 'grey',

    // Event statuses
    checked_in: 'yellow',
    complete: 'green',
    did_not_attend: 'red',
    attended_not_screened: 'orange',
  }
  return colourMap[status] || ''
}

const filterEventsByStatus = (events, filter) => {
  switch (filter) {
    case 'scheduled':
      return events.filter(e => e.status === 'scheduled')
    case 'checked-in':
      return events.filter(e => e.status === 'checked_in')
    case 'complete':
      return events.filter(e => ['complete', 'attended_not_screened'].includes(e.status))
    default:
      return events
  }
}

module.exports = {
  getStatusTagColour,
  filterEventsByStatus,
}
