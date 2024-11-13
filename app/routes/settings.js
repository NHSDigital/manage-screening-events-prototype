// app/routes/settings.js

const generateData = require('../lib/generate-seed-data');
const dayjs = require('dayjs');
const path = require('path');
const fs = require('fs');

module.exports = router => {

// Handle regenerate data action
router.post('/settings/regenerate', async (req, res) => {
  try {
    await generateData();
    
    // Clear the require cache for session data defaults and generated data
    const sessionDataPath = path.resolve(__dirname, '../data/session-data-defaults.js');
    delete require.cache[require.resolve(sessionDataPath)];
    
    // Also clear cache for the generated JSON files
    const generatedDataPath = path.resolve(__dirname, '../data/generated');
    Object.keys(require.cache).forEach(key => {
      if (key.startsWith(generatedDataPath)) {
        delete require.cache[key];
      }
    });
    
    // Now reload session data defaults with fresh data
    req.session.data = require('../data/session-data-defaults');
    req.flash('success', 'Data regenerated successfully');
  } catch (err) {
    console.error('Error regenerating data:', err);
    req.flash('error', 'Error regenerating data');
  }
  
  res.redirect('/settings');
});

}
