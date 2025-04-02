// app/lib/utils/.js

const dayjs = require('dayjs')
const { eligibleForReading, getStatusTagColour } = require('./status')


// /**
//  * Get first unread event in a clinic
//  */
// const getFirstUnreadEvent = (data, clinicId) => {
//   return data.events.find(event =>
//     event.clinicId === clinicId &&
//     eligibleForReading(event) &&
//     !event.reads?.length
//   ) || null
// }

// /**
//  * Get first unread event from first available clinic
//  */
// const getFirstUnreadEventOverall = (data) => {
//   const firstClinic = getFirstAvailableClinic(data)
//   if (!firstClinic) return null

//   return getFirstUnreadEvent(data, firstClinic.id)
// }

/************************************************************************
// Single event
//***********************************************************************

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


/************************************************************************
// Multiple events
//***********************************************************************

/**
 * Get progress through reading a set of events
 * Enhanced to include user-specific navigation
 * @param {Array} events - Array of events to track progress through
 * @param {string} currentEventId - ID of current event
 * @param {Array} skippedEvents - Array of event IDs that have been skipped
 * @param {string} [userId=null] - Optional user ID (defaults to current user if available)
 * @returns {Object} Progress information
 */
const getReadingProgress = function(events, currentEventId, skippedEvents = [], userId = null) {
  // Get user ID from context if not provided and we're in a template context
  const currentUserId = userId || (this?.ctx?.data?.currentUser?.id);

  const currentIndex = events.findIndex(e => e.id === currentEventId);

  // Get complete events count
  const completedCount = events.filter(hasReads).length;

  // Basic sequential navigation
  const nextEvent = getNextEvent(events, currentEventId, false);
  const previousEvent = getPreviousEvent(events, currentEventId, false);

  // Get events needing any reads (first or second)
  const readableEvents = filterEventsByNeedsAnyRead(events);

  // Find next/previous of each type
  const nextReadableEvent = currentIndex !== -1 ?
    getNextEvent(readableEvents, currentEventId, true) : null;
  const previousReadableEvent = currentIndex !== -1 ?
    getPreviousEvent(readableEvents, currentEventId, true) : null;

  // For user-specific navigation, get events this user can read or has read
  let userNavigableEvents = events;
  if (currentUserId) {
    userNavigableEvents = filterEventsByUserCanReadOrHasRead(events, currentUserId);
  }

  // Find next/previous user-readable events if userId provided
  let nextUserReadableEvent = null;
  let previousUserReadableEvent = null;

  if (currentUserId && currentIndex !== -1) {
    nextUserReadableEvent = getNextEvent(userNavigableEvents, currentEventId, true);
    previousUserReadableEvent = getPreviousEvent(userNavigableEvents, currentEventId, true);
  }

  return {
    current: currentIndex + 1,
    total: events.length,
    completed: completedCount,
    // Event navigation
    hasNext: !!nextEvent,
    hasPrevious: !!previousEvent,
    nextEventId: nextEvent?.id || null,
    previousEventId: previousEvent?.id || null,
    hasNextReadableEvent: !!nextReadableEvent,
    hasPreviousReadableEvent: !!previousReadableEvent,
    nextReadableEventId: nextReadableEvent?.id || null,
    previousReadableEventId: previousReadableEvent?.id || null,
    // User-specific navigation
    hasNextUserReadable: !!nextUserReadableEvent,
    hasPreviousUserReadable: !!previousUserReadableEvent,
    nextUserReadableId: nextUserReadableEvent?.id || null,
    previousUserReadableId: previousUserReadableEvent?.id || null,
    // Skipped events
    skippedCount: skippedEvents.length,
    skippedEvents,
    isCurrentSkipped: skippedEvents.includes(currentEventId),
    nextEventSkipped: nextEvent ? skippedEvents.includes(nextEvent.id) : false,
    previousEventSkipped: previousEvent ? skippedEvents.includes(previousEvent.id) : false
  };
};

/**
 * Get detailed reading status for a group of events
 * @param {Array} events - Array of events to analyze
 * @param {string} [userId=null] - Optional user ID (defaults to current user if available)
 * @returns {Object} Detailed reading status
 */
const getReadingStatusForEvents = function(events, userId = null) {
  // Get user ID from context if not provided and we're in a template context
  const currentUserId = userId || (this?.ctx?.data?.currentUser?.id);

  if (!events || events.length === 0) {
    return {
      total: 0,
      firstReadCount: 0,
      firstReadRemaining: 0,
      secondReadCount: 0,
      secondReadRemaining: 0,
      secondReadReady: 0,
      arbitrationCount: 0,
      status: 'no_events',
      statusColor: 'grey',
      // User-specific counts
      userReadCount: 0,
      userFirstReadCount: 0,
      userSecondReadCount: 0,
      userReadableCount: 0,
      userFirstReadableCount: 0,
      userSecondReadableCount: 0
    };
  }

  // Count first reads (events with at least one read)
  const firstReadCount = events.filter(hasReads).length;

  // Count second reads (events with at least two different readers)
  const secondReadCount = events.filter(event => {
    const metadata = getReadingMetadata(event);
    return metadata.uniqueReaderCount >= 2;
  }).length;

  // Count events that are ready for second read (have first read but not second)
  const secondReadReady = events.filter(event => {
    const metadata = getReadingMetadata(event);
    return metadata.readCount === 1; // Exactly one read means ready for second
  }).length;

  // Count events needing arbitration (still track this for informational purposes)
  const arbitrationCount = events.filter(event => {
    const metadata = getReadingMetadata(event);
    return metadata.needsArbitration;
  }).length;

  // User-specific counts if userId provided
  let userReadCount = 0;
  let userFirstReadCount = 0;
  let userSecondReadCount = 0;
  let userReadableCount = 0;
  let userFirstReadableCount = 0;
  let userSecondReadableCount = 0;

  if (currentUserId) {
    // Events this user has read
    userReadCount = events.filter(event => userHasReadEvent(event, currentUserId)).length;

    // Count first/second reads by this user
    events.forEach(event => {
      const metadata = getReadingMetadata(event);
      const reads = event.imageReading?.reads ? Object.values(event.imageReading.reads) : [];

      // Find reads by this user
      const userReads = reads.filter(read => read.readerId === currentUserId);

      // Count based on read position (first or second)
      if (userReads.length > 0) {
        // Check if this user did the first read
        if (reads[0]?.readerId === currentUserId) {
          userFirstReadCount++;
        }

        // Check if this user did the second read
        if (reads.length > 1 && reads[1]?.readerId === currentUserId) {
          userSecondReadCount++;
        }
      }
    });

    // Events this user can read
    userReadableCount = events.filter(event => canUserReadEvent(event, currentUserId)).length;

    // Events needing first read that this user can read
    userFirstReadableCount = filterEventsByNeedsFirstRead(events)
      .filter(event => canUserReadEvent(event, currentUserId)).length;

    // Events needing second read that this user can read
    userSecondReadableCount = filterEventsByNeedsSecondRead(events)
      .filter(event => canUserReadEvent(event, currentUserId)).length;
  }

  // Determine detailed status based on read counts
  let status;

  if (firstReadCount === 0) {
    status = 'not_started';
  } else if (firstReadCount < events.length) {
    if (secondReadCount > 0) {
      status = 'mixed_reads';
    } else {
      status = 'partial_first_read';
    }
  } else if (secondReadCount === 0) {
    status = 'first_read_complete';
  } else if (secondReadCount < events.length) {
    status = 'partial_second_read';
  } else {
    status = 'complete';
  }

  return {
    total: events.length,
    firstReadCount,
    firstReadRemaining: events.length - firstReadCount,
    secondReadCount,
    secondReadRemaining: events.length - secondReadCount,
    secondReadReady, // Events ready for immediate second read
    arbitrationCount,
    status,
    statusColor: getStatusTagColour(status),
    daysSinceScreening: events[0] ?
      dayjs().startOf('day').diff(dayjs(events[0].timing.startTime).startOf('day'), 'days') : 0,
    // User-specific counts
    userReadCount,
    userFirstReadCount,
    userSecondReadCount,
    userReadableCount,
    userFirstReadableCount,
    userSecondReadableCount,
    userCanRead: userReadableCount > 0
  };
};

/************************************************************************
// Clinic stuff
//***********************************************************************

/**
 * Get first clinic available for reading
 */
const getFirstAvailableClinic = (data) => {
  const clinics = getReadingClinics(data)
  return clinics.find(clinic => clinic.readingStatus.remaining > 0) || null
}

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
      const events = getReadableEventsForClinic(data, clinic.id)

      return {
        ...clinic,
        unit,
        location,
        readingStatus: getReadingStatusForEvents(events, data.currentUser.id),
      }
    })
    .sort((a, b) => new Date(a.id) - new Date(b.id)) // Some clinics share the same date so sort first by a unique ID to keep consistent sort
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

/**
 * Get readable events for a clinic with read status
 * TODO: should this be deleted?
 */
const getReadableEventsForClinic = (data, clinicId) => {
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

/************************************************************************
// Filters
//***********************************************************************


/**
 * Filter events that are eligible for reading
 * @param {Array} events - All events
 * @returns {Array} Events eligible for reading
 */
const filterEventsByEligibleForReading = (events) => {
  return events.filter(event => eligibleForReading(event));
};

/**
 * Filter events that need any read (first or second)
 * @param {Array} events - Events to filter
 * @param {number} maxReadsPerEvent - Number of reads required to be complete (default: 2)
 * @returns {Array} Events needing any read
 */
const filterEventsByNeedsAnyRead = (events, maxReadsPerEvent = 2) => {
  return events.filter(event => {
    const metadata = getReadingMetadata(event);
    return metadata.uniqueReaderCount < maxReadsPerEvent;
  });
};

/**
 * Filter events that need a first read
 * @param {Array} events - Events to filter
 * @returns {Array} Events needing first read
 */
const filterEventsByNeedsFirstRead = (events) => {
  return events.filter(event => needsFirstRead(event));
};

/**
 * Filter events that need a second read
 * @param {Array} events - Events to filter
 * @returns {Array} Events needing second read
 */
const filterEventsByNeedsSecondRead = (events) => {
  return events.filter(event => needsSecondRead(event));
};

/**
 * Filter events that are fully read (have all required reads)
 * @param {Array} events - Events to filter
 * @param {number} requiredReads - Number of required reads (default: 2)
 * @returns {Array} Fully read events
 */
const filterEventsByFullyRead = (events, requiredReads = 2) => {
  return events.filter(event => {
    const metadata = getReadingMetadata(event);
    return metadata.uniqueReaderCount >= requiredReads;
  });
};

/**
 * Filter events that a specific user can read
 * @param {Array} events - Events to filter
 * @param {string} userId - User ID
 * @returns {Array} Events user can read
 */
const filterEventsByUserCanRead = (events, userId) => {
  return events.filter(event => canUserReadEvent(event, userId));
};


/**
 * Filter events that user can read or has already read
 * @param {Array} events - Array of events to filter
 * @param {string} userId - User ID to check
 * @param {Object} options - Options for determining eligibility
 * @returns {Array} Events user can read or has read
 *
 * Priarily to support navigating backwards through events
 */
const filterEventsByUserCanReadOrHasRead = (events, userId, options = {}) => {
  const {
    maxReadsPerEvent = 2
  } = options;

  return events.filter(event => {
    const metadata = getReadingMetadata(event);

    // Include if user has already read this event
    if (userHasReadEvent(event, userId)) {
      return true;
    }

    // Include if event isn't fully read and user can read it
    if (metadata.uniqueReaderCount < maxReadsPerEvent) {
      return true;
    }

    // Exclude events that are fully read by other users
    return false;
  });
};

/**
 * Filter events for a specific clinic
 * @param {Array} events - All events
 * @param {string} clinicId - Clinic ID
 * @returns {Array} Events for the clinic
 */
const filterEventsByClinic = (events, clinicId) => {
  return events.filter(event => event.clinicId === clinicId);
};

/************************************************************************
// Selector functions
//***********************************************************************

/**
 * Get the first event from an array
 * @param {Array} events - Array of events
 * @returns {Object|null} First event or null
 */
const getFirstEvent = (events) => {
  return events.length > 0 ? events[0] : null;
};

/**
 * Get the next event after a specific event
 * @param {Array} events - Array of events
 * @param {string} currentEventId - Current event ID
 * @param {boolean} wrap - Whether to wrap around to start if at end
 * @returns {Object|null} Next event or null
 */
const getNextEvent = (events, currentEventId, wrap = true) => {
  const currentIndex = events.findIndex(e => e.id === currentEventId);
  if (currentIndex === -1) return null;

  // Next event exists
  if (currentIndex < events.length - 1) {
    return events[currentIndex + 1];
  }

  // Wrap around to first event
  return wrap && events.length > 0 ? events[0] : null;
};

/**
 * Get the previous event before a specific event
 * @param {Array} events - Array of events
 * @param {string} currentEventId - Current event ID
 * @param {boolean} wrap - Whether to wrap around to end if at start
 * @returns {Object|null} Previous event or null
 */
const getPreviousEvent = (events, currentEventId, wrap = true) => {
  const currentIndex = events.findIndex(e => e.id === currentEventId);
  if (currentIndex === -1) return null;

  // Previous event exists
  if (currentIndex > 0) {
    return events[currentIndex - 1];
  }

  // Wrap around to last event
  return wrap && events.length > 0 ? events[events.length - 1] : null;
}

/************************************************************************
/ User functions
/***********************************************************************/

// Get read for a specific user
const getReadForUser = (event, userId = null) => {
  const currentUserId = userId || this?.ctx?.data?.currentUser?.id
  return event.imageReading?.reads?.[currentUserId] || null;
};

/**
 * Get first event from an array that a user can read
 * @param {Array} events - Array of events to search
 * @param {string} userId - User ID to check for
 * @param {Object} options - Additional options for eligibility
 * @returns {Object|null} First event user can read or null if none
 */
const getFirstUserReadableEvent = (events, userId = null) => {
  // Get user ID from context if not provided and we're in a template context
  const currentUserId = userId || (this?.ctx?.data?.currentUser?.id)

  const readableEvents = filterEventsByUserCanRead(events, currentUserId)
  return readableEvents.length > 0 ? readableEvents[0] : null;
};

/************************************************************************
// Booleans
//***********************************************************************

/**
 * Check if a user has already read an event
 * @param {Object} event - The event to check
 * @param {string} userId - User ID to check
 * @returns {boolean} Whether the user has read this event
 */
const userHasReadEvent = (event, userId) => {
  return !!getReadForUser(event, userId);
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
    maxReadsPerEvent = 2 // Default max reads per event
  } = options;

  const metadata = getReadingMetadata(event);

  // If we already have enough unique readers, no more reads needed
  if (metadata.uniqueReaderCount >= maxReadsPerEvent) {
    return false;
  }

  // User can't read if they've already read it
  if (userHasReadEvent(event, userId)) {
    return false;
  }

  // User can read if we haven't reached max readers and they haven't already read it
  return true;
};

/**
 * Check if an event has any reads
 * @param {Object} event - The event to check
 * @returns {boolean} Whether the event has any reads
 */
const hasReads = (event) => {
  return event.imageReading?.reads && Object.keys(event.imageReading.reads).length > 0;
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

module.exports = {

  // getFirstUnreadEvent,
  // getFirstUnreadEventOverall,

  // Single event
  getReadingMetadata,
  writeReading,

  // Multiple events
  getReadingProgress,
  getReadingStatusForEvents,

  // Clinic stuff
  getFirstAvailableClinic,
  getReadingClinics,
  getReadableEventsForClinic,

  // Filters
  filterEventsByEligibleForReading,
  filterEventsByNeedsAnyRead,
  filterEventsByNeedsFirstRead,
  filterEventsByNeedsSecondRead,
  filterEventsByFullyRead,
  filterEventsByUserCanRead,
  filterEventsByUserCanReadOrHasRead,
  filterEventsByClinic,
  // Selector functions
  getFirstEvent,
  getNextEvent,
  getPreviousEvent,
  // User functions
  getReadForUser,
  getFirstUserReadableEvent,
  // Booleans
  userHasReadEvent,
  canUserReadEvent,
  hasReads,
  needsArbitration,
  needsFirstRead,
  needsSecondRead,
}