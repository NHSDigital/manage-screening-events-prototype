// app/lib/generators/event-generator.js

const generateId = require('../utils/id-generator');
const { faker } = require('@faker-js/faker');
const weighted = require('weighted');
const dayjs = require('dayjs');

const NOT_SCREENED_REASONS = [
  "Recent mammogram at different facility",
  "Currently undergoing breast cancer treatment",
  "Breast implants requiring special imaging",
  "Acute breast symptoms requiring GP referral",
  "Currently pregnant or breastfeeding",
  "Recent breast surgery"
];

const generateEvent = ({ slot, participant, clinic, outcomeWeights }) => {
  // Check if the event is from yesterday or before
  const eventDate = dayjs(slot.dateTime).startOf('day');
  const today = dayjs().startOf('day');
  const isPast = eventDate.isBefore(today);
  
  // All future events and today's events start as scheduled
  if (!isPast) {
    return {
      id: generateId(),
      participantId: participant.id,
      clinicId: clinic.id,
      slotId: slot.id,
      type: 'screening',
      status: 'scheduled',
      details: {
        screeningType: 'mammogram',
        machineId: generateId()
      },
      statusHistory: [
        {
          status: 'scheduled',
          timestamp: new Date(new Date(slot.dateTime).getTime() - (24 * 60 * 60 * 1000)).toISOString()
        }
      ]
    };
  }

  // For past events, generate final status
  const finalStatuses = ['attended', 'did_not_attend', 'attended_not_screened'];
  const weights = [0.65, 0.25, 0.1];
  const status = weighted.select(finalStatuses, weights);

  const event = {
    id: generateId(),
    participantId: participant.id,
    clinicId: clinic.id,
    slotId: slot.id,
    type: 'screening',
    status,
    details: {
      screeningType: 'mammogram',
      machineId: generateId(),
      imagesTaken: status === 'attended' ? 
        ['RCC', 'LCC', 'RMLO', 'LMLO'] : null,
      notScreenedReason: status === 'attended_not_screened' ?
        faker.helpers.arrayElement(NOT_SCREENED_REASONS) : null
    },
    statusHistory: generateStatusHistory(status, slot.dateTime)
  };

  // Add outcome for completed events where participant attended
  if (status === 'attended') {
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

const generateStatusHistory = (finalStatus, dateTime) => {
  const history = [];
  const baseDate = new Date(dateTime);
  
  // Always starts with scheduled status
  history.push({
    status: 'scheduled',
    timestamp: new Date(baseDate.getTime() - (24 * 60 * 60 * 1000)).toISOString() // Day before
  });

  // Add intermediate statuses based on final status
  if (finalStatus === 'attended') {
    history.push(
      {
        status: 'pre_screening',
        timestamp: new Date(baseDate.getTime() - (10 * 60 * 1000)).toISOString() // 10 mins before
      },
      {
        status: 'in_progress',
        timestamp: new Date(baseDate).toISOString()
      },
      {
        status: finalStatus,
        timestamp: new Date(baseDate.getTime() + (15 * 60 * 1000)).toISOString() // 15 mins after
      }
    );
  } else {
    // For did_not_attend and attended_not_screened, just add the final status
    history.push({
      status: finalStatus,
      timestamp: new Date(baseDate.getTime() + (15 * 60 * 1000)).toISOString()
    });
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
