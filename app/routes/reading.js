// app/routes/image-reading.js
const dayjs = require('dayjs')
const { getEventData } = require('../lib/utils/event-data')
const { getReadingProgress } = require('../lib/utils/readings')
const { getFullName } = require('../lib/utils/participants')

module.exports = router => {
  // Set nav state
  router.use('/clinics/:clinicId/reading', (req, res, next) => {
    res.locals.navActive = 'reading'
    next()
  })

  // Reading routes middleware
  router.use('/clinics/:clinicId/reading/:eventId', (req, res, next) => {
    const eventData = getEventData(req.session.data, req.params.clinicId, req.params.eventId)

    if (!eventData) {
      return res.redirect('/clinics/' + req.params.clinicId + '/reading')
    }

    const event = eventData.event

    // Initialize reading session data if not exists
    req.session.data.readingSession = req.session.data.readingSession || {
      clinicId: req.params.clinicId,
      skippedEvents: []
    }

    // Reset if we've switched clinics
    if (req.session.data.readingSession.clinicId !== req.params.clinicId) {
      req.session.data.readingSession = {
        clinicId: req.params.clinicId,
        skippedEvents: []
      }
    }

    // Add to skipped list if an event was explicitly skipped
    const skippedEventId = req.query.skipped
    delete req.session.data.skipped
    if (skippedEventId &&
      !req.session.data.readingSession.skippedEvents.includes(skippedEventId) &&
      !req.session.data.events.find(e => e.id === skippedEventId)?.reads?.length)
      {
        req.session.data.readingSession.skippedEvents.push(skippedEventId)
      }

    // Remove any events from skipped list that have now been read
    req.session.data.readingSession.skippedEvents =
    req.session.data.readingSession.skippedEvents.filter(skippedId => {
      const event = req.session.data.events.find(e => e.id === skippedId)
      return !event?.reads?.length
    })

    const progress = getReadingProgress(
      eventData.clinic,
      req.session.data.events,
      req.params.eventId,
      req.session.data.readingSession?.skippedEvents || []
    )

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
  router.get('/clinics/:clinicId/reading', (req, res, next) => {
    const { clinicId } = req.params
    const data = req.session.data

    const clinic = data.clinics.find(c => c.id === clinicId)
    if (!clinic) return res.redirect('/clinics')

    const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId)

    const completeStatuses = ['event_complete', 'event_partially_screened']

    // Get all complete events with read status
    const eventsWithStatus = data.events
      .filter(event => event.clinicId === clinicId && completeStatuses.includes(event.status))
      .sort((a, b) => new Date(a.timing.startTime) - new Date(b.timing.startTime))
      .map(event => ({
        ...event,
        participant: data.participants.find(p => p.id === event.participantId),
        readStatus: event.reads?.length > 0 ? 'Read' : 'Not read',
        tagColor: event.reads?.length > 0 ? 'green' : 'grey'
      }))

    res.render('reading/list', {
      clinicId,
      clinic,
      unit,
      events: eventsWithStatus,
      totalToRead: eventsWithStatus.length,
      completedCount: eventsWithStatus.filter(e => e.reads?.length > 0).length
    })
  })

  // Route handlers can now be simpler
  router.get('/clinics/:clinicId/reading/:eventId', (req, res) => {
    res.render('reading/result')
  })

  // Record reading result
  router.post('/clinics/:clinicId/reading/:eventId', (req, res) => {
    const { clinicId, eventId } = req.params
    const { result } = req.body
    const data = req.session.data

    const eventIndex = data.events.findIndex(e => e.id === eventId)
    if (eventIndex === -1) return res.redirect(`/clinics/${clinicId}/reading`)

    // Add reading result
    data.events[eventIndex].reads = data.events[eventIndex].reads || []
    data.events[eventIndex].reads.push({
      result,
      readerId: data.currentUser.id,
      readerType: data.currentUser.role,
      timestamp: new Date().toISOString()
    })

    req.session.data = data

    const progress = getReadingProgress(data.clinics.find(c => c.id === clinicId), data.events, eventId)

    // Redirect to next participant if available
    if (progress.hasNext) {
      res.redirect(`/clinics/${clinicId}/reading/${progress.nextEventId}`)
    } else {
      res.redirect(`/clinics/${clinicId}/reading`)
    }
  })

  // Additional route handlers for each step
  router.get('/clinics/:clinicId/reading/:eventId/:step', (req, res) => {
    const { clinicId, eventId, step } = req.params
    const validSteps = ['confirm-normal', 'recall-reason', 'awaiting-annotations', 'confirm-abnormal']

    if (!validSteps.includes(step)) {
      return res.redirect(`/clinics/${clinicId}/reading/${eventId}/result`)
    }

    const eventData = getEventData(req.session.data, clinicId, eventId)
    if (!eventData) return res.redirect(`/clinics/${clinicId}/reading`)

    res.render(`reading/${step}`, {
      // ...eventData,
      // progress: getReadingProgress(eventData.clinic, req.session.data.events, eventId)
    })
  })

  // router.post('/clinics/:clinicId/reading/:eventId/result-normal', (req, res) => {
  //   const { clinicId, eventId } = req.params
  //   const data = req.session.data

  //   const eventIndex = data.events.findIndex(e => e.id === eventId)
  //   if (eventIndex === -1) return res.redirect(`/clinics/${clinicId}/reading`)

  //   data.events[eventIndex].reads = data.events[eventIndex].reads || []
  //   data.events[eventIndex].reads.push({
  //     result: 'normal',
  //     readerId: data.currentUser.id,
  //     readerType: data.currentUser.role,
  //     timestamp: new Date().toISOString()
  //   })

  //   req.session.data = data

  //   const progress = getReadingProgress(data.clinics.find(c => c.id === clinicId), data.events, eventId)

  //   if (progress.hasNext) {
  //     res.redirect(`/clinics/${clinicId}/reading/${progress.nextEventId}`)
  //   } else {
  //     res.redirect(`/clinics/${clinicId}/reading`)
  //   }
  // })

  // router.post('/clinics/:clinicId/reading/:eventId/result-recall', (req, res) => {
  //   const { clinicId, eventId } = req.params
  //   const { reason } = req.body
  //   const data = req.session.data

  //   const eventIndex = data.events.findIndex(e => e.id === eventId)
  //   if (eventIndex === -1) return res.redirect(`/clinics/${clinicId}/reading`)

  //   data.events[eventIndex].reads = data.events[eventIndex].reads || []
  //   data.events[eventIndex].reads.push({
  //     result: 'recall',
  //     reason,
  //     readerId: data.currentUser.id,
  //     readerType: data.currentUser.role,
  //     timestamp: new Date().toISOString()
  //   })

  //   req.session.data = data

  //   const progress = getReadingProgress(data.clinics.find(c => c.id === clinicId), data.events, eventId)

  //   if (progress.hasNext) {
  //     res.redirect(`/clinics/${clinicId}/reading/${progress.nextEventId}`)
  //   } else {
  //     res.redirect(`/clinics/${clinicId}/reading`)
  //   }
  // })

  // router.post('/clinics/:clinicId/reading/:eventId/result-abnormal', (req, res) => {
  //   const { clinicId, eventId } = req.params
  //   const { annotations } = req.body
  //   const data = req.session.data

  //   const eventIndex = data.events.findIndex(e => e.id === eventId)
  //   if (eventIndex === -1) return res.redirect(`/clinics/${clinicId}/reading`)

  //   data.events[eventIndex].reads = data.events[eventIndex].reads || []
  //   data.events[eventIndex].reads.push({
  //     result: 'abnormal',
  //     annotations,
  //     readerId: data.currentUser.id,
  //     readerType: data.currentUser.role,
  //     timestamp: new Date().toISOString()
  //   })

  //   req.session.data = data

  //   const progress = getReadingProgress(data.clinics.find(c => c.id === clinicId), data.events, eventId)

  //   if (progress.hasNext) {
  //     res.redirect(`/clinics/${clinicId}/reading/${progress.nextEventId}`)
  //   } else {
  //     res.redirect(`/clinics/${clinicId}/reading`)
  //   }
  // })

  // Generic result recording route
  router.post('/clinics/:clinicId/reading/:eventId/result-:resultType', (req, res) => {
    const { clinicId, eventId, resultType } = req.params
    const { reason, annotations } = req.body
    const data = req.session.data

    const eventIndex = data.events.findIndex(e => e.id === eventId)
    if (eventIndex === -1) return res.redirect(`/clinics/${clinicId}/reading`)

    // Create base reading result
    const readResult = {
      result: resultType,
      readerId: data.currentUser.id,
      readerType: data.currentUser.role,
      timestamp: new Date().toISOString()
    }

    // Add additional data based on result type
    if (resultType === 'recall' && reason) {
      readResult.reason = reason
    }
    if (resultType === 'abnormal' && annotations) {
      readResult.annotations = annotations
    }

    // Add reading to event
    data.events[eventIndex].reads = data.events[eventIndex].reads || []
    data.events[eventIndex].reads.push(readResult)

    req.session.data = data

    const progress = getReadingProgress(data.clinics.find(c => c.id === clinicId), data.events, eventId)

    // req.flash('success', 'Session data cleared')

    // Redirect to next participant if available
    if (progress.hasNext) {
      res.redirect(`/clinics/${clinicId}/reading/${progress.nextEventId}`)
    } else {
      res.redirect(`/clinics/${clinicId}/reading`)
    }
  })


}