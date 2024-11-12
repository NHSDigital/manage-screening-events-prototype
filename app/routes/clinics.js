// app/routes/clinics.js

const dayjs = require('dayjs');

/**
 * Get clinic and its related data from id
 */
function getClinicData(data, clinicId) {
  const clinic = data.clinics.find(c => c.id === clinicId);
  
  if (!clinic) {
    return null;
  }

  // Get all events for this clinic
  const clinicEvents = data.events.filter(e => e.clinicId === clinic.id);

  // Get all participants for these events and add their details to the events
  const eventsWithParticipants = clinicEvents.map(event => {
    const participant = data.participants.find(p => p.id === event.participantId);
    return {
      ...event,
      participant
    };
  });

  // Get screening unit details
  const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId);

  return {
    clinic,
    events: eventsWithParticipants,
    unit
  };
}

module.exports = router => {

  router.get('/clinics/today', (req, res) => {
    res.render('clinics/today');
  });

  // Single clinic view
  router.get('/clinics/:id', (req, res) => {
    const clinicData = getClinicData(req.session.data, req.params.id);
    
    if (!clinicData) {
      res.redirect('/clinics');
      return;
    }

    res.render('clinics/show', {
      clinicId: req.params.id,
      clinic: clinicData.clinic,
      events: clinicData.events,
      unit: clinicData.unit,
      formatDate: (date) => dayjs(date).format('D MMMM YYYY'),
      formatTime: (date) => dayjs(date).format('HH:mm')
    });
  });

  // View participant within clinic context
  router.get('/clinics/:clinicId/participants/:participantId', (req, res) => {
    const participant = req.session.data.participants.find(p => p.id === req.params.participantId);
    const clinic = req.session.data.clinics.find(c => c.id === req.params.clinicId);
    const event = req.session.data.events.find(e => 
      e.clinicId === req.params.clinicId && 
      e.participantId === req.params.participantId
    );
    
    if (!participant || !clinic || !event) {
      res.redirect('/clinics/' + req.params.clinicId);
      return;
    }

    res.render('participants/show', {
      participant,
      clinic,
      event,
      clinicId: req.params.clinicId,
      participantId: req.params.participantId
    });
  });



};
