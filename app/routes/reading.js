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

  // Default clinics list to "mine"
  router.get('/reading/clinics', (req, res) => {
    res.redirect('/reading/clinics/mine')
  })

  // Define valid views and route them all to a single handler
  const clinicViews = ['/reading/clinics/mine', '/reading/clinics/all']

  router.get(clinicViews, (req, res) => {
    const data = req.session.data

    // Extract view from the URL path
    const view = req.path.split('/').pop()

    // Get all reading clinics
    const clinics = getReadingClinics(data)

    // Filter incomplete clinics
    const incompleteClinics = clinics.filter(clinic =>
      clinic.readingStatus.status !== 'complete'
    )

    // Filter clinics based on view
    let clinicsToDisplay = incompleteClinics

    if (view === 'mine') {
      // Show only clinics where the current user can read something
      clinicsToDisplay = incompleteClinics.filter(clinic =>
        clinic.readingStatus.userReadableCount > 0
      )
    }

    res.render('reading/clinics', {
      clinics,
      incompleteClinics,
      clinicsToDisplay,
      view
    })
  })

  // Look up a clinic and redirect to appropraite batch
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

  // Helper to immediately start reading a batch
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

  /************************************************************************
  // Batches
  /***********************************************************************/

  router.get('/reading/create-batch', (req, res) => {
    const data = req.session.data
    const currentUserId = data.currentUser.id

    // Get batch creation options from query params
    const { type, clinicId, limit, name, redirect } = req.query

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

      // Check if the request includes the redirect parameter
      if (redirect === 'list') {
        // Redirect to batch view instead of starting reading
        res.redirect(`/reading/batch/${batch.id}`)
        return
      }

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
    // Default to "your-reads" view
    res.redirect(`/reading/batch/${req.params.batchId}/your-reads`)
  })

  // Route for viewing a batch with specific view
  router.get('/reading/batch/:batchId/:view', (req, res) => {
    const data = req.session.data
    const { batchId, view } = req.params
    const validViews = ['your-reads', 'all-reads']

    // Validate view parameter
    const selectedView = validViews.includes(view) ? view : 'your-reads'

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
      clinic,
      view: selectedView
    })
  })

  // Middleware to make sure pages have the right data
  router.use('/reading/batch/:batchId/events/:eventId', (req, res, next) => {
    const data = req.session.data
    const { batchId, eventId } = req.params

    // Get the batch
    const batch = getReadingBatch(data, batchId)
    if (!batch) {
      // req.flash('error', 'Batch not found')
      console.log('Batch not found')
      return res.redirect('/reading')
    }

    // Check if event exists in this batch
    if (!batch.eventIds.includes(eventId)) {
      // req.flash('error', 'Event not found in this batch')
      console.log(`Event ${batchId} not found in this batch`)
      return res.redirect(`/reading/batch/${batchId}`)
    }

    // Get the event data
    const event = data.events.find(e => e.id === eventId)
    if (!event) {
      // req.flash('error', 'Event not found')
      console.log(`Event ${eventId} not found`)
      return res.redirect(`/reading/batch/${batchId}`)
    }

    event.readingMetadata = getReadingMetadata(event)

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
  // Todo: should we make deleting happen on an explicit /start route?
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

  // Render appropriate template for reading views
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
    res.redirect('/reading/history/mine')
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