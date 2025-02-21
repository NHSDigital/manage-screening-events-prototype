// app/lib/utils/event-data.js

const getEventData = (data, clinicId, eventId) => {
  const clinic = data.clinics.find(c => c.id === clinicId)
  if (!clinic) return null

  const event = data.events.find(e => e.id === eventId && e.clinicId === clinicId)
  if (!event) return null

  const participant = data.participants.find(p => p.id === event.participantId)
  const unit = data.breastScreeningUnits.find(u => u.id === clinic.breastScreeningUnitId)
  const location = unit.locations.find(l => l.id === clinic.locationId)

  return { clinic, event, participant,location, unit }
}


module.exports = {
  getEventData
}
