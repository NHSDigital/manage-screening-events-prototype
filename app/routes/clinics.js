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

  function filterEvents(events, filter) {
    switch(filter) {
      case 'scheduled':
        return events.filter(e => e.status === 'scheduled');
      case 'checked-in':
        console.log('filtering checked in')
        return events.filter(e => e.status === 'checked_in');
      case 'attended':
        return events.filter(e => ['attended', 'attended_not_screened'].includes(e.status));
      default:
        return events;
    }
  }

  // Single clinic view
  const VALID_FILTERS = ['scheduled', 'checked-in', 'attended', 'all'];

  // Support both /clinics/:id and /clinics/:id/:filter
  router.get(['/clinics/:id', '/clinics/:id/:filter'], (req, res) => {
    const clinicData = getClinicData(req.session.data, req.params.id);
    
    if (!clinicData) {
      return res.redirect('/clinics');
    }

    // Check filter from either URL param or query string
    let filter = req.params.filter || req.query.filter || 'all';

    // Validate filter
    if (!VALID_FILTERS.includes(filter)) {
      return res.redirect(`/clinics/${req.params.id}`);
    }

    console.log(`Events before: ${clinicData.events.length}`)
    const filteredEvents = filterEvents(clinicData.events, filter);
    console.log(`Events after: ${filteredEvents.length}`)

    res.render('clinics/show', {
      clinicId: req.params.id,
      clinic: clinicData.clinic,
      allEvents: clinicData.events,
      filteredEvents: filteredEvents,
      unit: clinicData.unit,
      currentFilter: filter,
      formatDate: (date) => dayjs(date).format('D MMMM YYYY'),
      formatTime: (date) => dayjs(date).format('HH:mm')
    });
  });

};
