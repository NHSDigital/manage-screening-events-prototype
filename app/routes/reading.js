// app/routes/image-reading.js
const dayjs = require('dayjs')
const { getEventData } = require('../lib/utils/event-data')
const { getReadingClinics, getReadingProgress, getReadableEvents, getClinicReadingStatus } = require('../lib/utils/readings')
const { needsReading } = require('../lib/utils/status')
const { getFullName } = require('../lib/utils/participants')
const { snakeCase } = require('../lib/utils/strings')
const { has } = require('browser-sync')

module.exports = router => {
  // Set nav state
  router.use('/reading', (req, res, next) => {
    res.locals.navActive = 'reading'
    next()
  })

 // Route for showing all clinics available for reading
  router.get('/reading', (req, res) => {
    const clinics = getReadingClinics(req.session.data)
    res.render('reading/index', { clinics })
  })

  // Reading routes middleware
  router.use('/reading/clinics/:clinicId/events/:eventId', (req, res, next) => {
    const data = req.session.data
    const eventData = getEventData(data, req.params.clinicId, req.params.eventId)
    const { clinicId, eventId } = req.params

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

    // Add to skipped list if an event was explicitly skipped
    const skippedEventId = req.query.skipped
    delete data.skipped
    if (skippedEventId &&
      !data.readingSession.skippedEvents.includes(skippedEventId) &&
      !data.events.find(e => e.id === skippedEventId)?.reads?.length)
      {
        data.readingSession.skippedEvents.push(skippedEventId)
      }

    // Remove any events from skipped list that have now been read
    data.readingSession.skippedEvents =
    data.readingSession.skippedEvents.filter(skippedId => {
      const event = data.events.find(e => e.id === skippedId)
      return !event?.reads?.length
    })

    const events = getReadableEvents(data, clinicId)
    console.log("Events length:")
    console.log(events.length)
    console.log({clinicId})

    const progress = getReadingProgress(
      events,
      req.params.eventId,
      data.readingSession?.skippedEvents || []
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
    const clinic = data.clinics.find(c => c.id === clinicId)

    if (!clinic) return res.redirect('/reading')


    const readingStatus = getClinicReadingStatus(data, clinicId)
    const events = getReadableEvents(data, clinicId)

    res.render('reading/list', {
      clinic,
      events,
      clinicId: clinic.id,
      readingStatus,
      completedCount: events.filter(e => e.reads?.length > 0).length
    })
  })

  // Redirect event to assessment tab
  router.get('/reading/clinics/:clinicId/events/:eventId', (req, res) => {
    const data = req.session.data

    // Delete temporary data from previous steps
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

    res.render(`reading/${step}`, {
      // ...eventData,
      // progress: getReadingProgress(eventData.clinic, req.session.data.events, eventId)
    })
  })

  // Change in reading.js
  router.post('/reading/clinics/:clinicId/events/:eventId/assessment-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const { result } = req.body
    const data = req.session.data

    const event = data.events.find(e => e.id === eventId)
    if (!event) return res.redirect(`/reading/clinics/${clinicId}`)

    // Check if current event has symptoms that need acknowledging
    const hasSymptoms = event?.currentSymptoms?.length > 0
    const hasRepeatImages = event?.mammogramData?.metadata?.hasRepeat
    // const hasAcknowledgedItems = data?.acknowledgeItems?.includes('true')

    const existingResult = event.reads?.[0]?.result
    console.log({existingResult})
    if (existingResult && existingResult === result) {
      const events = getReadableEvents(data, clinicId)
      const progress = getReadingProgress(events, eventId)

      // Redirect to next participant if available
      if (progress.hasNextUnread) {
        return res.redirect(`/reading/clinics/${clinicId}/events/${progress.nextUnreadId}`)
      } else {
        return res.redirect(`/reading/clinics/${clinicId}`)
      }
    }

    // if ((hasSymptoms || hasRepeatImages) && !hasAcknowledgedItems) {
    //   console.log('still with the errors')
    //   req.flash('error', {
    //     text: 'You must acknowledge before continuing',
    //     href: '#acknowledgeItems-1', // link to checkbox specifically rather than fieldset
    //     name: 'acknowledgeItems'
    //   })
    //   return res.redirect(`/clinics/${clinicId}/reading/${eventId}/assessment`)
    // }

    // Handle different result types
    switch (result) {
      case 'normal':
        if (data.confirmNormalResults === 'true') {
          return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}/confirm-normal`)
        }
        else if (hasSymptoms) {
          return res.redirect(`/reading/clinics/${clinicId}/events/${eventId}/normal-details`)
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
    console.log('result recording route')
    const { clinicId, eventId, resultType } = req.params
    const { reason, annotations } = req.body
    const data = req.session.data

    const eventIndex = data.events.findIndex(e => e.id === eventId)
    if (eventIndex === -1) return res.redirect(`/reading/clinics/${clinicId}`)

    // Create base reading result
    const readResult = {
      result: snakeCase(resultType),
      readerId: data.currentUser.id,
      readerType: data.currentUser.role,
      timestamp: new Date().toISOString()
    }

    delete data.acknowledgeItems

    // Add additional data based on result type
    if (resultType === 'technical-recall' && reason) {
      readResult.reason = reason
    }
    if (resultType === 'recall-for-assessment' && annotations) {
      readResult.annotations = annotations
    }

    // Check if this is an update to an existing read
    if (data.readingUpdate && data.readingUpdate.eventId === eventId) {
      // Replace the first read with the new one
      data.events[eventIndex].reads[0] = readResult
      delete data.readingUpdate
    } else {
      // Add as new read
      data.events[eventIndex].reads = data.events[eventIndex].reads || []
      data.events[eventIndex].reads.push(readResult)
    }

    const events = getReadableEvents(data, clinicId)
    const progress = getReadingProgress(events, eventId)

    // Redirect to next participant if available
    if (progress.hasNextUnread) {
      res.redirect(`/reading/clinics/${clinicId}/events/${progress.nextUnreadId}`)
    } else {
      res.redirect(`/reading/clinics/${clinicId}`)
    }
  })


}