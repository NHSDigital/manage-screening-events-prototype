// app/routes/events.js


/**
 * Get single event and its related data
 */
function getEventData(data, clinicId, eventId) {
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
    unit
  }
}

// Update event status and add to history
function updateEventStatus(event, newStatus) {
  return {
    ...event,
    status: newStatus,
    statusHistory: [
      ...event.statusHistory,
      {
        status: newStatus,
        timestamp: new Date().toISOString()
      }
    ]
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

    res.locals.eventData = eventData
    res.locals.clinic = eventData.clinic,
    res.locals.event = eventData.event,
    res.locals.participant = eventData.participant,
    res.locals.unit = eventData.unit,
    res.locals.clinicId = req.params.clinicId,
    res.locals.eventId = req.params.eventId

    next();
  });

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId', (req, res) => {
    res.render('events/show', {
    })
  })

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId/imaging', (req, res) => {
    res.render('events/mamography/imaging', {
    })
  })

  // // Advance status to attened / complete
  // router.post('/clinics/:clinicId/events/:eventId/attended', (req, res) => {

  //   res.redirect(`/clinics/${req.params.clinicId}/events/${req.params.eventId}`, {
  //   })
  // })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/complete', (req, res) => {
    const { clinicId, eventId } = req.params

    // Update event status to attended
    const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)
    req.session.data.events[eventIndex] = updateEventStatus(
      req.session.data.events[eventIndex],
      'attended'
    )

    res.redirect(`/clinics/${clinicId}/events/${eventId}`)
  })

};
