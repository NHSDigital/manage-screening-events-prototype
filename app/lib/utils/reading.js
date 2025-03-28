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
    .map(event => {
      const metadata = getReadingMetadata(event);

      let readStatus = 'Not read';
      if (metadata.readCount > 0) {
        readStatus = `Read (${metadata.readCount})`;
      }

      return {
        ...event,
        participant: data.participants.find(p => p.id === event.participantId),
        readStatus,
        tagColor: getStatusTagColour(metadata.readCount > 0 ? 'read' : 'not_read'),
        readingMetadata: metadata // Include metadata for use in templates
      };
    })
    .sort((a, b) => new Date(a.timing.startTime) - new Date(b.timing.startTime));
};

/**
 * Get reading status and stats for a clinic with user-specific info
 */
const getClinicReadingStatus = (data, clinicId, userId = null) => {
  const readableEvents = data.events.filter(event =>
    event.clinicId === clinicId && eligibleForReading(event)
  );

  // Count events with any reads using new structure
  const readEvents = readableEvents.filter(hasReads);

  const status = readEvents.length === readableEvents.length ? 'Complete' :
    readEvents.length > 0 ? 'In progress' : 'Not started';

  const result = {
    total: readableEvents.length,
    complete: readEvents.length,
    remaining: readableEvents.length - readEvents.length,
    status,
    statusColor: getStatusTagColour(status),
    daysSinceScreening: readableEvents[0] ?
      dayjs().startOf('day').diff(dayjs(readableEvents[0].timing.startTime).startOf('day'), 'days') : 0
  };

  // Add user-specific data if userId provided
  if (userId) {
    const userReadableEvents = readableEvents.filter(event => canUserReadEvent(event, userId));
    result.userReadableCount = userReadableEvents.length;
    result.userCanRead = userReadableEvents.length > 0;
    if (userReadableEvents.length > 0) {
      result.firstUserReadableId = userReadableEvents[0].id;
    }
  }

  return result;
};

/**
 * Get first unread event in a clinic that current user can read
 */
const getFirstUserReadableEvent = (data, clinicId, userId) => {
  const events = data.events.filter(event =>
    event.clinicId === clinicId &&
    eligibleForReading(event) &&
    canUserReadEvent(event, userId)
  );

  return events.length > 0 ? events[0] : null;
};

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
 * Enhanced to include user-specific navigation
 */
const getReadingProgress = (events, currentEventId, skippedEvents = [], userId = null) => {
  const currentIndex = events.findIndex(e => e.id === currentEventId);

  // Sequential navigation
  const nextEventId = currentIndex < events.length - 1 ?
    events[currentIndex + 1].id : null;
  const previousEventId = currentIndex > 0 ?
    events[currentIndex - 1].id : null;

  // Calculate completed count with new structure
  const completedCount = events.filter(hasReads).length;

  // Find next/previous unread events with wraparound
  const nextUnreadId = findNextUnreadEvent(events, currentIndex);
  const previousUnreadId = findPreviousUnreadEvent(events, currentIndex);

  // Only find user-specific navigation if userId is provided
  let nextUserReadableId = null;
  let previousUserReadableId = null;

  if (userId) {
    nextUserReadableId = findNextUserReadableEvent(events, currentIndex, userId);
    previousUserReadableId = findPreviousUserReadableEvent(events, currentIndex, userId);
  }

  return {
    current: currentIndex + 1,
    total: events.length,
    completed: completedCount,
    hasNext: !!nextEventId,
    hasPrevious: !!previousEventId,
    nextEventId,
    previousEventId,
    hasNextUnread: !!nextUnreadId,
    hasPreviousUnread: !!previousUnreadId,
    nextUnreadId,
    previousUnreadId,
    // User-specific navigation
    hasNextUserReadable: !!nextUserReadableId,
    hasPreviousUserReadable: !!previousUserReadableId,
    nextUserReadableId,
    previousUserReadableId,
    // Skipped events
    skippedCount: skippedEvents.length,
    skippedEvents,
    isCurrentSkipped: skippedEvents.includes(currentEventId),
    nextEventSkipped: nextEventId ? skippedEvents.includes(nextEventId) : false,
    previousEventSkipped: previousEventId ? skippedEvents.includes(previousEventId) : false
  };
};

// Helper functions for finding next/previous unread events
const findNextUnreadEvent = (events, currentIndex) => {
  // Look after current position
  for (let i = currentIndex + 1; i < events.length; i++) {
    if (!hasReads(events[i])) return events[i].id;
  }
  // Look from start if none found
  for (let i = 0; i < currentIndex; i++) {
    if (!hasReads(events[i])) return events[i].id;
  }
  return null;
};

const findPreviousUnreadEvent = (events, currentIndex) => {
  // Look before current position
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (!hasReads(events[i])) return events[i].id;
  }
  // Look from end if none found
  for (let i = events.length - 1; i > currentIndex; i--) {
    if (!hasReads(events[i])) return events[i].id;
  }
  return null;
};

/**
 * Check if an event has any reads
 * @param {Object} event - The event to check
 * @returns {boolean} Whether the event has any reads
 */
const hasReads = (event) => {
  return event.imageReading?.reads && Object.keys(event.imageReading.reads).length > 0;
};


const getReadingStatus = (event) => {
  const metadata = getReadingMetadata(event);

  if (metadata.readCount === 0) return 'Not read';
  if (metadata.readCount === 1) return 'First read complete';
  if (metadata.readCount === 2) {
    return metadata.hasDisagreement ? 'Needs arbitration' : 'Second read complete';
  }
  return `Read ${metadata.readCount} times`;
};

// All reads for an event
const getReads = (event) => {
  return event.imageReading?.reads ? Object.values(event.imageReading.reads) : [];
};

// Get read for a specific user
const getReadForUser = (event, userId) => {
  return event.imageReading?.reads?.[userId] || null;
};

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
  // Ensure imageReading structure exists
  if (!event.imageReading) {
    event.imageReading = { reads: {} };
  } else if (!event.imageReading.reads) {
    event.imageReading.reads = {};
  }

  // Add the reading with timestamp
  event.imageReading.reads[userId] = {
    ...reading,
    readerId: userId, // Ensure the reader ID is saved
    timestamp: new Date().toISOString()
  };
};

/**
 * Get reading metadata for an event
 * @param {Object} event - The event to check
 * @returns {Object} Object with reading metadata
 */
const getReadingMetadata = (event) => {
  // Get all reads from the imageReading structure
  const reads = event.imageReading?.reads ? Object.values(event.imageReading.reads) : [];
  const readerIds = reads.map(read => read.readerId);
  const uniqueReaderCount = new Set(readerIds).size;

  // Get all unique results from reads
  const results = reads.map(read => read.result);
  const uniqueResults = [...new Set(results)].filter(Boolean); // Filter out undefined results

  // Determine if there's disagreement between reads
  const hasDisagreement = uniqueResults.length > 1;

  return {
    readCount: reads.length,
    uniqueReaderCount,
    firstReadComplete: reads.length >= 1,
    secondReadComplete: reads.length >= 2,
    hasDisagreement,
    needsArbitration: hasDisagreement && reads.length >= 2,
    results: uniqueResults,
    reads
  };
};

/**
 * Check if an event needs a first read
 * @param {Object} event - The event to check
 * @returns {boolean} Whether a first read is needed
 */
const needsFirstRead = (event) => {
  return !hasReads(event);
};

/**
 * Check if an event needs a second read
 */
const needsSecondRead = (event) => {
  const metadata = getReadingMetadata(event);
  return metadata.firstReadComplete && !metadata.secondReadComplete;
};

/**
 * Check if an event needs arbitration
 */
const needsArbitration = (event) => {
  const metadata = getReadingMetadata(event);
  return metadata.needsArbitration;
};

/**
 * Find next event that needs a specific type of read
 * @param {Array} events - Array of events
 * @param {number} currentIndex - Current index in the array
 * @param {Function} predicate - Function to test if an event needs this type of read
 * @returns {string|null} ID of next event or null
 */
const findNextEventByReadType = (events, currentIndex, predicate) => {
  // Look after current position
  for (let i = currentIndex + 1; i < events.length; i++) {
    if (predicate(events[i])) return events[i].id;
  }
  // Look from start if none found
  for (let i = 0; i < currentIndex; i++) {
    if (predicate(events[i])) return events[i].id;
  }
  return null;
};

/**
 * Find next event that needs a first read
 */
const findNextFirstReadEvent = (events, currentIndex) => {
  return findNextEventByReadType(events, currentIndex, needsFirstRead);
};

/**
 * Find next event that needs a second read
 */
const findNextSecondReadEvent = (events, currentIndex) => {
  return findNextEventByReadType(events, currentIndex, needsSecondRead);
};

/**
 * Find next event that needs arbitration
 */
const findNextArbitrationEvent = (events, currentIndex) => {
  return findNextEventByReadType(events, currentIndex, needsArbitration);
};

// Helper functions for finding next/previous user-readable events
const findNextUserReadableEvent = (events, currentIndex, userId) => {
  // Look after current position
  for (let i = currentIndex + 1; i < events.length; i++) {
    if (canUserReadEvent(events[i], userId)) return events[i].id;
  }
  // Look from start if none found
  for (let i = 0; i < currentIndex; i++) {
    if (canUserReadEvent(events[i], userId)) return events[i].id;
  }
  return null;
};

const findPreviousUserReadableEvent = (events, currentIndex, userId) => {
  // Look before current position
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (canUserReadEvent(events[i], userId)) return events[i].id;
  }
  // Look from end if none found
  for (let i = events.length - 1; i > currentIndex; i--) {
    if (canUserReadEvent(events[i], userId)) return events[i].id;
  }
  return null;
};

// Batches
/**
 * Create a batch of events filtered by criteria
 * @param {Array} events - Array of all events
 * @param {Function} filter - Function to filter events
 * @returns {Array} Filtered events for the batch
 */
const createBatch = (events, filter) => {
  return events.filter(filter);
};

/**
 * Get batch of events that need first reads
 * @param {Array} events - Array of all events
 * @returns {Array} Events needing first reads
 */
const getFirstReadBatch = (events) => {
  return createBatch(events, needsFirstRead);
};

/**
 * Get batch of events that need second reads
 * @param {Array} events - Array of all events
 * @returns {Array} Events needing second reads
 */
const getSecondReadBatch = (events) => {
  return createBatch(events, needsSecondRead);
};

/**
 * Get batch of events that need arbitration
 * @param {Array} events - Array of all events
 * @returns {Array} Events needing arbitration
 */
const getArbitrationBatch = (events) => {
  return createBatch(events, needsArbitration);
};

/**
 * Get progress for a batch of events
 * @param {Array} batchEvents - Array of events in the batch
 * @param {string} currentEventId - ID of current event
 * @param {Array} skippedEvents - Array of skipped event IDs
 * @returns {Object} Progress object
 */
const getBatchProgress = (batchEvents, currentEventId, skippedEvents = []) => {
  return getReadingProgress(batchEvents, currentEventId, skippedEvents);
};

/**
 * Check if current user can read an event
 * @param {Object} event - The event to check
 * @param {string} userId - Current user ID
 * @param {Object} options - Options for determining eligibility
 * @returns {boolean} Whether the current user can read this event
 */
const canUserReadEvent = (event, userId, options = {}) => {
  const {
    preventDuplicateReads = true, // Prevent same user reading twice by default
    maxReadsPerEvent = 2,         // Default max reads per event
  } = options;

  const metadata = getReadingMetadata(event);

  // If max reads already reached, no more reads needed
  if (metadata.readCount >= maxReadsPerEvent && !metadata.needsArbitration) {
    return false;
  }

  // Check if user has already read this event
  const hasUserRead = !!getReadForUser(event, userId);

  // If preventing duplicate reads and user already read, not eligible
  if (preventDuplicateReads && hasUserRead) {
    return false;
  }

  // Special case: arbitration might allow a third read
  if (metadata.needsArbitration) {
    // Logic for determining who can arbitrate
    // For now, allow if user hasn't already read
    return !hasUserRead;
  }

  return true;
};

/**
 * Get events that need reads from the current user
 * @param {Array} events - Array of all events
 * @param {string} userId - Current user ID
 * @param {Object} options - Options for determining eligibility
 * @returns {Array} Events the user can read
 */
const getEventsForUserReading = (events, userId, options = {}) => {
  return events.filter(event =>
    eligibleForReading(event) && canUserReadEvent(event, userId, options)
  );
};

/**
 * Get next event that needs reading by the current user
 * @param {Array} events - Array of events
 * @param {number} currentIndex - Current index in events array
 * @param {string} userId - Current user ID
 * @param {Object} options - Options for determining eligibility
 * @returns {string|null} ID of next event or null
 */
const findNextEventForUserReading = (events, currentIndex, userId, options = {}) => {
  // Look after current position
  for (let i = currentIndex + 1; i < events.length; i++) {
    if (canUserReadEvent(events[i], userId, options)) {
      return events[i].id;
    }
  }

  // Look from start if none found
  for (let i = 0; i < currentIndex; i++) {
    if (canUserReadEvent(events[i], userId, options)) {
      return events[i].id;
    }
  }

  return null;
};

/**
 * Get count of events that need reading by the current user
 * @param {Array} events - Array of events
 * @param {string} userId - Current user ID
 * @param {Object} options - Options for determining eligibility
 * @returns {number} Count of events needing reading
 */
const countEventsForUserReading = (events, userId, options = {}) => {
  return getEventsForUserReading(events, userId, options).length;
};


module.exports = {
  getReadingClinics,
  getReadableEvents,
  getClinicReadingStatus,
  getFirstUserReadableEvent,
  getFirstAvailableClinic,
  getFirstUnreadEvent,
  getFirstUnreadEventOverall,
  getReadingProgress,
  getReadingStatus,
  getReads,
  getReadForUser,
  getCurrentUserRead,
  writeReading,
  hasReads,
  getReadingMetadata,
  needsFirstRead,
  needsSecondRead,
  needsArbitration,
  findNextEventByReadType,
  findNextFirstReadEvent,
  findNextSecondReadEvent,
  findNextArbitrationEvent,
  // Batch functions
  createBatch,
  getFirstReadBatch,
  getSecondReadBatch,
  getArbitrationBatch,
  getBatchProgress,
  // User-specific reading functions
  canUserReadEvent,
  getEventsForUserReading,
  findNextEventForUserReading,
  countEventsForUserReading,
}