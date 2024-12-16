// app/lib/generators/clinic-generator.js

const { faker } = require('@faker-js/faker')
const generateId = require('../utils/id-generator')
const dayjs = require('dayjs')
const weighted = require('weighted')
const config = require('../../config')

const determineclinicType = (location, breastScreeningUnit) => {
  // First check location-specific service types
  const clinicTypes = location.clinicTypes || breastScreeningUnit.clinicTypes

  // If still no service types, default to screening
  if (!clinicTypes) {
    return 'screening'
  }

  // If location/BSU only supports one service type, use that
  if (clinicTypes.length === 1) {
    return clinicTypes[0]
  }

  // For locations that can do both, weight towards screening
  return weighted.select({
    screening: 0.8,
    assessment: 0.2,
  })
}

const generateTimeSlots = (date, sessionTimes, clinicType) => {
  const { slotDurationMinutes } = config.clinics
  const today = dayjs().startOf('day')
  const clinicDate = dayjs(date).startOf('day')
  const isToday = clinicDate.isSame(today)

  const slots = []
  const startTime = new Date(`${date.toISOString().split('T')[0]}T${sessionTimes.startTime}`)
  const endTime = new Date(`${date.toISOString().split('T')[0]}T${sessionTimes.endTime}`)

  const currentTime = new Date(startTime)

  // Calculate how many slots should be double-booked
  const totalSlots = Math.floor((endTime - startTime) / (slotDurationMinutes * 60000))
  let doubleBookedSlotsNeeded = 0

  // Screening clinics can be 'smart' - allows for some overbooking
  // Scope to 'today' only to limit the number for prototype performance
  if (isToday && clinicType === 'screening') {
    const targetBookingPercent = config.clinics.targetBookingPercent
    const extraBookingsNeeded = Math.ceil((targetBookingPercent - 100) * totalSlots / 100)
    doubleBookedSlotsNeeded = extraBookingsNeeded
  }

  // Create array of indices that will be double-booked
  const doubleBookedSlotIndices = new Set()
  while (doubleBookedSlotIndices.size < doubleBookedSlotsNeeded) {
    const randomIndex = Math.floor(Math.random() * totalSlots)
    doubleBookedSlotIndices.add(randomIndex)
  }

  // eslint-disable-next-line no-unmodified-loop-condition
  let slotIndex = 0
  while (currentTime < endTime) {
    const slotId = generateId()
    const slotStartTime = new Date(currentTime)
    const slotEndTime = new Date(currentTime)
    slotEndTime.setMinutes(slotEndTime.getMinutes() + slotDurationMinutes)

    // Determine if this slot should be double-booked
    const capacity = doubleBookedSlotIndices.has(slotIndex) ? 2 : 1

    slots.push({
      id: slotId,
      dateTime: slotStartTime.toISOString(),
      endDateTime: slotEndTime.toISOString(),
      duration: slotDurationMinutes,
      type: clinicType,
      capacity,
      bookedCount: 0,
      period: `${sessionTimes.startTime}-${sessionTimes.endTime}`,
    })
    currentTime.setMinutes(currentTime.getMinutes() + slotDurationMinutes)
    slotIndex++
  }
  return slots
}

const determineClinicStatus = (date) => {
  const now = dayjs()
  const clinicDate = dayjs(date).startOf('day')
  const today = now.startOf('day')

  if (clinicDate.isBefore(today)) {
    return 'closed'
  }
  if (clinicDate.isAfter(today)) {
    return 'scheduled'
  }
  return 'in_progress' // it's today
}

const generateMobileSiteName = () => {
  const sites = [
    'Tesco Extra Banbury',
    'Witney Community Hospital',
    'Thame Community Hospital',
    'Bicester Community Hospital',
    "Sainsbury's Kidlington",
    'Carterton Health Centre',
    'Wantage Community Hospital',
    'Tesco Faringdon',
    'Didcot Civic Hall',
    'Chipping Norton Health Centre',
  ]

  return faker.helpers.arrayElement(sites)
}

const determineSessionType = (sessionTimes) => {
  const startHour = parseInt(sessionTimes.startTime.split(':')[0], 10)
  const endHour = parseInt(sessionTimes.endTime.split(':')[0], 10)

  // If clinic spans 6 or more hours, consider it all day
  const duration = endHour - startHour
  if (duration >= 6) {
    return 'all day'
  }

  // For shorter sessions, determine morning or afternoon based on start time
  return startHour < 12 ? 'morning' : 'afternoon'
}

const generateClinic = (date, location, breastScreeningUnit, sessionTimes) => {
  const clinicType = determineclinicType(location, breastScreeningUnit)
  const slots = generateTimeSlots(date, sessionTimes, clinicType)

  // Check if clinic is for today
  const today = dayjs().startOf('day')
  const clinicDate = dayjs(date).startOf('day')
  const isToday = clinicDate.isSame(today)

  // Calculate total slots based on capacity
  const totalSlots = slots.length * (isToday && clinicType !== 'assessment' ? 2 : 1)

  return {
    id: generateId(),
    date: date.toISOString().split('T')[0],
    breastScreeningUnitId: breastScreeningUnit.id,
    locationType: location.type,
    clinicType,
    locationId: location.id,
    siteName: location.type === 'mobile_unit' ? generateMobileSiteName() : null,
    slots,
    status: determineClinicStatus(date),
    staffing: {
      mammographers: [],
      radiologists: [],
      support: [],
    },
    targetCapacity: {
      bookingPercent: clinicType === 'assessment' ? 100 : config.clinics.targetBookingPercent,
      attendancePercent: clinicType === 'assessment' ? 95 : config.clinics.targetAttendancePercent,
      totalSlots,
    },
    notes: null,
    sessionTimes,
    sessionType: determineSessionType(sessionTimes),
  }
}

const generateClinicsForBSU = ({ date, breastScreeningUnit }) => {
  // Each location has an 95% chance of running clinics on any given day
  const selectedLocations = breastScreeningUnit.locations.filter(() => Math.random() < 0.95)

  // Generate clinics for each selected location
  return selectedLocations.flatMap(location => {
    // Use location-specific patterns if available, otherwise use BSU patterns
    const sessionPatterns = location.sessionPatterns || breastScreeningUnit.sessionPatterns

    // Randomly select a pattern
    const selectedPattern = faker.helpers.arrayElement(sessionPatterns)

    if (selectedPattern.type === 'single') {
      // For single sessions, create one clinic
      return [generateClinic(date, location, breastScreeningUnit, selectedPattern.sessions[0])]
    } else {
      // For paired sessions, create two clinics
      return selectedPattern.sessions.map(sessionTimes =>
        generateClinic(date, location, breastScreeningUnit, sessionTimes)
      )
    }
  })
}

module.exports = {
  generateClinicsForBSU,
}
