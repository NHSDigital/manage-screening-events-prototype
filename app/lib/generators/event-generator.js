// app/lib/generators/event-generator.js

const generateId = require('../utils/id-generator');
const { faker } = require('@faker-js/faker');
const weighted = require('weighted');

const NOT_SCREENED_REASONS = [
  "Recent mammogram at different facility",
  "Currently undergoing breast cancer treatment",
  "Breast implants requiring special imaging",
  "Acute breast symptoms requiring GP referral",
  "Currently pregnant or breastfeeding",
  "Recent breast surgery"
];

const generateEvent = ({ slot, participant, clinic, outcomeWeights }) => {
  const isPast = new Date(slot.dateTime) < new Date();
  const isToday = new Date(slot.dateTime).toDateString() === new Date().toDateString();
  
  // Define possible statuses based on timing
  let status;
  let attendanceStatus = null;
  let notScreenedReason = null;

  if (isPast) {
    // For past events, generate final status
    const statuses = ['attended', 'did_not_attend', 'attended_not_screened'];
    const weights = [0.65, 0.25, 0.1];
    attendanceStatus = weighted.select(statuses, weights);

    if (attendanceStatus === 'attended_not_screened') {
      notScreenedReason = faker.helpers.arrayElement(NOT_SCREENED_REASONS);
    }

    status = 'completed';
  } else if (isToday) {
    // For today's events, mix of statuses
    const statuses = ['scheduled', 'checked_in', 'pre_screening', 'completed'];
    const weights = [0.4, 0.2, 0.2, 0.2];
    status = weighted.select(statuses, weights);
  } else {
    status = 'scheduled';
  }

  const event = {
    id: generateId(),
    participantId: participant.id,
    clinicId: clinic.id,
    slotId: slot.id,
    status,
    type: 'screening',
    details: {
      attendanceStatus,
      notScreenedReason,
      screeningType: 'mammogram',
      machineId: generateId(),
      imagesTaken: status === 'completed' && attendanceStatus === 'attended' ? 
        ['RCC', 'LCC', 'RMLO', 'LMLO'] : null
    },
    statusHistory: generateStatusHistory(status, slot.dateTime)
  };

  // Add outcome for completed events where participant attended and was screened
  if (status === 'completed' && attendanceStatus === 'attended') {
    const outcomeKeys = Object.keys(outcomeWeights);
    const outcomeValues = Object.values(outcomeWeights);
    const outcome = weighted.select(outcomeKeys, outcomeValues);
    
    event.outcome = {
      status: outcome,
      decidedDate: new Date(slot.dateTime).toISOString(),
      notes: generateOutcomeNotes(outcome),
      followUpActions: generateFollowUpActions(outcome)
    };
  }

  return event;
};

const generateStatusHistory = (currentStatus, dateTime) => {
  const history = [];
  const baseDate = new Date(dateTime);
  
  // Always starts with scheduled
  history.push({
    status: 'scheduled',
    timestamp: new Date(baseDate.getTime() - (24 * 60 * 60 * 1000)).toISOString() // Day before
  });

  // Add intermediate statuses based on current status
  const statusSequence = ['checked_in', 'pre_screening', 'completed'];
  const currentIndex = statusSequence.indexOf(currentStatus);
  
  if (currentIndex >= 0) {
    for (let i = 0; i <= currentIndex; i++) {
      history.push({
        status: statusSequence[i],
        timestamp: new Date(baseDate.getTime() + (i * 15 * 60 * 1000)).toISOString() // 15 min intervals
      });
    }
  }

  return history;
};

const generateOutcomeNotes = (outcome) => {
  const notes = {
    'clear': [
      'No significant findings',
      'Normal screening results',
      'Routine screening - no concerns'
    ],
    'needs_further_tests': [
      'Additional views required',
      'Dense tissue - ultrasound recommended',
      'Possible abnormality - further investigation needed'
    ],
    'cancer_detected': [
      'Suspicious mass detected',
      'Calcifications requiring biopsy',
      'Architectural distortion noted'
    ]
  };

  return faker.helpers.arrayElement(notes[outcome]);
};

const generateFollowUpActions = (outcome) => {
  const actions = {
    'clear': [
      { action: 'routine_screening', timeframe: 'three_years' }
    ],
    'needs_further_tests': [
      { action: 'additional_mammogram_views', timeframe: 'two_weeks' },
      { action: 'ultrasound', timeframe: 'two_weeks' },
      { action: 'clinical_assessment', timeframe: 'two_weeks' }
    ],
    'cancer_detected': [
      { action: 'urgent_referral', timeframe: 'one_week' },
      { action: 'biopsy', timeframe: 'two_weeks' },
      { action: 'mdt_review', timeframe: 'two_weeks' }
    ]
  };

  return faker.helpers.arrayElements(actions[outcome], { min: 1, max: actions[outcome].length });
};

module.exports = {
  generateEvent
};
