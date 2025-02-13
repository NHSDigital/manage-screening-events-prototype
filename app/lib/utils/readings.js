// app/lib/utils/readings.js
const getReadingProgress = (clinic, events, currentEventId, skippedEvents = []) => {
  const readableEvents = events.filter(event =>
    event.clinicId === clinic.id &&
    ['event_complete', 'event_partially_screened'].includes(event.status)
  )
  .sort((a, b) => new Date(a.timing.startTime) - new Date(b.timing.startTime))

  const currentIndex = readableEvents.findIndex(e => e.id === currentEventId)

  // Sequential navigation (pure next/previous)
  const nextEventId = currentIndex < readableEvents.length - 1
    ? readableEvents[currentIndex + 1].id
    : null

  const previousEventId = currentIndex > 0
    ? readableEvents[currentIndex - 1].id
    : null

  // Find next unread event, wrapping around to start if needed
  let nextUnreadId = null
  // First look after current position
  for (let i = currentIndex + 1; i < readableEvents.length; i++) {
    if (!readableEvents[i].reads?.length) {
      nextUnreadId = readableEvents[i].id
      break
    }
  }
  // If none found after current position, look from start
  if (!nextUnreadId) {
    for (let i = 0; i < currentIndex; i++) {
      if (!readableEvents[i].reads?.length) {
        nextUnreadId = readableEvents[i].id
        break
      }
    }
  }

  // Find previous unread event, wrapping around to end if needed
  let previousUnreadId = null
  // First look before current position
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (!readableEvents[i].reads?.length) {
      previousUnreadId = readableEvents[i].id
      break
    }
  }
  // If none found before current position, look from end
  if (!previousUnreadId) {
    for (let i = readableEvents.length - 1; i > currentIndex; i--) {
      if (!readableEvents[i].reads?.length) {
        previousUnreadId = readableEvents[i].id
        break
      }
    }
  }

  return {
    current: currentIndex + 1,
    total: readableEvents.length,
    completed: readableEvents.filter(e => e.reads?.length > 0).length,
    // Sequential navigation
    hasNext: !!nextEventId,
    hasPrevious: !!previousEventId,
    nextEventId,
    previousEventId,
    // Unread navigation
    hasNextUnread: !!nextUnreadId,
    hasPreviousUnread: !!previousUnreadId,
    nextUnreadId,
    previousUnreadId,
    skippedCount: skippedEvents.length,
    skippedEvents,
    // Could add these if we want to show in UI
    isCurrentSkipped: skippedEvents.includes(currentEventId),
    nextEventSkipped: nextEventId ? skippedEvents.includes(nextEventId) : false,
    previousEventSkipped: previousEventId ? skippedEvents.includes(previousEventId) : false
  }
}

module.exports = {
  getReadingProgress
}