// app/lib/utils/status.js

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
  }
  return colourMap[status] || ''
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
    event_cancelled: "Cancelled",
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
      return events.filter(e => ['event_complete', 'event_partially_screened', 'event_attended_not_screened'].includes(e.status))
    case 'remaining':
        return events.filter(e => ['event_scheduled', 'event_checked_in'].includes(e.status))
    default:
      return events
  }
}

module.exports = {
  getStatusTagColour,
  getStatusText,
  filterEventsByStatus,
}
