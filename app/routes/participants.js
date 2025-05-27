// app/routes/participants.js

const { getParticipant, sortBySurname, getParticipantClinicHistory } = require('../lib/utils/participants')
const { findById } = require('../lib/utils/arrays')

module.exports = router => {
// Set clinics to active in nav for all urls starting with /clinics
  router.use('/participants', (req, res, next) => {
    res.locals.navActive = 'participants'
    next()
  })

  const cleanSearchTerm = (term) => term.toLowerCase().replace(/\s+/g, '')

  // Redirect to default tab
  router.get('/participants', (req, res) => {
    const data = req.session.data
    const searchTerm = req.query.search?.trim() || ''
    const cleanedSearch = cleanSearchTerm(searchTerm)

    const allParticipants = sortBySurname(data.participants)
    let filteredParticipants = allParticipants

    if (searchTerm) {
      data.search = searchTerm
      res.locals.data.search = searchTerm

      filteredParticipants = allParticipants.filter(participant => {
        const info = participant.demographicInformation

        const nameVariations = [
          [info.firstName, info.middleName, info.lastName].filter(Boolean).join(' '),
           `${info.firstName} ${info.lastName}`,
        ].map(name => name.toLowerCase())

        const postcode = cleanSearchTerm(info.address.postcode)
        const nhsNumber = cleanSearchTerm(participant.medicalInformation.nhsNumber)
        const sxNumber = cleanSearchTerm(participant.sxNumber)

        const nameMatch = nameVariations.some(name =>
          name.includes(searchTerm.toLowerCase())
        )

        return nameMatch ||
                postcode.includes(cleanedSearch) ||
                nhsNumber.includes(cleanedSearch) ||
                sxNumber.includes(cleanedSearch)
      })
    }

    res.render('participants/index', {
      allParticipants,
      filteredParticipants,
      search: searchTerm,
      isFiltered: searchTerm.length > 0,
    })
  })

  // In the show route:
  router.get('/participants/:participantId', (req, res) => {
    const data = req.session.data
    const participantId = req.params.participantId
    const participant = getParticipant(data, participantId)

    if (!participant) {
      res.redirect('/participants')
      return
    }

    const clinicHistory = getParticipantClinicHistory(data, participant.id)

    res.render('participants/show', {
      participant,
      participantId,
      clinicHistory,
    })
  })
}
