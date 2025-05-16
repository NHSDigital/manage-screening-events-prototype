// app/routes/events.js
const dayjs = require('dayjs')

const { getFullName } = require('../lib/utils/participants')
const { generateMammogramImages } = require('../lib/generators/mammogram-generator')
const { getEvent, saveTempEventToEvent, updateEventStatus } = require('../lib/utils/event-data')
const generateId = require('../lib/utils/id-generator')

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
    const originalEventData = getEventData(req.session.data, clinicId, eventId)
    const data = req.session.data

    if (!originalEventData) {
      console.log(`No event ${eventId} found for clinic ${clinicId}`)
      res.redirect('/clinics/' + clinicId)
      return
    }

    // We store a temporary copy of the event to session for use by forms
    // If it doens't exist, create it now
    if (!data.event || (data.event?.id !== eventId)) {
      if (!data.event) {
        console.log('No temp event data found, creating new one')
      }
      else if (data.event?.id !== eventId) {
        console.log(`Temp event data found, but eventId ${data.event.id} does not match ${eventId}, creating new one`)
      }
      // Copy over the event data to the temp event
      data.event = originalEventData.event
    }

    // This will now have any temp event data that forms have added too
    // We'll later save this back to the source data
    res.locals.event = data.event

    res.locals.eventData = originalEventData
    res.locals.clinic = originalEventData.clinic

    res.locals.participant = originalEventData.participant
    res.locals.unit = originalEventData.unit
    res.locals.clinicId = clinicId
    res.locals.eventId = eventId

    next()
  })

  // Main route in to starting an event - used to clear any temp data
  // Possibly not needed as if the ID doesn't match our use route would reset this - but this could
  // be used to reset a patient back to defaults
  router.get('/clinics/:clinicId/events/:eventId/start', (req, res) => {
    // Explicitly delete the temp event data
    // On next request this will be recreated from the event array
    delete req.session.data.event
    console.log('Cleared temp event data')
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
    const canAppointmentGoAhead = data.event?.appointment?.canAppointmentGoAhead
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
    delete req.session.data?.event?.previousMammogramTemp
    res.render('events/mammography/previous-mammograms/edit')
  })

  // Save data about a mammogram
  router.post('/clinics/:clinicId/events/:eventId/previous-mammograms-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const previousMammogram = data.event?.previousMammogramTemp
    delete data.event?.previousMammogramTemp

    // Push to event.previousMammograms
    if (!data.event.previousMammograms) {
      data.event.previousMammograms = []
    }
    if (previousMammogram) {
      data.event.previousMammograms.push(previousMammogram)
    }

    res.redirect(`/clinics/${clinicId}/events/${eventId}`)

  })

  // Save symptom - handles both 'save' and 'save and add another' with data cleanup
  router.post('/clinics/:clinicId/events/:eventId/medical-information/symptoms/save', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const action = req.body.action // 'save' or 'save-and-add'

    // Save temp symptom to array
    if (data.event?.symptomTemp) {
      if (!data.event.symptoms) {
        data.event.symptoms = []
      }

      const symptomTemp = data.event.symptomTemp
      const symptomType = symptomTemp.type

      // Start with base symptom data
      const symptom = {
        id: symptomTemp.id || generateId(),
        type: symptomType,
        isOngoing: symptomTemp.isOngoing,
        hasBeenInvestigated: symptomTemp.hasBeenInvestigated,
        additionalInfo: symptomTemp.additionalInfo
      }

      // Add investigation details if investigated
      if (symptomTemp.hasBeenInvestigated === 'yes') {
        symptom.investigatedDescription = symptomTemp.investigatedDescription
      }

      // Handle dates - combine ongoing/not ongoing into single approxStartDate
      if (symptomTemp.isOngoing === 'yes' && symptomTemp.ongoingStartDate) {
        symptom.approxStartDate = symptomTemp.ongoingStartDate
      } else if (symptomTemp.isOngoing === 'no') {
        if (symptomTemp.notOngoingStartDate) {
          symptom.approxStartDate = symptomTemp.notOngoingStartDate
        }
        if (symptomTemp.approxEndDate) {
          symptom.approxEndDate = symptomTemp.approxEndDate
        }
      }

      // Handle type-specific fields
      if (symptomType === 'Other') {
        symptom.otherDescription = symptomTemp.otherDescription
        // Add location for Other symptoms
        if (symptomTemp.location) {
          symptom.location = symptomTemp.location
          if (symptomTemp.location === 'other') {
            symptom.otherLocationDescription = symptomTemp.otherDescription
          }
        }
      } else if (symptomType === 'Nipple change') {
        symptom.nippleChangeType = symptomTemp.nippleChangeType
        symptom.nippleChangeLocation = symptomTemp.nippleChangeLocation
        if (symptomTemp.nippleChangeType === 'other') {
          symptom.nippleChangeDescription = symptomTemp.nippleChangeDescription
        }
      } else if (symptomType === 'Skin change') {
        symptom.skinChangeType = symptomTemp.skinChangeType
        symptom.location = symptomTemp.location
        if (symptomTemp.skinChangeType === 'other') {
          symptom.skinChangeDescription = symptomTemp.skinChangeDescription
        }
        // Add location descriptions
        if (symptomTemp.location === 'rightBreast') {
          symptom.rightBreastDescription = symptomTemp.rightBreastDescription
        } else if (symptomTemp.location === 'leftBreast') {
          symptom.leftBreastDescription = symptomTemp.leftBreastDescription
        } else if (symptomTemp.location === 'bothBreasts') {
          symptom.bothBreastsDescription = symptomTemp.bothBreastsDescription
        } else if (symptomTemp.location === 'other') {
          symptom.otherLocationDescription = symptomTemp.otherDescription
        }
      } else {
        // For other symptom types (Breast lump, Swelling, Persistent pain)
        symptom.location = symptomTemp.location
        // Add location descriptions
        if (symptomTemp.location === 'rightBreast') {
          symptom.rightBreastDescription = symptomTemp.rightBreastDescription
        } else if (symptomTemp.location === 'leftBreast') {
          symptom.leftBreastDescription = symptomTemp.leftBreastDescription
        } else if (symptomTemp.location === 'bothBreasts') {
          symptom.bothBreastsDescription = symptomTemp.bothBreastsDescription
        } else if (symptomTemp.location === 'other') {
          symptom.otherLocationDescription = symptomTemp.otherDescription
        }
      }

      // Update existing or add new
      const existingIndex = data.event.symptoms.findIndex(s => s.id === symptom.id)
      if (existingIndex !== -1) {
        data.event.symptoms[existingIndex] = symptom
      } else {
        data.event.symptoms.push(symptom)
      }

      delete data.event.symptomTemp
    }

    // Redirect based on action
    if (action === 'save-and-add') {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-information/symptoms/add`)
    } else {
      res.redirect(`/clinics/${clinicId}/events/${eventId}/record-medical-information`)
    }
  })

  // Edit existing symptom
  router.get('/clinics/:clinicId/events/:eventId/medical-information/symptoms/edit/:symptomId', (req, res) => {
    const { clinicId, eventId, symptomId } = req.params
    const data = req.session.data

    // Load symptom into temp for editing
    const symptom = data.event?.symptoms?.find(s => s.id === symptomId)
    if (symptom) {
      data.event.symptomTemp = { ...symptom }
    }

    // Go directly to details page since we already know the type
    res.redirect(`/clinics/${clinicId}/events/${eventId}/medical-information/symptoms/details`)
  })

  // Delete symptom
  router.get('/clinics/:clinicId/events/:eventId/medical-information/symptoms/delete/:symptomId', (req, res) => {
    const { clinicId, eventId, symptomId } = req.params
    const data = req.session.data

    // Remove symptom from array
    if (data.event?.symptoms) {
      data.event.symptoms = data.event.symptoms.filter(s => s.id !== symptomId)
    }

    req.flash('success', 'Symptom deleted')

    res.redirect(`/clinics/${clinicId}/events/${eventId}/record-medical-information`)
  })

  // Main route in to starting an event - used to clear any temp data
  router.get('/clinics/:clinicId/events/:eventId/medical-information/symptoms/add', (req, res) => {
    delete req.session.data.event.symptomTemp
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
    if (!data?.event?.mammogramData) {
      // Set start time to 3 minutes ago to simulate an in-progress screening
      const startTime = dayjs().subtract(3, 'minutes').toDate()
      const mammogramData = generateMammogramImages({
        startTime,
        isSeedData: false,
        config: eventData?.participant?.config,
      })
      data.event.mammogramData = mammogramData
      res.locals.event = data.event
    }

    res.render('events/mammography/imaging', {})
  })


  // Handle medical information answer
  router.post('/clinics/:clinicId/events/:eventId/medical-information-answer', (req, res) => {
    const { clinicId, eventId } = req.params
    const data = req.session.data
    const hasRelevantMedicalInformation = data?.event?.medicalInformation?.hasRelevantMedicalInformation

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
    const imagingCanProceed = data.event.appointment.imagingCanProceed

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
    const isPartialMammography = data.event.mammogramData.isPartialMammography

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
    const notScreenedReason = data.event.appointmentStopped.stoppedReason
    const needsReschedule = data.event.appointmentStopped.needsReschedule
    const otherReasonDetails = data.event.appointmentStopped.otherDetails
    const hasOtherReasonButNoDetails = notScreenedReason?.includes("other") && !otherReasonDetails

    if (!notScreenedReason || !needsReschedule || hasOtherReasonButNoDetails) {
      if (!notScreenedReason) {
        req.flash('error', {
          text: 'A reason for why this appointment cannot continue must be provided',
          name: 'event[appointmentStopped][stoppedReason]',
          href: '#stoppedReason-1'
        })

      }
      if (hasOtherReasonButNoDetails){
        req.flash('error', {
          text: 'Explain why this appointment cannot proceed',
          name: 'event[appointmentStopped][otherDetails]',
          href: '#otherDetails'
        })
      }
      if (!needsReschedule) {
        req.flash('error', {
          text: 'Select whether the participant needs to be invited for another appointment',
          name: 'event[appointmentStopped][needsReschedule]',
          href: '#needsReschedule-1'
        })
      }
      res.redirect(`/clinics/${clinicId}/events/${eventId}/attended-not-screened-reason`)
      return
    }

    saveTempEventToEvent(data)

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

    saveTempEventToEvent(data)
    updateEventStatus(data, eventId, 'event_complete')

    const successMessage = `
    ${participantName} has been screened. <a href="${participantEventUrl}" class="app-nowrap">View their appointment</a>`

    req.flash('success', { wrapWithHeading: successMessage})

    res.redirect(`/clinics/${clinicId}`)

    // res.redirect(`/clinics/${clinicId}/events/${eventId}/screening-complete`)
  })

}
