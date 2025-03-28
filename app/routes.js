// app/routes.js

// External dependencies
const express = require('express')
const { regenerateData, needsRegeneration } = require('./lib/utils/regenerate-data')
const { resetCallSequence } = require('./lib/utils/random')

const router = express.Router()

// Keep regeneration middleware before other routes
router.use(async (req, res, next) => {
  try {
    if (needsRegeneration(req.session.data?.generationInfo)) {
      console.log('Regenerating data for new day...')
      await regenerateData(req)
    }
    next()
  } catch (err) {
    console.error('Error checking/regenerating data:', err)
    next(err)
  }
})

// Reset randomisation per page load
router.use((req, res, next) => {
  resetCallSequence()
  next()
})

require('./routes/settings')(router)
require('./routes/clinics')(router)
require('./routes/participants')(router)
require('./routes/events')(router)
require('./routes/reading')(router)

// Add your routes here - above the module.exports line

module.exports = router
