// app/routes/image-reading.js
const { getEventData } = require('../lib/utils/event-data')
const {
  getFirstUserReadableEvent,
  getReadableEventsForClinic,
  getReadingStatusForEvents,
  getReadingClinics,
  getReadingProgress,
  hasReads,
  canUserReadEvent,
  writeReading,
  createReadingBatch,
  getFirstReadableEventInBatch,
  getReadingBatch,
  getOrCreateClinicBatch,
  getBatchReadingProgress,
  skipEventInBatch,
  getReadingMetadata,
} = require('../lib/utils/reading')
const { snakeCase } = require('../lib/utils/strings')
const dayjs = require('dayjs')

module.exports = router => {
  // Set nav state
  router.use('/reading', (req, res, next) => {
    res.locals.navActive = 'reading'
    next()
  })

 // Route for showing all clinics available for reading
  router.get('/reading', (req, res) => {
    const clinics = getReadingClinics(req.session.data)
    // let clinics = []
    res.render('reading/index', { clinics })
  })

  // Reading routes middleware
  // router.use('/reading/clinics/:clinicId/events/:eventId', (req, res, next) => {
  //   const data = req.session.data
  //   const { clinicId, eventId } = req.params
  //   const eventData = getEventData(data, clinicId, eventId)
  //   const currentUserId = data.currentUser.id

  //   if (!eventData) {
  //     return res.redirect('/reading/clinics/' + req.params.clinicId)
  //   }

  //   const event = eventData.event

  //   // Initialize reading session data if not exists
  //   data.readingSession = data.readingSession || {
  //     clinicId: req.params.clinicId,
  //     skippedEvents: []
  //   }

  //   // Reset if we've switched clinics
  //   if (data.readingSession.clinicId !== req.params.clinicId) {
  //     data.readingSession = {
  //       clinicId: req.params.clinicId,
  //       skippedEvents: []
  //     }
  //   }


  //   // Manage skipped events
  //   const skippedEventId = req.query.skipped
  //   if (skippedEventId) {
  //     console.log('has skipped event', skippedEventId)
  //   }
  //   delete data.skipped
  //   if (skippedEventId &&
  //     !data.readingSession.skippedEvents.includes(skippedEventId) &&
  //     canUserReadEvent(data.events.find(e => e.id === skippedEventId), currentUserId))
  //     {
  //       console.log('Adding to skipped events', skippedEventId)
  //       data.readingSession.skippedEvents.push(skippedEventId)
  //       console.log('Skipped events:', data.readingSession)
  //     }

  //   // Remove any events from skipped list that have now been read
  //   data.readingSession.skippedEvents =
  //     data.readingSession.skippedEvents.filter(skippedId => {
  //       const event = data.events.find(e => e.id === skippedId)
  //       return canUserReadEvent(event, currentUserId)
  //     })

  //   console.log('Skipped events:', data.readingSession)

  //   const events = getReadableEventsForClinic(data, clinicId)

  //   // Enhanced progress that includes user-specific navigation
  //   const progress = getReadingProgress(
  //     events,
  //     eventId,
  //     data.readingSession?.skippedEvents || [],
  //     currentUserId
  //   )

  //   res.locals.location = eventData.location
  //   res.locals.eventData = eventData
  //   res.locals.clinic = eventData.clinic
  //   res.locals.event = eventData.event
  //   res.locals.participant = eventData.participant
  //   res.locals.unit = eventData.unit
  //   res.locals.clinicId = req.params.clinicId
  //   res.locals.eventId = req.params.eventId
  //   res.locals.progress = progress

  //   next()
  // })

  // List participants needing reading
  // Reading list for a specific clinic
  // Show clinic reading status
  // router.get('/reading/clinics/:clinicId', (req, res) => {
  //   const { clinicId } = req.params
  //   const data = req.session.data
  //   const currentUserId = data.currentUser.id
  //   const clinic = data.clinics.find(c => c.id === clinicId)

  //   if (!clinic) return res.redirect('/reading')

  //   const events = getReadableEventsForClinic(data, clinicId)
  //   const readingStatus = getReadingStatusForEvents(events, currentUserId)

  //   // Find first event this user can read
  //   const firstUserReadableEvent = getFirstUserReadableEvent(events, currentUserId);

  //   res.render('reading/list', {
  //     clinic,
  //     events,
  //     clinicId: clinic.id,
  //     readingStatus,
  //     completedCount: events.filter(e => hasReads(e)).length,
  //     firstUserReadableEvent: firstUserReadableEvent
  //   })
  // })
  router.get('/reading/clinics/:clinicId', (req, res) => {
    const { clinicId } = req.params
    const data = req.session.data
    const clinic = data.clinics.find(c => c.id === clinicId)

    if (!clinic) return res.redirect('/reading')

    try {
      // Convert clinic to batch
      const batch = getOrCreateClinicBatch(data, clinicId)

      // Redirect to the batch view
      res.redirect(`/reading/batch/${batch.id}`)
    } catch (error) {
      console.log('Could not load clinic for reading')
      res.redirect('/reading')
    }
  })

  router.get('/reading/clinics/:clinicId/start', (req, res) => {
    const { clinicId } = req.params
    const data = req.session.data
    const currentUserId = data.currentUser.id

    const clinic = data.clinics.find(c => c.id === clinicId)
    if (!clinic) return res.redirect('/reading')

    try {
      // Convert clinic to batch
      const batch = getOrCreateClinicBatch(data, clinicId)

      // Find first readable event in the batch
      const firstReadableEvent = getFirstReadableEventInBatch(data, batch.id, currentUserId)

      if (firstReadableEvent) {
        // Redirect directly to the first readable event
        res.redirect(`/reading/batch/${batch.id}/events/${firstReadableEvent.id}`)
      } else {
        // No readable events, go to batch overview
        res.redirect(`/reading/batch/${batch.id}`)
      }
    } catch (error) {
      console.log('Could not start reading clinic')
      res.redirect('/reading')
    }
  })

  // // Initial path for reading a participant - redirect to start page / do setup
  // router.get('/reading/clinics/:clinicId/events/:eventId', (req, res) => {
  //   const data = req.session.data

  //   // Delete temporary data from previous steps
  //   console.log("Deleting temporary data");
  //   delete data.imageReadingTemp

  //   res.redirect(`/reading/clinics/${req.params.clinicId}/events/${req.params.eventId}/medical-information`)
  // })

  // // Additional route handlers for each step
  // router.get('/reading/clinics/:clinicId/events/:eventId/:step', (req, res, next) => {
  //   const { clinicId, eventId, step } = req.params
  //   const validSteps = ['assessment', 'normal-details', 'participant-details', 'medical-information', 'images', 'confirm-normal', 'recall-reason', 'recall-for-assessment-details', 'annotation', 'awaiting-annotations', 'confirm-abnormal', 'recommended-assessment']

  //   if (!validSteps.includes(step)) {
  //     return next()
  //     // return res.redirect(`/clinics/${clinicId}/reading/${eventId}/result`)
  //   }

  //   const eventData = getEventData(req.session.data, clinicId, eventId)
  //   if (!eventData) return res.redirect(`/reading/clinics/${clinicId}`)

  //   res.render(`reading/${step}`)
  // })

  // // Change in reading.js
  // router.post('/reading/clinics/:clinicId/events/:eventId/assessment-answer', (req, res) => {
  //   const { clinicId, eventId } = req.params
  //   const { result } = req.body
  //   const data = req.session.data

  //   const event = data.events.find(e => e.id === eventId)
  //   if (!event) return res.redirect(`/reading/clinics/${clinicId}`)

  //   // Check if current event has symptoms that need acknowledging
  //   // const hasSymptoms = event?.currentSymptoms?.length > 0

  //   const currentUserId = data.currentUser.id
  //   const existingResult = event?.imageReading?.reads?.[currentUserId]?.result
  //   const updatedResult = data.imageReadingTemp?.updatedResult

  //   // const existingResult = event.reads?.[0]?.result
  //   console.log({existingResult});
  //   console.log({updatedResult});

  //   if (existingResult) {
  //     // No change made, so go to next person
  //     if (existingResult === updatedResult) {
  //       console.log("Existing result is the same")
  //       const events = getReadableEventsForClinic(data, clinicId)
  //       const progress = getReadingProgress(events, eventId)

  //       // Redirect to next participant if available
  //       if (progress.hasNextUserReadable) {
  //         return res.redirect(`/reading/clinics/${clinicId}/events/${progress.nextUserReadableId}`)
  //       } else {
  //         return res.redirect(`/reading/clinics/${clinicId}`)
  //       }
  //     }
  //   }

  //   // Handle different result types
  //   switch (result || updatedResult) {
  //     case 'normal':
  //       if (data.settings.reading.confirmNormal === 'true') {
  //         return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}/confirm-normal`)
  //       }
  //       else {
  //         return res.redirect(307, `/reading/clinics/${clinicId}/events/${eventId}/result-normal`)
  //       }
  //     case 'technical_recall':
  //       return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}/recall-reason`)
  //     case 'recall_for_assessment':
  //       return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}/recall-for-assessment-details`)
  //     default:
  //       return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}`)
  //   }
  // })


  // // Generic result recording route
  // router.post('/reading/clinics/:clinicId/events/:eventId/result-:resultType', (req, res) => {
  //   const { clinicId, eventId, resultType } = req.params
  //   const { reason, annotations } = req.body
  //   const data = req.session.data
  //   const currentUserId = data.currentUser.id
  //   const formData = data.imageReadingTemp
  //   delete data.imageReadingTemp

  //   // Find the event
  //   const event = data.events.find(e => e.id === eventId)
  //   if (!event) {
  //     return res.redirect(`/reading/clinics/${clinicId}`)
  //   }

  //   // Create base reading result
  //   const readResult = {
  //     result: snakeCase(resultType),
  //     readerId: currentUserId,
  //     readerType: data.currentUser.role,
  //     ...formData,
  //     timestamp: new Date().toISOString(),
  //   }

  //   // Write reading using the new function
  //   writeReading(event, currentUserId, readResult)

  //   // Get updated events and find next one for current user
  //   const events = getReadableEventsForClinic(data, clinicId)
  //   const currentIndex = events.findIndex(e => e.id === eventId)

  //   // Use enhanced progress tracking for navigation
  //   const progress = getReadingProgress(events, eventId, [], currentUserId)

  //   // Redirect based on availability of user-readable events
  //   if (progress.hasNextUserReadable) {
  //     res.redirect(`/reading/clinics/${clinicId}/events/${progress.nextUserReadableId}`)
  //   } else {
  //     res.redirect(`/reading/clinics/${clinicId}`)
  //   }
  // })

  /************************************************************************
  // Batches
  /***********************************************************************/

  router.get('/reading/create-batch', (req, res) => {
    const data = req.session.data
    const currentUserId = data.currentUser.id

    // Get batch creation options from query params
    const { type, clinicId, limit, name } = req.query

    // Create filters from query params
    const filters = {}
    // Handle filters as an array or single value
    const queryFilters = [].concat(req.query.filters || [])

    if (queryFilters.includes('hasSymptoms')) {
      filters.hasSymptoms = true
    }

    if (queryFilters.includes('includeAwaitingPriors')) {
      filters.includeAwaitingPriors = true
    }

    // Create the batch
    try {
      const batch = createReadingBatch(data, {
        type: type || 'custom',
        name,
        clinicId,
        limit: limit ? parseInt(limit) : 50,
        filters
      })

      // Redirect to batch view or first event if available
      const firstReadableEvent = getFirstReadableEventInBatch(data, batch.id, currentUserId)

      if (firstReadableEvent) {
        res.redirect(`/reading/batch/${batch.id}/events/${firstReadableEvent.id}`)
      } else {
        res.redirect(`/reading/batch/${batch.id}`)
      }
    } catch (error) {

      console.log('Error creating batch', error)
      res.redirect('/reading')
    }
  })

  // Route for viewing a batch
  router.get('/reading/batch/:batchId', (req, res) => {
    const data = req.session.data
    const { batchId } = req.params

    // Get the batch
    const batch = getReadingBatch(data, batchId)
    if (!batch) {
      // req.flash('error', 'Batch not found')
      return res.redirect('/reading')
    }

    // Get enhanced events with reading metadata
    const enhancedEvents = batch.eventIds
      .map(eventId => data.events.find(e => e.id === eventId))
      .filter(Boolean)
      .map(event => {
        // Add participant data and reading metadata
        const participant = data.participants.find(p => p.id === event.participantId)
        const metadata = getReadingMetadata(event)

        return {
          ...event,
          participant,
          readingMetadata: metadata
        }
      })

    // Get reading status for the batch
    const readingStatus = getReadingStatusForEvents(enhancedEvents, data.currentUser.id)

    // Find first event user can read
    const firstUserReadableEvent = getFirstUserReadableEvent(enhancedEvents, data.currentUser.id)

    // Get clinic data if this is a clinic batch
    let clinic = null
    if (batch.clinicId) {
      clinic = data.clinics.find(c => c.id === batch.clinicId)
    }

    res.render('reading/batch', {
      batch,
      events: enhancedEvents,
      readingStatus,
      firstUserReadableEvent,
      clinic
    })
  })

  // Add middleware for batch-based events similar to the clinic-based ones
  router.use('/reading/batch/:batchId/events/:eventId', (req, res, next) => {
    const data = req.session.data
    const { batchId, eventId } = req.params

    // Get the batch
    const batch = getReadingBatch(data, batchId)
    if (!batch) {
      req.flash('error', 'Batch not found')
      return res.redirect('/reading')
    }

    // Check if event exists in this batch
    if (!batch.eventIds.includes(eventId)) {
      req.flash('error', 'Event not found in this batch')
      return res.redirect(`/reading/batch/${batchId}`)
    }

    // Get the event data
    const event = data.events.find(e => e.id === eventId)
    if (!event) {
      req.flash('error', 'Event not found')
      return res.redirect(`/reading/batch/${batchId}`)
    }

    // Get participant and clinic data
    const participant = data.participants.find(p => p.id === event.participantId)
    const clinic = data.clinics.find(c => c.id === event.clinicId)
    const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId)
    const location = unit.locations.find(l => l.id === clinic.locationId)

    // Get reading progress for this batch
    const progress = getBatchReadingProgress(data, batchId, eventId)

    // Set up locals for templates
    res.locals.batch = batch
    res.locals.eventData = { clinic, event, participant, unit, location }
    res.locals.clinic = clinic
    res.locals.event = event
    res.locals.participant = participant
    res.locals.unit = unit
    res.locals.location = location
    res.locals.batchId = batchId
    res.locals.eventId = eventId
    res.locals.progress = progress

    next()
  })

  // Route for event reading within a batch
  router.get('/reading/batch/:batchId/events/:eventId', (req, res) => {
    const data = req.session.data

    // Delete temporary data from previous steps
    delete data.imageReadingTemp

    res.redirect(`/reading/batch/${req.params.batchId}/events/${req.params.eventId}/medical-information`)
  })

  // Handle skipping an event in a batch
  router.get('/reading/batch/:batchId/events/:eventId/skip', (req, res) => {
    const data = req.session.data
    const { batchId, eventId } = req.params

    // Mark as skipped
    skipEventInBatch(data, batchId, eventId)

    // Find next readable event
    const progress = getBatchReadingProgress(data, batchId, eventId)

    if (progress.hasNextUserReadable) {
      res.redirect(`/reading/batch/${batchId}/events/${progress.nextUserReadableId}`)
    } else {
      res.redirect(`/reading/batch/${batchId}`)
    }
  })

  // Add routes for each step similar to the clinic-based ones
  router.get('/reading/batch/:batchId/events/:eventId/:step', (req, res, next) => {
    const { batchId, eventId, step } = req.params
    const validSteps = ['assessment', 'normal-details', 'participant-details', 'medical-information', 'images', 'confirm-normal', 'recall-reason', 'recall-for-assessment-details', 'annotation', 'awaiting-annotations', 'confirm-abnormal', 'recommended-assessment']

    if (!validSteps.includes(step)) {
      return next()
    }

    res.render(`reading/${step}`)
  })

  // Handle recording a reading result
  router.post('/reading/batch/:batchId/events/:eventId/result-:resultType', (req, res) => {
    const { batchId, eventId, resultType } = req.params
    const data = req.session.data
    const currentUserId = data.currentUser.id
    const formData = data.imageReadingTemp
    delete data.imageReadingTemp

    // Find the event
    const event = data.events.find(e => e.id === eventId)
    if (!event) {
      return res.redirect(`/reading/batch/${batchId}`)
    }

    // Create and save the reading result
    const readResult = {
      result: snakeCase(resultType),
      readerId: currentUserId,
      readerType: data.currentUser.role,
      ...formData,
      timestamp: new Date().toISOString(),
    }

    // Write the reading (passing batch context to handle skipped events)
    writeReading(event, currentUserId, readResult, data, batchId)

    // Get progress to find next event
    const progress = getBatchReadingProgress(data, batchId, eventId)

    // Redirect to next event or batch view
    if (progress.hasNextUserReadable) {
      res.redirect(`/reading/batch/${batchId}/events/${progress.nextUserReadableId}`)
    } else {
      res.redirect(`/reading/batch/${batchId}`)
    }
  })

  // Handle reading assessment submissions within a batch
  router.post('/reading/batch/:batchId/events/:eventId/assessment-answer', (req, res) => {
    const { batchId, eventId } = req.params
    const { result } = req.body
    const data = req.session.data

    const event = data.events.find(e => e.id === eventId)
    if (!event) return res.redirect(`/reading/batch/${batchId}`)

    const currentUserId = data.currentUser.id
    const existingResult = event?.imageReading?.reads?.[currentUserId]?.result
    const updatedResult = data.imageReadingTemp?.updatedResult

    // No change made, so go to next person in batch
    if (existingResult && existingResult === updatedResult) {
      const progress = getBatchReadingProgress(data, batchId, eventId)

      // Redirect to next participant if available
      if (progress.hasNextUserReadable) {
        return res.redirect(`/reading/batch/${batchId}/events/${progress.nextUserReadableId}`)
      } else {
        return res.redirect(`/reading/batch/${batchId}`)
      }
    }

    // Handle different result types
    switch (result || updatedResult) {
      case 'normal':
        if (data.settings.reading.confirmNormal === 'true') {
          return res.redirect(`/reading/batch/${batchId}/events/${eventId}/confirm-normal`)
        } else {
          return res.redirect(307, `/reading/batch/${batchId}/events/${eventId}/result-normal`)
        }
      case 'technical_recall':
        return res.redirect(`/reading/batch/${batchId}/events/${eventId}/recall-reason`)
      case 'recall_for_assessment':
        return res.redirect(`/reading/batch/${batchId}/events/${eventId}/recall-for-assessment-details`)
      default:
        return res.redirect(`/reading/batch/${batchId}/events/${eventId}`)
    }
  })

  // Default route for reading history - redirect to all view
  router.get('/reading/history', (req, res) => {
    res.redirect('/reading/history/all')
  })

  // Route for viewing reading history with view parameter
  router.get('/reading/history/:view', (req, res) => {
    const data = req.session.data
    const currentUserId = data.currentUser.id
    const view = req.params.view || 'all'

    // Get all recent readings across all events - last 30 days
    const thirtyDaysAgo = dayjs().subtract(30, 'days').toISOString()

    // Collect all readings from events
    const allReadings = []

    data.events.forEach(event => {
      if (!event.imageReading?.reads) return

      const eventReadings = Object.entries(event.imageReading.reads).map(([readerId, reading]) => {
        // Determine if this is a first or second read
        const readingsForEvent = Object.values(event.imageReading.reads)
        const sortedReadings = [...readingsForEvent].sort((a, b) =>
          new Date(a.timestamp) - new Date(b.timestamp)
        )

        const readOrder = sortedReadings.findIndex(r => r.readerId === readerId)

        const readType = readOrder === 0 ? 'first' :
                        readOrder === 1 ? 'second' :
                        'arbitration'

        // Get participant info
        const participant = data.participants.find(p => p.id === event.participantId)

        // Get batch ID if available
        let batchId = null
        if (data.readingSessionBatches) {
          for (const [id, batch] of Object.entries(data.readingSessionBatches)) {
            if (batch.eventIds.includes(event.id)) {
              batchId = id
              break
            }
          }
        }

        return {
          eventId: event.id,
          clinicId: event.clinicId,
          batchId,
          readerId: reading.readerId,
          readType,
          result: reading.result,
          timestamp: reading.timestamp,
          participant
        }
      })

      allReadings.push(...eventReadings)
    })

    // Filter for recent readings
    const recentReadings = allReadings
      .filter(reading => reading.timestamp > thirtyDaysAgo)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    // Determine which readings to display based on view
    let readings = []
    if (view === 'mine') {
      readings = recentReadings.filter(reading => reading.readerId === currentUserId)
    } else {
      readings = recentReadings
    }

    res.render('reading/history', {
      readings,
      view
    })
  })

}