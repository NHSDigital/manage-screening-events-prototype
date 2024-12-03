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

module.exports = router => {

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId', (req, res) => {
    const eventData = getEventData(req.session.data, req.params.clinicId, req.params.eventId)
    
    if (!eventData) {
      res.redirect('/clinics/' + req.params.clinicId)
      return
    }

    res.render('events/show', {
      clinic: eventData.clinic,
      event: eventData.event,
      participant: eventData.participant,
      unit: eventData.unit,
      clinicId: req.params.clinicId,
      eventId: req.params.eventId
    })
  })

};
