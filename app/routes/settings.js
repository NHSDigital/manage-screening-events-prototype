// app/routes/settings.js

const path = require('path')
const { regenerateData } = require('../lib/utils/regenerate-data')

module.exports = router => {
  // Handle regenerate data action
  router.post('/settings/regenerate', async (req, res) => {
    try {
      await regenerateData(req)
      req.flash('success', 'Data regenerated successfully')
    } catch (err) {
      console.error('Error regenerating data:', err)
      req.flash('error', 'Error regenerating data')
    }
    res.redirect('/settings')
  })

  // Handle clear data action
  router.get('/clear-data', async (req, res) => {
    console.log('Clearing session data')

    // Clear the require cache for session data defaults
    const sessionDataPath = path.resolve(__dirname, '../data/session-data-defaults.js')
    delete require.cache[require.resolve(sessionDataPath)]

    // Clear cache for the generated JSON files
    const generatedDataPath = path.resolve(__dirname, '../data/generated')
    Object.keys(require.cache).forEach(key => {
      if (key.startsWith(generatedDataPath)) {
        delete require.cache[key]
      }
    })

    // Load fresh session defaults after clearing cache
    req.session.data = require(sessionDataPath)
    req.flash('success', 'Session data cleared')

    if (req.headers['accept'] === 'application/json') {
      return res.json({ success: true })
    }

    res.redirect('/settings')
  })
}
