// app/routes/image-reading.js
const dayjs = require('dayjs')
const { getEventData } = require('../lib/utils/event-data')
const { getReadingProgress } = require('../lib/utils/readings')
const { needsReading } = require('../lib/utils/status')
const { getFullName } = require('../lib/utils/participants')

module.exports = router => {
  // Set nav state
  router.use('/clinics/:clinicId/reading', (req, res, next) => {
    res.locals.navActive = 'reading'
    next()
  })

 // Route for showing all clinics available for reading
  router.get('/clinics/reading', (req, res) => {
    res.locals.navActive = 'reading'
    const data = req.session.data
    const sevenDaysAgo = dayjs().subtract(7, 'days').startOf('day')

    // Get closed clinics from last 7 days
    const closedClinics = data.clinics
      .filter(clinic =>
        clinic.status === 'closed' &&
        dayjs(clinic.date).isAfter(sevenDaysAgo)
      )
      .map(clinic => {
        const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId)
        const location = unit.locations.find(l => l.id === clinic.locationId)

        // Get events that need reading (completed screening)
        const events = data.events.filter(event =>
          event.clinicId === clinic.id && needsReading(event)
        )

        // Calculate reading stats
        const readEvents = events.filter(e => e.reads?.length > 0)
        const readingStatus = readEvents.length === events.length ? 'Complete' :
          readEvents.length > 0 ? 'In progress' : 'Not started'
        const statusColor = readingStatus === 'Complete' ? 'green' :
          readingStatus === 'In progress' ? 'blue' : 'grey'

        // Calculate days since screening
        const daysSinceScreening = dayjs().diff(dayjs(clinic.date), 'days')

        return {
          ...clinic,
          unit,
          location,
          events,
          readingStats: {
            total: events.length,
            complete: readEvents.length,
            remaining: events.length - readEvents.length,
            status: readingStatus,
            statusColor,
            daysSinceScreening
          }
        }
      })
      // Sort by date ascending (oldest first)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    res.render('reading/index', {
      clinics: closedClinics,
      totalClinics: closedClinics.length,
      totalToRead: closedClinics.reduce((sum, c) => sum + c.readingStats.remaining, 0)
    })
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

    // Get all complete events with read status
    const eventsWithStatus = data.events
      .filter(event => event.clinicId === clinicId && needsReading(event))
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
  // router.get('/clinics/:clinicId/reading/:eventId', (req, res) => {
  //   res.render('reading/assessment')
  // })

  // Record reading result
  // router.post('/clinics/:clinicId/reading/:eventId', (req, res) => {
  //   const { clinicId, eventId } = req.params
  //   const { result } = req.body
  //   const data = req.session.data

  //   const eventIndex = data.events.findIndex(e => e.id === eventId)
  //   if (eventIndex === -1) return res.redirect(`/clinics/${clinicId}/reading`)

  //   // Add reading result
  //   data.events[eventIndex].reads = data.events[eventIndex].reads || []
  //   data.events[eventIndex].reads.push({
  //     result,
  //     readerId: data.currentUser.id,
  //     readerType: data.currentUser.role,
  //     timestamp: new Date().toISOString()
  //   })

  //   req.session.data = data

  //   const progress = getReadingProgress(data.clinics.find(c => c.id === clinicId), data.events, eventId)

  //   // Redirect to next participant if available
  //   if (progress.hasNext) {
  //     res.redirect(`/clinics/${clinicId}/reading/${progress.nextEventId}/assessment`)
  //   } else {
  //     res.redirect(`/clinics/${clinicId}/reading`)
  //   }
  // })

  // Additional route handlers for each step
  router.get('/clinics/:clinicId/reading/:eventId/:step', (req, res, next) => {
    const { clinicId, eventId, step } = req.params
    const validSteps = ['assessment', 'participant-details', 'medical-information', 'images', 'confirm-normal', 'recall-reason', 'awaiting-annotations', 'confirm-abnormal', 'recommended-assessment']

    if (!validSteps.includes(step)) {
      return next()
      // return res.redirect(`/clinics/${clinicId}/reading/${eventId}/result`)
    }

    const eventData = getEventData(req.session.data, clinicId, eventId)
    if (!eventData) return res.redirect(`/clinics/${clinicId}/reading`)

    res.render(`reading/${step}`, {
      // ...eventData,
      // progress: getReadingProgress(eventData.clinic, req.session.data.events, eventId)
    })
  })

  // Initial route for handling updates to assessments
  router.post('/clinics/:clinicId/reading/:eventId/result-update', (req, res) => {
    const { clinicId, eventId } = req.params
    const { newResult } = req.body

    console.log("result update")
    // Store the intent to update in the session
    req.session.data.readingUpdate = {
      eventId,
      originalResult: req.session.data.events.find(e => e.id === eventId)?.reads[0],
      newResult
    }

    // Route to appropriate next step based on chosen result
    switch(newResult) {
      case 'normal':
        if (req.session.data.confirmNormalResults == 'true') {
          res.redirect(`/clinics/${clinicId}/reading/${eventId}/confirm-normal`)
        }
        else {
          // #307 redirect to preserve POST.
          res.redirect(307, `/clinics/${clinicId}/reading/${eventId}/result-normal`);

        }

        break
      case 'recall':
        res.redirect(`/clinics/${clinicId}/reading/${eventId}/recall-reason`)
        break
      case 'abnormal':
        res.redirect(`/clinics/${clinicId}/reading/${eventId}/awaiting-annotations`)
        break
      default:
        res.redirect(`/clinics/${clinicId}/reading/${eventId}/assessment`)
    }
  })

  // Generic result recording route
  router.post('/clinics/:clinicId/reading/:eventId/result-:resultType', (req, res) => {
    const { clinicId, eventId } = req.params
    const resultType = req.params.resultType
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

    req.session.data = data

    const progress = getReadingProgress(data.clinics.find(c => c.id === clinicId), data.events, eventId)

    // Add flash message for changed reading
    if (data.readingUpdate) {
      req.flash('success', { html: `Reading updated to ${resultType}` })
    }

    // Redirect to next participant if available
    if (progress.hasNextUnread) {
      res.redirect(`/clinics/${clinicId}/reading/${progress.nextUnreadId}/assessment`)
    } else {
      res.redirect(`/clinics/${clinicId}/reading`)
    }
  })


}