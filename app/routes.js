// External dependencies
const express = require('express');
const { regenerateData, needsRegeneration } = require('./lib/utils/regenerate-data');

const router = express.Router();

// Keep regeneration middleware before other routes
router.use(async (req, res, next) => {
  try {
    if (needsRegeneration(req.session.data?.generationInfo)) {
      console.log('Regenerating data for new day...');
      await regenerateData(req);
    }
    next();
  } catch (err) {
    console.error('Error checking/regenerating data:', err);
    next(err);
  }
});

require('./routes/settings')(router);
require('./routes/clinics')(router);


// Add your routes here - above the module.exports line

module.exports = router;
