// app/lib/utils/.js

const dayjs = require('dayjs')
const { eligibleForReading, getStatusTagColour } = require('./status')

/**
 * Get all recent clinics that are available for reading
 * Includes completed screening events and reading progress
 */
const getReadingClinics = (data, options = {}) => {
  const {
    daysToLookBack = 30
  } = options

  const cutoffDate = dayjs().subtract(daysToLookBack, 'days').startOf('day')

  return data.clinics
    .filter(clinic =>
      // Only get clinics from last X days
      dayjs(clinic.date).isAfter(cutoffDate) &&
      // That have screenable events
      data.events.some(e => e.clinicId === clinic.id && eligibleForReading(e))
    )
    .map(clinic => {
      const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId)
      const location = unit.locations.find(l => l.id === clinic.locationId)

      return {
        ...clinic,
        unit,
        location,
        readingStatus: getClinicReadingStatus(data, clinic.id)
      }
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Get readable events for a clinic with read status
 */
const getReadableEvents = (data, clinicId) => {
  return data.events
    .filter(event =>
      event.clinicId === clinicId &&
      eligibleForReading(event)
    )
    .map(event => ({
      ...event,
      participant: data.participants.find(p => p.id === event.participantId),
      readStatus: event.reads?.length > 0 ? 'Read' : 'Not read',
      tagColor: getStatusTagColour(event.reads?.length > 0 ? 'read' : 'not_read')
    }))
    .sort((a, b) => new Date(a.timing.startTime) - new Date(b.timing.startTime))
}

/**
 * Get reading status and stats for a clinic
 */
const getClinicReadingStatus = (data, clinicId) => {
  const readableEvents = data.events.filter(event =>
    event.clinicId === clinicId && eligibleForReading(event)
  )

  const readEvents = readableEvents.filter(e => e.reads?.length > 0)
  const status = readEvents.length === readableEvents.length ? 'Complete' :
    readEvents.length > 0 ? 'In progress' : 'Not started'

  return {
    total: readableEvents.length,
    complete: readEvents.length,
    remaining: readableEvents.length - readEvents.length,
    status,
    statusColor: getStatusTagColour(status),
    daysSinceScreening: readableEvents[0] ?
      dayjs().startOf('day').diff(dayjs(readableEvents[0].timing.startTime).startOf('day'), 'days') : 0
  }
}

/**
 * Get first clinic available for reading
 */
const getFirstAvailableClinic = (data) => {
  const clinics = getReadingClinics(data)
  return clinics.find(clinic => clinic.readingStatus.remaining > 0) || null
}

/**
 * Get first unread event in a clinic
 */
const getFirstUnreadEvent = (data, clinicId) => {
  return data.events.find(event =>
    event.clinicId === clinicId &&
    eligibleForReading(event) &&
    !event.reads?.length
  ) || null
}

/**
 * Get first unread event from first available clinic
 */
const getFirstUnreadEventOverall = (data) => {
  const firstClinic = getFirstAvailableClinic(data)
  if (!firstClinic) return null

  return getFirstUnreadEvent(data, firstClinic.id)
}

/**
 * Get progress through reading a set of events
 * Handles navigation between events
 */
const getReadingProgress = (events, currentEventId, skippedEvents = []) => {
  const currentIndex = events.findIndex(e => e.id === currentEventId)

  // Sequential navigation
  const nextEventId = currentIndex < events.length - 1 ?
    events[currentIndex + 1].id : null
  const previousEventId = currentIndex > 0 ?
    events[currentIndex - 1].id : null

  // Find next/previous unread events with wraparound
  const nextUnreadId = findNextUnreadEvent(events, currentIndex)
  const previousUnreadId = findPreviousUnreadEvent(events, currentIndex)

  return {
    current: currentIndex + 1,
    total: events.length,
    completed: events.filter(e => e.reads?.length > 0).length,
    hasNext: !!nextEventId,
    hasPrevious: !!previousEventId,
    nextEventId,
    previousEventId,
    hasNextUnread: !!nextUnreadId,
    hasPreviousUnread: !!previousUnreadId,
    nextUnreadId,
    previousUnreadId,
    skippedCount: skippedEvents.length,
    skippedEvents,
    isCurrentSkipped: skippedEvents.includes(currentEventId),
    nextEventSkipped: nextEventId ? skippedEvents.includes(nextEventId) : false,
    previousEventSkipped: previousEventId ? skippedEvents.includes(previousEventId) : false
  }
}

// Helper functions for finding next/previous unread events
const findNextUnreadEvent = (events, currentIndex) => {
  // Look after current position
  for (let i = currentIndex + 1; i < events.length; i++) {
    if (!events[i].reads?.length) return events[i].id
  }
  // Look from start if none found
  for (let i = 0; i < currentIndex; i++) {
    if (!events[i].reads?.length) return events[i].id
  }
  return null
}

const findPreviousUnreadEvent = (events, currentIndex) => {
  // Look before current position
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (!events[i].reads?.length) return events[i].id
  }
  // Look from end if none found
  for (let i = events.length - 1; i > currentIndex; i--) {
    if (!events[i].reads?.length) return events[i].id
  }
  return null
}

const getReadingStatus = (event) => {
  const imageReadCount = Object.keys(event?.imageReading?.reads || {})

  switch (imageReadCount) {
    case 0:
      return 'Not started'
      break;
    case 1: 'Read once'
      break;
    case 2: 'Read twice'
    default:
      break;
  }
}

// All reads for an event
const getReads = (event) => {
  return Object.values(event?.imageReading?.reads || {})
}

// Get read for a specific user
const getReadForUser = (event, userId) => {
  return event?.imageReading?.reads?.[userId] || null
}

// Get read for current user
const getCurrentUserRead = function(event, userId = null) {
  const currentUserId = userId || this?.ctx?.data?.currentUser?.id
  if (!currentUserId) {
    console.warn('getCurrentUserRead: No user ID provided or found in context')
    return null
  }
  return getReadForUser(event, currentUserId)
}

const writeReading = (event, userId, reading) => {
  event.imageReading.reads[userId] = {
    ...reading,
    timestamp: new Date().toISOString()
  }
}

module.exports = {
  getReadingClinics,
  getReadableEvents,
  getClinicReadingStatus,
  getFirstAvailableClinic,
  getFirstUnreadEvent,
  getFirstUnreadEventOverall,
  getReadingProgress,
  getReadingStatus,
  getReads,
  getReadForUser,
  getCurrentUserRead,
  writeReading
}