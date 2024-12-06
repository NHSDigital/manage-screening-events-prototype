// app/routes/clinics.js

const dayjs = require('dayjs');
const { getFilteredClinics, getClinicEvents } = require('../lib/utils/clinics');

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

  // Set clinics to active in nav for all urls starting with /clinics
  router.use('/clinics', (req, res, next) => {
    res.locals.navActive = "clinics"
    next();
  });

  // Redirect to default tab
  router.get('/clinics', (req, res) => {
    res.redirect('/clinics/today');
  });

  // Clinic tab options
  const clinicViews = ['/clinics/today', '/clinics/upcoming', '/clinics/completed', '/clinics/all'];

  router.get(clinicViews, (req, res) => {

    const data = req.session.data

    // Extract filter from the URL path
    let filter = req.path.split('/').pop();

    // Check filter from either URL param or query string
    filter = filter || req.query.filter || 'all';

    // Add additional data needed for each clinic
    const clinicsWithData = data.clinics.map(clinic => {
      const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId);
      const location = unit.locations.find(l => l.id === clinic.locationId);
      const events = getClinicEvents(data.events, clinic.id);

      return {
        ...clinic,
        unit,
        location,
        events
      };
    });

    // Filter for just the clinics we want
    const filteredClinics = getFilteredClinics(clinicsWithData, filter);

    res.render('clinics/index', {
      filter,
      clinics: clinicsWithData,
      filteredClinics,
      formatDate: (date) => dayjs(date).format('D MMMM YYYY')
    });

  });



  const QUESTIONNAIRE_SECTIONS = ['health-status', 'medical-history', 'current-symptoms'];

  // Helper to validate section name
  const isValidSection = (section) => QUESTIONNAIRE_SECTIONS.includes(section);

  // Helper to get next section
  const getNextSection = (currentSection) => {
    const currentIndex = QUESTIONNAIRE_SECTIONS.indexOf(currentSection);
    return QUESTIONNAIRE_SECTIONS[currentIndex + 1];
  };

  // Check your answers - route needs to be before later wildcard route
  router.get('/clinics/:clinicId/participants/:participantId/questionnaire/summary', (req, res) => {
    const { clinicId, participantId } = req.params;
    
    const participant = req.session.data.participants.find(p => p.id === participantId);
    const clinic = req.session.data.clinics.find(c => c.id === clinicId);
    const event = req.session.data.events.find(e => 
      e.clinicId === clinicId && 
      e.participantId === participantId
    );
    
    if (!participant || !clinic || !event) {
      res.redirect('/clinics/' + clinicId);
      return;
    }

    // Collect all questionnaire data
    const questionnaireData = QUESTIONNAIRE_SECTIONS.reduce((acc, section) => {
      acc[section] = req.session.data[`questionnaire_${section}`] || {};
      return acc;
    }, {});

    res.render('participants/questionnaire/summary', {
      participant,
      clinic,
      event,
      clinicId,
      participantId,
      questionnaireData
    });
  });

  // Base questionnaire route
  router.get('/clinics/:clinicId/participants/:participantId/questionnaire/:section', (req, res) => {
    const { clinicId, participantId, section } = req.params;
    
    // Validate section name
    if (!QUESTIONNAIRE_SECTIONS.includes(section)) {
      res.redirect(`/clinics/${clinicId}/participants/${participantId}/questionnaire/health-status`);
      return;
    }

    const participant = req.session.data.participants.find(p => p.id === participantId);
    const clinic = req.session.data.clinics.find(c => c.id === clinicId);
    const event = req.session.data.events.find(e => 
      e.clinicId === clinicId && 
      e.participantId === participantId
    );
    
    if (!participant || !clinic || !event) {
      res.redirect('/clinics/' + clinicId);
      return;
    }

    res.render(`participants/questionnaire/${section}`, {
      participant,
      clinic,
      event,
      clinicId,
      participantId,
      currentSection: section,
      sections: QUESTIONNAIRE_SECTIONS
    });
  });

  // After summary confirmation, we could save back to participant record
  router.post('/clinics/:clinicId/participants/:participantId/questionnaire/complete', (req, res) => {
    const { clinicId, participantId } = req.params;
    
    // Find participant
    const participantIndex = req.session.data.participants.findIndex(p => p.id === participantId);
    
    if (participantIndex !== -1) {
      // Update participant record with questionnaire data
      req.session.data.participants[participantIndex] = {
        ...req.session.data.participants[participantIndex],
        questionnaire: req.session.data.questionnaire
      };
    }

    // Clear questionnaire data from session
    delete req.session.data.questionnaire;
    
    res.redirect(`/clinics/${clinicId}/participants/${participantId}`);
  });

  // Handle form submissions
  router.post('/clinics/:clinicId/participants/:participantId/questionnaire/:section', (req, res) => {
    const { clinicId, participantId, section } = req.params;
    
    // Get next section
    const nextSection = getNextSection(section);

    if (nextSection) {
      res.redirect(`/clinics/${clinicId}/participants/${participantId}/questionnaire/${nextSection}`);
    } else {
      res.redirect(`/clinics/${clinicId}/participants/${participantId}/questionnaire/summary`);
    }
  });

  // Add a convenience redirect from the base questionnaire URL to the first section
  router.get('/clinics/:clinicId/participants/:participantId/questionnaire', (req, res) => {
    const { clinicId, participantId } = req.params;
    res.redirect(`/clinics/${clinicId}/participants/${participantId}/questionnaire/health-status`);
  });

  // Handle check-in
  router.get('/clinics/:clinicId/check-in/:eventId', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    
    // Get current filter from query param, or default to the current page's filter
    const currentFilter = req.query.filter || req.query.currentFilter || 'all'
    
    // Find the event
    const eventIndex = data.events.findIndex(e => e.id === eventId && e.clinicId === clinicId)
    
    if (eventIndex === -1) {
      return res.redirect(`/clinics/${clinicId}/${currentFilter}`)
    }

    // Update the event status
    const event = data.events[eventIndex]
    
    // Only allow check-in if currently scheduled
    if (event.status !== 'scheduled') {
      return res.redirect(`/clinics/${clinicId}/${currentFilter}`)
    }

    // Update the event
    data.events[eventIndex] = {
      ...event,
      status: 'checked_in',
      statusHistory: [
        ...event.statusHistory,
        {
          status: 'checked_in',
          timestamp: new Date().toISOString()
        }
      ]
    }

    // Save back to session
    req.session.data = data

    // If there's a returnTo path, use that, otherwise go back to the filter view
    const returnTo = req.query.returnTo
    if (returnTo) {
      res.redirect(returnTo)
    } else {
      res.redirect(`/clinics/${clinicId}/${currentFilter}`)
    }
  })

  function filterEvents(events, filter) {
    switch(filter) {
      case 'scheduled':
        return events.filter(e => e.status === 'scheduled');
      case 'checked-in':
        console.log('filtering checked in')
        return events.filter(e => e.status === 'checked_in');
      case 'complete':
        return events.filter(e => ['complete', 'attended_not_screened'].includes(e.status));
      default:
        return events;
    }
  }

  // Single clinic view
  const VALID_FILTERS = ['scheduled', 'checked-in', 'complete', 'all'];

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

    const filteredEvents = filterEvents(clinicData.events, filter);

    res.render('clinics/show', {
      clinicId: req.params.id,
      clinic: clinicData.clinic,
      allEvents: clinicData.events,
      filteredEvents: filteredEvents,
      status: filter,
      unit: clinicData.unit,
      currentFilter: filter,
      formatDate: (date) => dayjs(date).format('D MMMM YYYY'),
      formatTime: (date) => dayjs(date).format('HH:mm')
    });
  });

};
