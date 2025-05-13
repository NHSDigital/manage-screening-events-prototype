// app/routes/events.js
const dayjs = require('dayjs')

const { getFullName } = require('../lib/utils/participants')
const { generateMammogramImages } = require('../lib/generators/mammogram-generator')
const { getEvent, saveEventTempToEvent, updateEventStatus } = require('../lib/utils/event-data')

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

// // Update event status and add to history
// function updateEventStatus (event, newStatus) {
//   return {
//     ...event,
//     status: newStatus,
//     statusHistory: [
//       ...event.statusHistory,
//       {
//         status: newStatus,
//         timestamp: new Date().toISOString(),
//       },
//     ],
//   }
// }

module.exports = router => {

  // Set clinics to active in nav for all urls starting with /clinics
  router.use('/clinics/:clinicId/events/:eventId', (req, res, next) => {
    const eventId = req.params.eventId
    const clinicId = req.params.clinicId
    const eventData = getEventData(req.session.data, clinicId, eventId)
    const data = req.session.data

    if (!eventData) {
      console.log(`No event ${eventId} found for clinic ${clinicId}`)
      res.redirect('/clinics/' + clinicId)
      return
    }

    // Store a temporary copy of the event data in session
    // We'll read and write to this through the appointment
    if (!data.eventTemp || (data.eventTemp?.id !== eventId)) {
      if (!data.eventTemp) {
        console.log('No eventTemp data found, creating new one')
      }
      else if (data.eventTemp?.id !== eventId) {
        console.log(`EventTemp data found, but eventId ${data.eventTemp.id} does not match ${eventId}, creating new one`)
      }
      data.eventTemp = eventData.event
    }

    res.locals.eventData = eventData
    res.locals.clinic = eventData.clinic
    res.locals.event = eventData.event
    res.locals.participant = eventData.participant
    res.locals.unit = eventData.unit
    res.locals.clinicId = clinicId
    res.locals.eventId = eventId

    next()
  })

  // Main route in to starting an event - used to clear any temp data
  router.get('/clinics/:clinicId/events/:eventId/start', (req, res) => {
    delete req.session.data.eventTemp
    console.log('Cleared eventTemp data')
    res.redirect(`/clinics/${req.params.clinicId}/events/${req.params.eventId}`)
  })

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId', (req, res) => {
    res.render('events/show', {
    })
  })

  // Handle screening completion
  // Todo - name this route better
  router.post('/clinics/:clinicId/events/:eventId/can-appointment-go-ahead-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const canAppointmentGoAhead = data.eventTemp?.appointment?.canAppointmentGoAhead
    const event = getEvent(data, eventId)

    // No answer, return to page
    if (!canAppointmentGoAhead) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}`)
    }
    else if (canAppointmentGoAhead === 'yes') {

      // Check-in participant if they're not already checked in
      if (event?.status !== 'event_checked_in') {
        updateEventStatus(data, eventId, 'event_checked_in')
      }
      res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-information`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/attended-not-screened-reason`)
    }
  })

  // Main route in to starting an event - used to clear any temp data
  router.get('/clinics/:clinicId/events/:eventId/previous-mammograms/add', (req, res) => {
    delete req.session.data.eventTemp.previousMammogramTemp
    res.render('events/mammography/previous-mammograms/edit')
  })

  // Save data about a mammogram
  router.post('/clinics/:clinicId/events/:eventId/previous-mammograms-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const previousMammogram = data.eventTemp?.previousMammogramTemp
    delete data.eventTemp.previousMammogramTemp

    // Push to eventTemp.previousMammograms
    if (!data.eventTemp.previousMammograms) {
      data.eventTemp.previousMammograms = []
    }
    if (previousMammogram) {
      data.eventTemp.previousMammograms.push(previousMammogram)
    }

    res.redirect(`/clinics/${clinicId}/events/${eventId}`)

  })

  // Main route in to starting an event - used to clear any temp data
  router.get('/clinics/:clinicId/events/:eventId/medical-information/symptoms/add', (req, res) => {
    delete req.session.data.eventTemp.symptomsTemp
    res.redirect(`/clinics/${req.params.clinicId}/events/${req.params.eventId}/medical-information/symptoms/type`)
  })

  const MAMMOGRAPHY_VIEWS = [
    'medical-information',
    'record-medical-information',
    'ready-for-imaging',
    'awaiting-images',
    'images',
    'confirm',
    'screening-complete',
    'attended-not-screened-reason',
    'previous-mammograms/edit',
    'medical-information/symptoms/type',
    'medical-information/symptoms/details',
  ]

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId/*', (req, res, next) => {
    const view = req.params[0] // Gets the wildcard part

    if (MAMMOGRAPHY_VIEWS.some(viewPath => viewPath === view)) {
      res.render(`events/mammography/${view}`, {})
    } else {
      next()
    }
  })

  // Event within clinic context
  router.get('/clinics/:clinicId/events/:eventId/medical-information/:view', (req, res, next) => {
    res.render(`events/mammography/medical-information/${req.params.view}`, {})
  })

  // Specific route for imaging view
  router.get('/clinics/:clinicId/events/:eventId/imaging', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const eventData = getEventData(req.session.data, clinicId, eventId)

    // If no mammogram data exists, generate it
    if (!data?.eventTemp?.mammogramData) {
      // Set start time to 3 minutes ago to simulate an in-progress screening
      const startTime = dayjs().subtract(3, 'minutes').toDate()
      const mammogramData = generateMammogramImages({
        startTime,
        isSeedData: false,
        config: eventData?.participant?.config,
      })
      data.eventTemp.mammogramData = mammogramData
      res.locals.eventTemp = data.eventTemp
    }

    res.render('events/mammography/imaging', {})
  })


  // Handle medical information answer
  router.post('/clinics/:clinicId/events/:eventId/medical-information-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const hasRelevantMedicalInformation = data?.eventTemp?.medicalInformation?.hasRelevantMedicalInformation

    if (!hasRelevantMedicalInformation) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-information`)
    } else if (hasRelevantMedicalInformation === 'yes') {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/record-medical-information`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/awaiting-images`)
    }
  })

  // Handle record medical information answer
  router.post('/clinics/:clinicId/events/:eventId/record-medical-information-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const imagingCanProceed = data.eventTemp.appointment.imagingCanProceed

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
    const isPartialMammography = data.eventTemp.mammogramData.isPartialMammography

    if (!isPartialMammography) {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/imaging`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/confirm`)
    }
  })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/attended-not-screened-answer', (req, res) => {
    const { clinicId, eventId } = req.params

    const eventData = getEventData(req.session.data, clinicId, eventId)
    const participantName = getFullName(eventData.participant)
    const participantEventUrl = `/clinics/${clinicId}/events/${eventId}`

    const data = req.session.data
    const notScreenedReason = data.eventTemp.appointmentStopped.stoppedReason
    const needsReschedule = data.eventTemp.appointmentStopped.needsReschedule
    const otherReasonDetails = data.eventTemp.appointmentStopped.otherDetails
    const hasOtherReasonButNoDetails = notScreenedReason?.includes("other") && !otherReasonDetails

    if (!notScreenedReason || !needsReschedule || hasOtherReasonButNoDetails) {
      if (!notScreenedReason) {
        req.flash('error', {
          text: 'A reason for why this appointment cannot continue must be provided',
          name: 'eventTemp[appointmentStopped][stoppedReason]',
          href: '#stoppedReason-1'
        })

      }
      if (hasOtherReasonButNoDetails){
        req.flash('error', {
          text: 'Explain why this appointment cannot proceed',
          name: 'eventTemp[appointmentStopped][otherDetails]',
          href: '#otherDetails'
        })
      }
      if (!needsReschedule) {
        req.flash('error', {
          text: 'Select whether the participant needs to be invited for another appointment',
          name: 'eventTemp[appointmentStopped][needsReschedule]',
          href: '#needsReschedule-1'
        })
      }
      res.redirect(`/clinics/${clinicId}/events/${eventId}/attended-not-screened-reason`)
      return
    }

    saveEventTempToEvent(data)

    updateEventStatus(data, eventId, 'event_attended_not_screened')

    const successMessage = `
    ${participantName} has been is ‘attended not screened’. <a href="${participantEventUrl}" class="app-nowrap">View their appointment</a>`
    req.flash('success', { wrapWithHeading: successMessage})

    res.redirect(`/clinics/${clinicId}/`)
  })

  // Handle screening completion
  router.post('/clinics/:clinicId/events/:eventId/complete', (req, res) => {
    const { clinicId, eventId } = req.params

    const data = req.session.data
    const eventData = getEventData(req.session.data, clinicId, eventId)
    const participantName = getFullName(eventData.participant)
    const participantEventUrl = `/clinics/${clinicId}/events/${eventId}`

    saveEventTempToEvent(data)
    updateEventStatus(data, eventId, 'event_complete')

    // // Update event status to attended
    // const eventIndex = req.session.data.events.findIndex(e => e.id === eventId)
    // req.session.data.events[eventIndex] = updateEventStatus(
    //   req.session.data.events[eventIndex],
    //   'event_complete'
    // )

    // delete data.eventTemp

    const successMessage = `
    ${participantName} has been screened. <a href="${participantEventUrl}" class="app-nowrap">View their appointment</a>`

    req.flash('success', { wrapWithHeading: successMessage})

    res.redirect(`/clinics/${clinicId}`)

    // res.redirect(`/clinics/${clinicId}/events/${eventId}/screening-complete`)
  })

}
