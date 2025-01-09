// app/routes/events.js

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

    // console.log({data})

    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)

    if (!canBeginScreening) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}`)
    } else if (canBeginScreening === 'yes') {
      if (req.session.data.events[eventIndex].status !== 'checked_in') {
        req.session.data.events[eventIndex] = updateEventStatus(
          req.session.data.events[eventIndex],
          'checked_in'
        )
      }
      res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-background`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/attended-not-screened-reason`)
    }
  })

  const MAMMOGRAPHY_VIEWS = ['medical-background', 'medical-details', 'ready-for-imaging', 'images', 'imaging', 'confirm', 'screening-complete', 'attended-not-screened-reason']

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId/:view', (req, res, next) => {
    if (MAMMOGRAPHY_VIEWS.some(view => view === req.params.view)) {
      res.render(`events/mammography/${req.params.view}`, {
      })
    } else next()
  })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/medical-background-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const hasDetailsToRecord = data.medicalBackgroundQuestion
    delete data.hasDetailsToRecord

    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)

    if (!hasDetailsToRecord) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-background`)
    } else if (hasDetailsToRecord === 'yes') {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-details`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/ready-for-imaging`)
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

    // Update event status to attended
    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)
    req.session.data.events[eventIndex] = updateEventStatus(
      req.session.data.events[eventIndex],
      'event_attended_not_screened'
    )

    res.redirect(`/clinics/${clinicId}/events/${eventId}`)
  })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/complete', (req, res) => {
    const { clinicId, eventId } = req.params

    // Update event status to attended
    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)
    req.session.data.events[eventIndex] = updateEventStatus(
      req.session.data.events[eventIndex],
      'event_complete'
    )

    res.redirect(`/clinics/${clinicId}/events/${eventId}/screening-complete`)
  })
}
