// app/lib/generators/event-generator.js

const generateId = require('../utils/id-generator');
const { faker } = require('@faker-js/faker');
const weighted = require('weighted');
const dayjs = require('dayjs');
const config = require('../../config');


const NOT_SCREENED_REASONS = [
 "Recent mammogram at different facility",
 "Currently undergoing breast cancer treatment",
 "Breast implants requiring special imaging",
 "Acute breast symptoms requiring GP referral",
 "Currently pregnant or breastfeeding",
 "Recent breast surgery"
];

const determineEventStatus = (slotDateTime, currentDateTime, attendanceWeights) => {
  slotDateTime = dayjs(slotDateTime);

  const simulatedTime = dayjs(currentDateTime);
  const slotDate = slotDateTime.startOf('day');
  const currentDate = simulatedTime.startOf('day');

  // For future dates or future slots today, always return scheduled
  if (slotDateTime.isAfter(simulatedTime)) {
    return 'scheduled';
  }

  if (slotDate.isBefore(currentDate)){
    const finalStatuses = ['attended', 'did_not_attend', 'attended_not_screened'];
    return weighted.select(finalStatuses, attendanceWeights);
  }

  // For past slots, generate a status based on how long ago the slot was
  const minutesPassed = simulatedTime.diff(slotDateTime, 'minute');
  
  // Define probability weights for different statuses based on time passed
  if (minutesPassed <= 60) {
    // Within 30 mins of appointment
    return weighted.select({
      'checked_in': 0.6,
      'attended': 0.1,
      'attended_not_screened': 0.1,
      'scheduled': 0.2,
    });
  } else {
    // More than 30 mins after appointment
    return weighted.select({
      'attended': 0.6,
      'attended_not_screened': 0.1,
      'scheduled': 0.2,
    });
  }
};

const generateEvent = ({ slot, participant, clinic, outcomeWeights }) => {

  // Get simulated current time
  const [hours, minutes] = config.clinics.simulatedTime.split(':');
  const currentDateTime = dayjs().hour(parseInt(hours)).minute(parseInt(minutes));

  // Check if the event is from yesterday or before
  const eventDate = dayjs(slot.dateTime).startOf('day');
  const today = dayjs(currentDateTime).startOf('day');
  const isPast = dayjs(slot.dateTime).isBefore(currentDateTime);
  const isTodayBeforeCurrentTime = eventDate.isBefore(currentDateTime)

 // If it's an assessment clinic, override the outcome weights to reflect higher probability of findings
 const eventWeights = clinic.clinicType === 'assessment' ? 
   {
     'clear': 0.4,                  // Lower chance of clear results
     'needs_further_tests': 0.45,   // Higher chance of needing more tests
     'cancer_detected': 0.15        // Higher cancer detection rate
   } : outcomeWeights;

 // Adjust attendance probability for assessment clinics
 const attendanceWeights = clinic.clinicType === 'assessment' ? 
   [0.9, 0.015, 0] :  // [attended, dna, attended_not_screened]
   [0.70, 0.25, 0.05];   // Original weights for screening

  const eventBase = {
    id: generateId(),
    participantId: participant.id,
    clinicId: clinic.id,
    slotId: slot.id,
    type: clinic.clinicType,
    timing: {
      startTime: slot.dateTime,
      endTime: slot.endDateTime,
      duration: slot.duration
    },
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

  // All future events and today's events start as scheduled
  if (!isPast) {
    return eventBase;
  }

  // For past events, generate final status with clinic-appropriate weights
  const status = determineEventStatus(slot.dateTime, currentDateTime, attendanceWeights);

  const event = {
    ...eventBase,
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

  // For attended events, add actual timing info
  if (status === 'attended') {
    // Randomly vary the actual duration slightly from scheduled
    const actualStartOffset = faker.number.int({ min: -5, max: 5 }); // Minutes
    const actualDurationOffset = faker.number.int({ min: -3, max: 5 }); // Minutes
    
    const actualStartTime = new Date(slot.dateTime);
    actualStartTime.setMinutes(actualStartTime.getMinutes() + actualStartOffset);
    
    const actualEndTime = new Date(actualStartTime);
    actualEndTime.setMinutes(actualEndTime.getMinutes() + slot.duration + actualDurationOffset);

    event.timing = {
      ...event.timing,
      actualStartTime: actualStartTime.toISOString(),
      actualEndTime: actualEndTime.toISOString(),
      actualDuration: Math.round((actualEndTime - actualStartTime) / (1000 * 60)) // In minutes
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
       status: 'checked_in',
       timestamp: new Date(baseDate.getTime() - (10 * 60 * 1000)).toISOString() // 10 mins before
     },
     // {
     //   status: 'in_progress',
     //   timestamp: new Date(baseDate).toISOString()
     // },
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
