// app/routes/participants.js

const { sortBySurname } = require('../lib/utils/participants');
const { findById } = require('../lib/utils/arrays');


module.exports = router => {

// Set clinics to active in nav for all urls starting with /clinics
  router.use('/participants', (req, res, next) => {
    res.locals.navActive = "participants"
    next();
  });

  const cleanSearchTerm = (term) => term.toLowerCase().replace(/\s+/g, '');

  // Redirect to default tab
  router.get('/participants', (req, res) => {
    const data = req.session.data;
    const searchTerm = req.query.search?.trim() || '';
    const cleanedSearch = cleanSearchTerm(searchTerm);

    const allParticipants = sortBySurname(data.participants);
    let filteredParticipants = allParticipants;

    if (searchTerm) {

      // Save cleaned search term back
      data.search = searchTerm
      res.locals.data.search = searchTerm
      filteredParticipants = allParticipants.filter(p => {
        const info = p.demographicInformation;
        const name = `${info.firstName} ${info.middleName || ''} ${info.lastName}`.toLowerCase();
        const postcode = cleanSearchTerm(info.address.postcode);
        const nhsNumber = cleanSearchTerm(p.medicalInformation.nhsNumber);
        const sxNumber = cleanSearchTerm(p.sxNumber);
        
        return name.includes(searchTerm.toLowerCase()) || 
               postcode.includes(cleanedSearch) || 
               nhsNumber.includes(cleanedSearch) ||
               sxNumber.includes(cleanedSearch);
     });
    }

    res.render('participants/index', {
     allParticipants,
     filteredParticipants,
     search: searchTerm,
     isFiltered: searchTerm.length > 0
    });
  });


  router.get('/participants/:participantId', (req, res) => {
    const data = req.session.data;
    const participantId = req.params.participantId
    const participant = findById(data.participants, participantId);
    
    if (!participant) {
      res.redirect('/participants');
      return;
    }

    // Find all events for this participant
    const participantEvents = data.events.filter(e => 
      e.participantId === participant.id
    );

    // Get clinic details for each event
    const participantClinics = participantEvents.map(event => {
      const clinic = findById(data.clinics, event.clinicId);
      return {
        clinic,
        event
      };
    });

    res.render('participants/show', {
      participant,
      participantId,
      clinicHistory: participantClinics
    });
  });

};
