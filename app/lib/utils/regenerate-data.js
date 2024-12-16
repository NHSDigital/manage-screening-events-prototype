// app/lib/utils/regenerate-data.js

const generateData = require('../generate-seed-data')
const path = require('path')
const dayjs = require('dayjs')
const fs = require('fs')

async function regenerateData (req) {
  // Generate new data
  await generateData()

  // Clear the require cache for session data defaults
  const sessionDataPath = path.resolve(__dirname, '../../data/session-data-defaults.js')
  delete require.cache[require.resolve(sessionDataPath)]

  // Clear cache for the generated JSON files
  const generatedDataPath = path.resolve(__dirname, '../../data/generated')
  Object.keys(require.cache).forEach(key => {
    if (key.startsWith(generatedDataPath)) {
      delete require.cache[key]
    }
  })

  // Read generation info including stats
  const generationInfoPath = path.join(generatedDataPath, 'generation-info.json')
  let generationInfo = {
    generatedAt: new Date().toISOString(),
    stats: { participants: 0, clinics: 0, events: 0 },
  }

  try {
    if (fs.existsSync(generationInfoPath)) {
      generationInfo = JSON.parse(fs.readFileSync(generationInfoPath))
    }
  } catch (err) {
    console.warn('Error reading generation info:', err)
  }

  // Reload session data defaults with fresh data and updated generation info
  req.session.data = {
    ...require('../../data/session-data-defaults'),
    generationInfo,
  }
}

function needsRegeneration (generationInfo) {
  if (!generationInfo?.generatedAt) return true

  const generatedDate = dayjs(generationInfo.generatedAt).startOf('day')
  const today = dayjs().startOf('day')
  return !generatedDate.isSame(today, 'day')
}

module.exports = {
  regenerateData,
  needsRegeneration,
}
