// app/routes/events.js
const dayjs = require('dayjs')

const { getFullName } = require('../lib/utils/participants')
const { generateMammogramImages } = require('../lib/generators/mammogram-generator')

/**
 * Get single event and its related data
 */
function getEventData (data, clinicId, eventId) {
  const clinic = data.clinics.find(c => c.id === clinicId)

  if (!clinic) {
    return null
  }

  const event = data.events.find(e => e.id === eventId && e.clinicId === clinicId)

  if (!event) {
    return null
  }

  const participant = data.participants.find(p => p.id === event.participantId)
  const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId)

  return {
    clinic,
    event,
    participant,
    unit,
  }
}

// Update event status and add to history
function updateEventStatus (event, newStatus) {
  return {
    ...event,
    status: newStatus,
    statusHistory: [
      ...event.statusHistory,
      {
        status: newStatus,
        timestamp: new Date().toISOString(),
      },
    ],
  }
}

module.exports = router => {
  // Set clinics to active in nav for all urls starting with /clinics
  router.use('/clinics/:clinicId/events/:eventId', (req, res, next) => {
    const eventData = getEventData(req.session.data, req.params.clinicId, req.params.eventId)

    if (!eventData) {
      console.log(`No event ${req.params.eventId} found for clinic ${req.params.clinicId}`)
      res.redirect('/clinics/' + req.params.clinicId)
      return
    }

    // An idea for how we could automate saving back to participant
    // if (data.saveToParticipant){
    //   const participantIndex = data.participants.findIndex(p => p.id === eventData.participant.id);
    //   if (participantIndex !== -1) {
    //     // Update participant record with questionnaire data
    //     data.participants[participantIndex] = {
    //       ...data.participants[participantIndex],
    //       ...data.saveToParticipant
    //     };

    //     delete data.saveToParticipant
    //   }
    // }

    res.locals.eventData = eventData
    res.locals.clinic = eventData.clinic
    res.locals.event = eventData.event
    res.locals.participant = eventData.participant
    res.locals.unit = eventData.unit
    res.locals.clinicId = req.params.clinicId
    res.locals.eventId = req.params.eventId

    next()
  })

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId', (req, res) => {
    res.render('events/show', {
    })
  })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/start', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const canBeginScreening = data.beginScreening
    delete data.beginScreening

    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)

    if (!canBeginScreening) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}`)
    } else if (canBeginScreening === 'yes') {
      if (req.session.data.events[eventIndex].status !== 'event_checked_in') {
        req.session.data.events[eventIndex] = updateEventStatus(
          req.session.data.events[eventIndex],
          'event_checked_in'
        )
      }
      res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-information`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/attended-not-screened-reason`)
    }
  })

  const MAMMOGRAPHY_VIEWS = ['medical-information', 'record-medical-information', 'ready-for-imaging', 'awaiting-images', 'images', 'confirm', 'screening-complete', 'attended-not-screened-reason']

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId/:view', (req, res, next) => {
    if (MAMMOGRAPHY_VIEWS.some(view => view === req.params.view)) {
      res.render(`events/mammography/${req.params.view}`, {
      })
    } else next()
  })

  // Specific route for imaging view
  router.get('/clinics/:clinicId/events/:eventId/imaging', (req, res) => {
    const { clinicId, eventId } = req.params
    const event = req.session.data.events.find(e => e.id === eventId)
    const eventData = getEventData(req.session.data, clinicId, eventId)

    // If no mammogram data exists, generate it
    if (!event.mammogramData) {
      const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)
      // Set start time to 3 minutes ago to simulate an in-progress screening
      const startTime = dayjs().subtract(3, 'minutes').toDate()
      const mammogramData = generateMammogramImages({
        startTime,
        isSeedData: false,
        config: eventData?.participant?.config,
      })

      // Update both session data and locals
      const updatedEvent = {
        ...event,
        mammogramData
      }

      req.session.data.events[eventIndex] = updatedEvent
      res.locals.event = updatedEvent
    }

    res.render('events/mammography/imaging', {})
  })


  // Handle medical information answer
  router.post('/clinics/:clinicId/events/:eventId/medical-information-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const hasDetailsToRecord = data.medicalBackgroundQuestion
    delete data.hasDetailsToRecord

    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)

    if (!hasDetailsToRecord) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-information`)
    } else if (hasDetailsToRecord === 'yes') {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/record-medical-information`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/awaiting-images`)
    }
  })

  // Handle record medical information answer
  router.post('/clinics/:clinicId/events/:eventId/record-medical-information-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const imagingCanProceed = data.imagingCanProceed
    delete data.imagingCanProceed

    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)

    if (!imagingCanProceed) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/record-medical-information`)
    } else if (imagingCanProceed === 'yes') {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/awaiting-images`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/attended-not-screened-reason`)
    }
  })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/imaging-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const imagingComplete = data.imagingComplete
    delete data.imagingComplete

    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)

    if (!imagingComplete) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/imaging`)
    } else if (imagingComplete === 'yes' || imagingComplete === 'yesPartial') {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/confirm`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/attended-not-screened-reason`)
    }
  })

  // // Advance status to attened / complete
  // router.post('/clinics/:clinicId/events/:eventId/complete', (req, res) => {

  //   res.redirect(`/clinics/${req.params.clinicId}/events/${req.params.eventId}`, {
  //   })
  // })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/attended-not-screened-answer', (req, res) => {
    const { clinicId, eventId } = req.params

    const eventData = getEventData(req.session.data, clinicId, eventId)
    const participantName = getFullName(eventData.participant)
    const participantEventUrl = `/clinics/${clinicId}/events/${eventId}`

    // Update event status to attended
    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)
    req.session.data.events[eventIndex] = updateEventStatus(
      req.session.data.events[eventIndex],
      'event_attended_not_screened'
    )

    const successMessage = `
    ${participantName} has been is ‘attended not screened’. <a href="${participantEventUrl}" class="app-nowrap">View their appointment</a>`

    req.flash('success', { wrapWithHeading: successMessage})


    res.redirect(`/clinics/${clinicId}/`)
  })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/complete', (req, res) => {
    const { clinicId, eventId } = req.params

    const eventData = getEventData(req.session.data, clinicId, eventId)
    const participantName = getFullName(eventData.participant)
    const participantEventUrl = `/clinics/${clinicId}/events/${eventId}`

    // Update event status to attended
    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)
    req.session.data.events[eventIndex] = updateEventStatus(
      req.session.data.events[eventIndex],
      'event_complete'
    )

    const successMessage = `
    ${participantName} has been screened. <a href="${participantEventUrl}" class="app-nowrap">View their appointment</a>`

    req.flash('success', { wrapWithHeading: successMessage})

    res.redirect(`/clinics/${clinicId}/`)

    // res.redirect(`/clinics/${clinicId}/events/${eventId}/screening-complete`)
  })
}
