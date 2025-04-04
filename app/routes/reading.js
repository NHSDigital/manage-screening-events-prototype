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
  writeReading
} = require('../lib/utils/reading')
const { snakeCase } = require('../lib/utils/strings')

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
  router.use('/reading/clinics/:clinicId/events/:eventId', (req, res, next) => {
    const data = req.session.data
    const { clinicId, eventId } = req.params
    const eventData = getEventData(data, clinicId, eventId)
    const currentUserId = data.currentUser.id

    if (!eventData) {
      return res.redirect('/reading/clinics/' + req.params.clinicId)
    }

    const event = eventData.event

    // Initialize reading session data if not exists
    data.readingSession = data.readingSession || {
      clinicId: req.params.clinicId,
      skippedEvents: []
    }

    // Reset if we've switched clinics
    if (data.readingSession.clinicId !== req.params.clinicId) {
      data.readingSession = {
        clinicId: req.params.clinicId,
        skippedEvents: []
      }
    }


    // Manage skipped events
    const skippedEventId = req.query.skipped
    if (skippedEventId) {
      console.log('has skipped event', skippedEventId)
    }
    delete data.skipped
    if (skippedEventId &&
      !data.readingSession.skippedEvents.includes(skippedEventId) &&
      canUserReadEvent(data.events.find(e => e.id === skippedEventId), currentUserId))
      {
        console.log('Adding to skipped events', skippedEventId)
        data.readingSession.skippedEvents.push(skippedEventId)
        console.log('Skipped events:', data.readingSession)
      }

    // Remove any events from skipped list that have now been read
    data.readingSession.skippedEvents =
      data.readingSession.skippedEvents.filter(skippedId => {
        const event = data.events.find(e => e.id === skippedId)
        return canUserReadEvent(event, currentUserId)
      })

    console.log('Skipped events:', data.readingSession)

    const events = getReadableEventsForClinic(data, clinicId)

    // Enhanced progress that includes user-specific navigation
    const progress = getReadingProgress(
      events,
      eventId,
      data.readingSession?.skippedEvents || [],
      currentUserId
    )

    res.locals.location = eventData.location
    res.locals.eventData = eventData
    res.locals.clinic = eventData.clinic
    res.locals.event = eventData.event
    res.locals.participant = eventData.participant
    res.locals.unit = eventData.unit
    res.locals.clinicId = req.params.clinicId
    res.locals.eventId = req.params.eventId
    res.locals.progress = progress

    next()
  })

  // List participants needing reading
  // Reading list for a specific clinic
  // Show clinic reading status
  router.get('/reading/clinics/:clinicId', (req, res) => {
    const { clinicId } = req.params
    const data = req.session.data
    const currentUserId = data.currentUser.id
    const clinic = data.clinics.find(c => c.id === clinicId)

    if (!clinic) return res.redirect('/reading')

    const events = getReadableEventsForClinic(data, clinicId)
    const readingStatus = getReadingStatusForEvents(events, currentUserId)

    // Find first event this user can read
    const firstUserReadableEvent = getFirstUserReadableEvent(events, currentUserId);

    res.render('reading/list', {
      clinic,
      events,
      clinicId: clinic.id,
      readingStatus,
      completedCount: events.filter(e => hasReads(e)).length,
      firstUserReadableEvent: firstUserReadableEvent
    })
  })

  // Initial path for reading a participant - redirect to start page / do setup
  router.get('/reading/clinics/:clinicId/events/:eventId', (req, res) => {
    const data = req.session.data

    // Delete temporary data from previous steps
    console.log("Deleting temporary data");
    delete data.imageReadingTemp

    res.redirect(`/reading/clinics/${req.params.clinicId}/events/${req.params.eventId}/medical-information`)
  })

  // Additional route handlers for each step
  router.get('/reading/clinics/:clinicId/events/:eventId/:step', (req, res, next) => {
    const { clinicId, eventId, step } = req.params
    const validSteps = ['assessment', 'normal-details', 'participant-details', 'medical-information', 'images', 'confirm-normal', 'recall-reason', 'recall-for-assessment-details', 'annotation', 'awaiting-annotations', 'confirm-abnormal', 'recommended-assessment']

    if (!validSteps.includes(step)) {
      return next()
      // return res.redirect(`/clinics/${clinicId}/reading/${eventId}/result`)
    }

    const eventData = getEventData(req.session.data, clinicId, eventId)
    if (!eventData) return res.redirect(`/reading/clinics/${clinicId}`)

    res.render(`reading/${step}`)
  })

  // Change in reading.js
  router.post('/reading/clinics/:clinicId/events/:eventId/assessment-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const { result } = req.body
    const data = req.session.data

    const event = data.events.find(e => e.id === eventId)
    if (!event) return res.redirect(`/reading/clinics/${clinicId}`)

    // Check if current event has symptoms that need acknowledging
    // const hasSymptoms = event?.currentSymptoms?.length > 0

    const currentUserId = data.currentUser.id
    const existingResult = event?.imageReading?.reads?.[currentUserId]?.result
    const updatedResult = data.imageReadingTemp?.updatedResult

    // const existingResult = event.reads?.[0]?.result
    console.log({existingResult});
    console.log({updatedResult});

    if (existingResult) {
      // No change made, so go to next person
      if (existingResult === updatedResult) {
        console.log("Existing result is the same")
        const events = getReadableEventsForClinic(data, clinicId)
        const progress = getReadingProgress(events, eventId)

        // Redirect to next participant if available
        if (progress.hasNextUserReadable) {
          return res.redirect(`/reading/clinics/${clinicId}/events/${progress.nextUserReadableId}`)
        } else {
          return res.redirect(`/reading/clinics/${clinicId}`)
        }
      }
    }

    // Handle different result types
    switch (result || updatedResult) {
      case 'normal':
        if (data.settings.reading.confirmNormal === 'true') {
          return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}/confirm-normal`)
        }
        else {
          return res.redirect(307, `/reading/clinics/${clinicId}/events/${eventId}/result-normal`)
        }
      case 'technical_recall':
        return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}/recall-reason`)
      case 'recall_for_assessment':
        return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}/recall-for-assessment-details`)
      default:
        return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}`)
    }
  })


  // Generic result recording route
  router.post('/reading/clinics/:clinicId/events/:eventId/result-:resultType', (req, res) => {
    const { clinicId, eventId, resultType } = req.params
    const { reason, annotations } = req.body
    const data = req.session.data
    const currentUserId = data.currentUser.id
    const formData = data.imageReadingTemp
    delete data.imageReadingTemp

    // Find the event
    const event = data.events.find(e => e.id === eventId)
    if (!event) {
      return res.redirect(`/reading/clinics/${clinicId}`)
    }

    // Create base reading result
    const readResult = {
      result: snakeCase(resultType),
      readerId: currentUserId,
      readerType: data.currentUser.role,
      ...formData,
      timestamp: new Date().toISOString(),
    }

    // Write reading using the new function
    writeReading(event, currentUserId, readResult)

    // Get updated events and find next one for current user
    const events = getReadableEventsForClinic(data, clinicId)
    const currentIndex = events.findIndex(e => e.id === eventId)

    // Use enhanced progress tracking for navigation
    const progress = getReadingProgress(events, eventId, [], currentUserId)

    // Redirect based on availability of user-readable events
    if (progress.hasNextUserReadable) {
      res.redirect(`/reading/clinics/${clinicId}/events/${progress.nextUserReadableId}`)
    } else {
      res.redirect(`/reading/clinics/${clinicId}`)
    }
  })


}