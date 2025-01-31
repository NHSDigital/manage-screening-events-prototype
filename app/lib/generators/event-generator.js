// app/lib/generators/event-generator.js

const generateId = require('../utils/id-generator')
const { faker } = require('@faker-js/faker')
const weighted = require('weighted')
const dayjs = require('dayjs')
const config = require('../../config')
const { generateMammogramImages } = require('./mammogram-generator')

const NOT_SCREENED_REASONS = [
  'Recent mammogram at different facility',
  'Currently undergoing breast cancer treatment',
  'Breast implants requiring special imaging',
  'Acute breast symptoms requiring GP referral',
  'Currently pregnant or breastfeeding',
  'Recent breast surgery',
]

const determineEventStatus = (slotDateTime, currentDateTime, attendanceWeights) => {
  slotDateTime = dayjs(slotDateTime)

  const simulatedTime = dayjs(currentDateTime)
  const slotDate = slotDateTime.startOf('day')
  const currentDate = simulatedTime.startOf('day')

  // For future dates or future slots today, always return scheduled
  if (slotDateTime.isAfter(simulatedTime)) {
    return weighted.select({
      event_scheduled: 0.95,
      event_cancelled: 0.05,
    })
  }

  if (slotDate.isBefore(currentDate)) {
    const finalStatuses = ['event_complete', 'event_partially_screened', 'event_did_not_attend', 'event_attended_not_screened']
    return weighted.select(finalStatuses, attendanceWeights)
  }

  // For past slots, generate a status based on how long ago the slot was
  const minutesPassed = simulatedTime.diff(slotDateTime, 'minute')

  // Define probability weights for different statuses based on time passed
  if (minutesPassed <= 60) {
    // Within 30 mins of appointment
    return weighted.select({
      event_checked_in: 0.6,
      event_complete: 0.1,
      event_attended_not_screened: 0.1,
      event_scheduled: 0.2,
    })
  } else {
    // More than 30 mins after appointment
    return weighted.select({
      event_complete: 0.6,
      event_attended_not_screened: 0.1,
      event_scheduled: 0.2,
    })
  }
}

const generateEvent = ({ slot, participant, clinic, outcomeWeights, forceStatus = null }) => {
  // Parse dates once
  const [hours, minutes] = config.clinics.simulatedTime.split(':')
  const simulatedDateTime = dayjs().hour(parseInt(hours)).minute(parseInt(minutes))
  const slotDateTime = dayjs(slot.dateTime)
  const isPast = slotDateTime.isBefore(simulatedDateTime)

  // Check if this is a special event (participant has extra needs)
  const isSpecialAppointment = Boolean(participant.extraNeeds?.length)

  // Double the duration for participants with extra needs
  const duration = isSpecialAppointment ? slot.duration * 2 : slot.duration
  const endDateTime = dayjs(slot.dateTime).add(duration, 'minute')

  const attendanceWeights = clinic.clinicType === 'assessment'
    ? [0.8, 0.1, 0.015, 0]
    : [0.70, 0.1, 0.15, 0.05]

  // We'll use forceStatus if provided, otherwise calculate based on timing
  const eventStatus = forceStatus || determineEventStatus(slotDateTime, simulatedDateTime, attendanceWeights)

  const eventBase = {
    id: generateId(),
    participantId: participant.id,
    clinicId: clinic.id,
    slotId: slot.id,
    type: clinic.clinicType,
    timing: {
      startTime: slot.dateTime,
      endTime: endDateTime.toISOString(),
      duration,
    },
    status: eventStatus,
    details: {
      screeningType: 'mammogram',
      machineId: generateId(),
      isSpecialAppointment,
      extraNeeds: participant.extraNeeds,
    },
    statusHistory: [
      {
        status: 'event_scheduled',
        timestamp: dayjs(slot.dateTime).subtract(1, 'day').toISOString(),
      },
    ],
  }

  if (!isPast) {
    return eventBase
  }

  // For past or forced statuses, add appropriate extra details
  if (isPast || forceStatus) {
    const event = {
      ...eventBase,
      details: {
        ...eventBase.details,
        notScreenedReason: eventStatus === 'event_attended_not_screened'
          ? faker.helpers.arrayElement(NOT_SCREENED_REASONS)
          : null,
      },
    }

    // Add timing details for completed appointments
    if (eventStatus === 'event_complete') {
      const actualStartOffset = faker.number.int({ min: -5, max: 5 })
      const durationOffset = isSpecialAppointment
        ? faker.number.int({ min: -3, max: 10 })
        : faker.number.int({ min: -3, max: 5 })

      const actualStartTime = slotDateTime.add(actualStartOffset, 'minute')
      const actualEndTime = actualStartTime.add(slot.duration + durationOffset, 'minute')

      event.timing = {
        ...event.timing,
        actualStartTime: actualStartTime.toISOString(),
        actualEndTime: actualEndTime.toISOString(),
        actualDuration: actualEndTime.diff(actualStartTime, 'minute'),
      }

      // Add mammogram images for completed events
      event.mammogramData = generateMammogramImages({
        startTime: actualStartTime,
        isSeedData: true
      })
    }

    return event
  }

  return eventBase
}

const generateStatusHistory = (finalStatus, dateTime) => {
  const history = []
  const baseDate = new Date(dateTime)

  // Always starts with scheduled status
  history.push({
    status: 'event_scheduled',
    timestamp: new Date(baseDate.getTime() - (24 * 60 * 60 * 1000)).toISOString(), // Day before
  })

  // Add intermediate statuses based on final status
  if (finalStatus === 'event_complete') {
    history.push(
      {
        status: 'checked_in',
        timestamp: new Date(baseDate.getTime() - (10 * 60 * 1000)).toISOString(), // 10 mins before
      },
      // {
      //   status: 'in_progress',
      //   timestamp: new Date(baseDate).toISOString()
      // },
      {
        status: finalStatus,
        timestamp: new Date(baseDate.getTime() + (15 * 60 * 1000)).toISOString(), // 15 mins after
      }
    )
  } else {
    // For did_not_attend and attended_not_screened, just add the final status
    history.push({
      status: finalStatus,
      timestamp: new Date(baseDate.getTime() + (15 * 60 * 1000)).toISOString(),
    })
  }

  return history
}

module.exports = {
  generateEvent,
}
