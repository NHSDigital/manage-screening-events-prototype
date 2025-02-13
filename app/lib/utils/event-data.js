// app/lib/utils/event-data.js

const getEventData = (data, clinicId, eventId) => {
  const clinic = data.clinics.find(c => c.id === clinicId)
  if (!clinic) return null

  const event = data.events.find(e => e.id === eventId && e.clinicId === clinicId)
  if (!event) return null

  const participant = data.participants.find(p => p.id === event.participantId)
  const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId)

  return { clinic, event, participant, unit }
}


module.exports = {
  getEventData
}
