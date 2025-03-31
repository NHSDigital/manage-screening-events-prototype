// app/lib/generators/reading-generator.js

const dayjs = require('dayjs')
const weighted = require('weighted')
const { eligibleForReading } = require('../utils/status')

/**
 * Generate sample image reading data to simulate first and second reads
 * @param {Array} events - Array of screening events
 * @param {Array} users - Array of system users
 * @returns {Array} Updated events with reading data
 */
const generateReadingData = (events, users) => {
  if (!events || !events.length || !users || users.length < 2) {
    console.log('No events or not enough users to generate reading data')
    return events
  }

  // Use the first and second users as our readers
  const firstReader = users[0]
  const secondReader = users[1]

  console.log(`Generating reading data using ${firstReader.firstName} ${firstReader.lastName} and ${secondReader.firstName} ${secondReader.lastName} as readers`)

  // Get completed screening events from the last 30 days
  const cutoffDate = dayjs().subtract(30, 'days').startOf('day')
  const recentEvents = events.filter(event =>
    eligibleForReading(event) &&
    dayjs(event.timing.startTime).isAfter(cutoffDate)
  )

  // Sort by date (oldest first)
  const sortedEvents = [...recentEvents].sort((a, b) =>
    new Date(a.timing.startTime) - new Date(b.timing.startTime)
  )

  if (sortedEvents.length === 0) {
    console.log('No recent completed events to add reading data to')
    return events
  }

  // Group events by clinic
  const eventsByClinic = {}
  sortedEvents.forEach(event => {
    if (!eventsByClinic[event.clinicId]) {
      eventsByClinic[event.clinicId] = []
    }
    eventsByClinic[event.clinicId].push(event)
  })

  // Get clinics sorted by date (oldest first)
  const clinics = Object.keys(eventsByClinic)
    .map(clinicId => ({
      id: clinicId,
      events: eventsByClinic[clinicId],
      date: eventsByClinic[clinicId][0].timing.startTime
    }))
    .sort((a, b) => new Date(a.id) - new Date(b.id)) // Some clinics share the same date so sort first by a unique ID to keep consistent sort
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  console.log(`Found ${clinics.length} clinics with completed events in the last 30 days`)

  // Define read results with appropriate weights
  const readResults = {
    normal: 0.7,          // 70% normal
    technical_recall: 0.1, // 10% technical recall
    recall_for_assessment: 0.2  // 20% recall for assessment
  }

  // Clone the events array to avoid modifying the original
  const updatedEvents = [...events]

  // Track which events are updated for efficient lookup later
  const updatedEventIds = new Set()

  // TWO OLDEST CLINICS: Complete first and second reads
  if (clinics.length >= 2) {
    let count = 0
    for (let i = 0; i < 2 && i < clinics.length; i++) {
      const clinic = clinics[i]
      console.log(`Adding complete first and second reads to clinic ${clinic.id}`)

      clinic.events.forEach(event => {
        // Find the event in our array
        const eventIndex = updatedEvents.findIndex(e => e.id === event.id)
        if (eventIndex === -1) return

        // Ensure the imageReading structure exists
        if (!updatedEvents[eventIndex].imageReading) {
          updatedEvents[eventIndex].imageReading = { reads: {} }
        }

        // First read (by second user)
        const firstResult = weighted.select(readResults)
        const firstReadTime = dayjs(event.timing.startTime)
          .add(Math.floor(Math.random() * 2) + 1, 'days')
          .toISOString()

        updatedEvents[eventIndex].imageReading.reads[secondReader.id] = {
          result: firstResult,
          readerId: secondReader.id,
          readerType: secondReader.role,
          timestamp: firstReadTime
        }

        // Second read (by first user) - 80% chance of agreement
        let secondResult = firstResult
        if (Math.random() > 0.8) {
          // Different result for disagreement
          const otherResults = Object.keys(readResults).filter(r => r !== firstResult)
          secondResult = otherResults[Math.floor(Math.random() * otherResults.length)]
        }

        const secondReadTime = dayjs(firstReadTime)
          .add(Math.floor(Math.random() * 3) + 1, 'days')
          .toISOString()

        updatedEvents[eventIndex].imageReading.reads[firstReader.id] = {
          result: secondResult,
          readerId: firstReader.id,
          readerType: firstReader.role,
          timestamp: secondReadTime
        }

        updatedEventIds.add(event.id)
        count++
      })
    }
    console.log(`Added first and second reads to ${count} events in the 2 oldest clinics`)
  }

  // NEXT TWO OLDEST CLINICS: Complete first reads only
  if (clinics.length >= 6) {
    let count = 0
    for (let i = 2; i < 6 && i < clinics.length; i++) {
      const clinic = clinics[i]
      console.log(`Adding complete first reads to clinic ${clinic.id}`)

      clinic.events.forEach(event => {
        // Skip if already updated
        if (updatedEventIds.has(event.id)) return

        // Find the event in our array
        const eventIndex = updatedEvents.findIndex(e => e.id === event.id)
        if (eventIndex === -1) return

        // Ensure the imageReading structure exists
        if (!updatedEvents[eventIndex].imageReading) {
          updatedEvents[eventIndex].imageReading = { reads: {} }
        }

        // First read (by second user)
        const firstResult = weighted.select(readResults)
        const firstReadTime = dayjs(event.timing.startTime)
          .add(Math.floor(Math.random() * 2) + 1, 'days')
          .toISOString()

        updatedEvents[eventIndex].imageReading.reads[secondReader.id] = {
          result: firstResult,
          readerId: secondReader.id,
          readerType: secondReader.role,
          timestamp: firstReadTime
        }

        updatedEventIds.add(event.id)
        count++
      })
    }
    console.log(`Added first reads to ${count} events in the next 2 clinics`)
  }

  // NEXT TWO OLDEST CLINICS: 75% first read
  if (clinics.length >= 8) {
    let count = 0
    for (let i = 6; i < 8 && i < clinics.length; i++) {
      const clinic = clinics[i]
      console.log(`Adding partial first reads to clinic ${clinic.id}`)

      // Only read 50% of events in these clinics
      const eventsToRead = clinic.events
        .filter(event => !updatedEventIds.has(event.id))
        .slice(0, Math.ceil(clinic.events.length / 4)) // Take first 75%

      eventsToRead.forEach(event => {
        // Find the event in our array
        const eventIndex = updatedEvents.findIndex(e => e.id === event.id)
        if (eventIndex === -1) return

        // Ensure the imageReading structure exists
        if (!updatedEvents[eventIndex].imageReading) {
          updatedEvents[eventIndex].imageReading = { reads: {} }
        }

        // First read (by second user)
        const firstResult = weighted.select(readResults)
        const firstReadTime = dayjs(event.timing.startTime)
          .add(Math.floor(Math.random() * 2) + 1, 'days')
          .toISOString()

        updatedEvents[eventIndex].imageReading.reads[secondReader.id] = {
          result: firstResult,
          readerId: secondReader.id,
          readerType: secondReader.role,
          timestamp: firstReadTime
        }

        updatedEventIds.add(event.id)
        count++
      })
    }
    console.log(`Added partial first reads to ${count} events in the next 2 clinics`)
  }

  console.log(`Total events with reading data: ${updatedEventIds.size}`)
  return updatedEvents
}

module.exports = {
  generateReadingData
}