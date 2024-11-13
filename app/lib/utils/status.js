// app/lib/utils/status.js


/**
 * Map a status to its corresponding tag colour in NHS.UK frontend
 * @param {string} status - The status to map
 * @returns {string} The tag colour
 */
const getStatusTagColour = (status) => {
  const colourMap = {
    // Clinic statuses
    scheduled: '',  // default blue
    in_progress: 'blue',
    closed: 'grey',

    // Event statuses
    pre_screening: 'yellow',
    attended: 'green',
    did_not_attend: 'red',
    attended_not_screened: 'orange'
  };
  return colourMap[status] || '';
}

/**
 * Get descriptive text for an event status
 * @param {string} status - The status to describe
 * @returns {string} Description of the status
 */
const getStatusDescription = (status) => {
  const descriptions = {
    // Clinic statuses
    scheduled: 'Clinic is scheduled to run',
    in_progress: 'Clinic is currently running',
    closed: 'Clinic has finished',

    // Event statuses
    scheduled: 'Appointment is booked',
    pre_screening: 'Patient is completing pre-screening',
    in_progress: 'Screening in progress',
    attended: 'Patient attended and was screened',
    did_not_attend: 'Patient did not attend',
    attended_not_screened: 'Patient attended but was not screened'
  };
  return descriptions[status] || status;
}

module.exports = {
  getStatusTagColour,
  getStatusDescription
};
