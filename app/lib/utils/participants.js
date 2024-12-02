// app/lib/utils/participants.js

/**
 * Get full name of participant
 * @param {Object} participant - Participant object
 */
const getFullName = (participant) => {
  if (!participant?.demographicInformation) return '';
  const { firstName, middleName, lastName } = participant.demographicInformation;
  return [firstName, middleName, lastName].filter(Boolean).join(' ');
};

/**
 * Get full name of participant
 * @param {Object} participant - Participant object
 */
const getFullNameReversed = (participant) => {
  if (!participant?.demographicInformation) return '';
  const { firstName, middleName, lastName } = participant.demographicInformation;
  return [`${lastName},`, firstName, middleName].filter(Boolean).join(' ');
};

/**
 * Get short name (first + last) of participant
 * @param {Object} participant - Participant object
 */
const getShortName = (participant) => {
  if (!participant?.demographicInformation) return '';
  const { firstName, lastName } = participant.demographicInformation;
  return `${firstName} ${lastName}`;
};

/**
 * Find a participant by their SX number
 * @param {Array} participants - Array of all participants
 * @param {string} sxNumber - SX number to search for
 */
const findBySXNumber = (participants, sxNumber) => {
  return participants.find(p => p.sxNumber === sxNumber);
};

/**
 * Get participant's age
 * @param {Object} participant - Participant object
 */
const getAge = (participant) => {
  if (!participant?.demographicInformation?.dateOfBirth) return null;
  const dob = new Date(participant.demographicInformation.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

/**
 * Sort participants by surname
 * @param {Array} participants - Array of participants to sort
 * @returns {Array} Sorted participants array
 */
const sortBySurname = (participants) => {
  return [...participants].sort((a, b) => {
    const surnameA = a.demographicInformation?.lastName?.toLowerCase() || '';
    const surnameB = b.demographicInformation?.lastName?.toLowerCase() || '';
    return surnameA.localeCompare(surnameB);
  });
};

module.exports = {
  getFullName,
  getFullNameReversed,
  getShortName,
  findBySXNumber,
  getAge,
  sortBySurname
};
