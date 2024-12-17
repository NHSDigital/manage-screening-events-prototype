// app/lib/generate-seed-data.js

// to run: node app/lib/generate-seed-data.js
// can also be run from ui at localhost:3000/settings

const dayjs = require('dayjs')
const fs = require('fs')
const path = require('path')
const config = require('../config')

const { generateParticipant } = require('./generators/participant-generator')
const { generateClinicsForBSU } = require('./generators/clinic-generator')
const { generateEvent } = require('./generators/event-generator')

// Load existing data
const breastScreeningUnits = require('../data/breast-screening-units')
const ethnicities = require('../data/ethnicities')

// Hardcoded scenarios for user research
const testScenarios = require('../data/test-scenarios')

// Find a slot  near a target time
// Used by test scenarios so we can populate a slot at a given time
const findNearestSlot = (slots, targetTime) => {
  if (!targetTime) return null

  const [targetHour, targetMinute] = targetTime.split(':').map(Number)
  const targetMinutes = targetHour * 60 + targetMinute

  return slots.reduce((nearest, slot) => {
    const slotTime = dayjs(slot.dateTime)
    const slotMinutes = slotTime.hour() * 60 + slotTime.minute()
    
    if (!nearest) return slot

    const currentDiff = Math.abs(targetMinutes - slotMinutes)
    const nearestDiff = Math.abs(
      targetMinutes - 
      (dayjs(nearest.dateTime).hour() * 60 + dayjs(nearest.dateTime).minute())
    )

    return currentDiff < nearestDiff ? slot : nearest
  }, null)
}

const generateClinicsForDay = (date, allParticipants, unit) => {
  const clinics = []
  const events = []
  const usedParticipantsInSnapshot = new Set()
  const participants = [...allParticipants]

  // Check if this snapshot date is for the recent period (not historical)
  const isRecentSnapshot = dayjs(date).isAfter(dayjs().subtract(1, 'month'))

  // Only look for test scenarios in recent snapshots
  const testScenariosForDay = isRecentSnapshot 
    ? testScenarios.filter(scenario => {
        const targetDate = dayjs().startOf('day').add(scenario.scheduling.whenRelativeToToday, 'day')
        return targetDate.isSame(dayjs(date).startOf('day'), 'day')
      })
    : []

  // Pre-filter eligible participants once
  const clinicDate = dayjs(date)
  const eligibleParticipants = participants.filter(p => {
    const age = clinicDate.diff(dayjs(p.demographicInformation.dateOfBirth), 'year')
    return age >= 50 && age <= 70
  })

  // Generate clinics for this day
  const newClinics = generateClinicsForBSU({
    date: date.toDate(),
    breastScreeningUnit: unit,
  })

  // For test scenarios, only use first clinic of the day
  if (testScenariosForDay.length > 0 && newClinics.length > 0) {
    const firstClinic = newClinics[0]
    
    testScenariosForDay.forEach(scenario => {
      const participant = participants.find(p => p.id === scenario.participant.id)
      if (!participant) return

      const slot = scenario.scheduling.slotIndex !== undefined
        ? firstClinic.slots[scenario.scheduling.slotIndex]
        : findNearestSlot(firstClinic.slots, scenario.scheduling.approximateTime)

      if (!slot) {
        console.log(`Warning: Could not find suitable slot for test participant ${participant.id}`)
        return
      }

      const event = generateEvent({
        slot,
        participant,
        clinic: firstClinic,
        outcomeWeights: config.screening.outcomes[firstClinic.clinicType],
        forceStatus: scenario.scheduling.status,
      })

      events.push(event)
      usedParticipantsInSnapshot.add(participant.id)
    })
  }

  // Handle regular clinic slot allocation for all clinics
  newClinics.forEach(clinic => {
    // Continue with random slot allocation as before
    const remainingSlots = clinic.slots
      .filter(() => Math.random() < config.generation.bookingProbability)
      // Filter out slots used by test participants
      .filter(slot => !events.some(e => e.slotId === slot.id))

    remainingSlots.forEach(slot => {
      // Filter from pre-filtered eligible participants
      const availableParticipants = eligibleParticipants.filter(p =>
        !usedParticipantsInSnapshot.has(p.id)
      )

      // If we need more participants, create them
      if (availableParticipants.length === 0) {
        const newParticipant = generateParticipant({
          ethnicities,
          breastScreeningUnits: [unit],
        })
        participants.push(newParticipant)
        availableParticipants.push(newParticipant)
      }

      for (let i = 0; i < slot.capacity; i++) {
        if (availableParticipants.length === 0) break
        const randomIndex = Math.floor(Math.random() * availableParticipants.length)
        const participant = availableParticipants[randomIndex]

        const event = generateEvent({
          slot,
          participant,
          clinic,
          outcomeWeights: config.screening.outcomes[clinic.clinicType],
        })

        events.push(event)
        usedParticipantsInSnapshot.add(participant.id)
        availableParticipants.splice(randomIndex, 1)
      }
    })

    clinics.push(clinic)
  })

  return {
    clinics,
    events,
    newParticipants: participants.slice(allParticipants.length),
  }
}

const generateData = async () => {
  if (!fs.existsSync(config.paths.generatedData)) {
    fs.mkdirSync(config.paths.generatedData, { recursive: true })
  }

  // Create test participants first, using generateParticipant but with overrides
  console.log('Generating test scenario participants...')
  const testParticipants = testScenarios.map(scenario => {
    return generateParticipant({
      ethnicities,
      breastScreeningUnits,
      overrides: scenario.participant,
    })
  })

  console.log('Generating random participants...')
  const randomParticipants = Array.from(
    { length: config.generation.numberOfParticipants },
    () => generateParticipant({ ethnicities, breastScreeningUnits })
  )

  // Combine test and random participants
  const participants = [...testParticipants, ...randomParticipants]

  console.log('Generating clinics and events...')
  const today = dayjs().startOf('day')

  // Helper function to generate multiple days from a start date
  const generateDayRange = (startDate, numberOfDays) => {
    return Array.from(
      { length: numberOfDays },
      (_, i) => dayjs(startDate).add(i, 'days')
    )
  }

  // Generate days for each historical period
  const historicalSnapshots = [
    ...generateDayRange(today.subtract(9, 'year').add(3, 'month'), config.clinics.daysToGenerate),
    ...generateDayRange(today.subtract(6, 'year').add(2, 'month'), config.clinics.daysToGenerate),
    ...generateDayRange(today.subtract(3, 'year').add(1, 'month'), config.clinics.daysToGenerate),
  ]

  // Generate recent days
  const recentSnapshots = generateDayRange(
    today.subtract(config.clinics.daysBeforeToday, 'days'),
    config.clinics.daysToGenerate
  )

  const snapshots = [...historicalSnapshots, ...recentSnapshots]

  // Generate all data in batches per BSU
  const allData = breastScreeningUnits.map(unit => {
    const unitSnapshots = snapshots.map(date => generateClinicsForDay(date, participants, unit))
    return {
      clinics: [].concat(...unitSnapshots.map(s => s.clinics)),
      events: [].concat(...unitSnapshots.map(s => s.events)),
      newParticipants: [].concat(...unitSnapshots.map(s => s.newParticipants)),
    }
  })

  // Combine all data
  const allClinics = [].concat(...allData.map(d => d.clinics))
  const allEvents = [].concat(...allData.map(d => d.events))
  const allNewParticipants = [].concat(...allData.map(d => d.newParticipants))

  // Combine initial and new participants
  const finalParticipants = [...participants, ...allNewParticipants]

  // Sort events by start time within each clinic
  const sortedEvents = allEvents.sort((a, b) => {
    // First sort by clinic ID to group events together
    if (a.clinicId !== b.clinicId) {
      return a.clinicId.localeCompare(b.clinicId)
    }
    // Then by start time within each clinic
    return new Date(a.timing.startTime) - new Date(b.timing.startTime)
  })


  // breastScreeningUnits.forEach(unit => {
  //   snapshots.forEach(date => {
  //     const { clinics, events, newParticipants } = generateSnapshot(date, participants, unit);
  //     allClinics.push(...clinics);
  //     allEvents.push(...events);
  //     participants = [...participants, ...newParticipants];
  //   });
  // });

  const writeData = (filename, data) => {
    fs.writeFileSync(
      path.join(config.paths.generatedData, filename),
      JSON.stringify(data, null, 2)
    )
  }

  writeData('participants.json', { participants: finalParticipants })
  writeData('clinics.json', {
    clinics: allClinics.map(clinic => ({
      ...clinic,
      slots: clinic.slots.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)),
    })),
  })
  writeData('events.json', { events: sortedEvents })
  writeData('generation-info.json', {
    generatedAt: new Date().toISOString(),
    stats: {
      participants: finalParticipants.length,
      clinics: allClinics.length,
      events: allEvents.length,
    },
  })

  console.log('\nData generation complete!')
  console.log('Generated:')
  console.log(`- ${participants.length} participants`)
  console.log(`- ${allClinics.length} clinics`)
  console.log(`- ${allEvents.length} events`)
}

// Export the function instead of running it immediately
module.exports = generateData

// Only run if this file is being run directly
if (require.main === module) {
  generateData().catch(console.error)
}
