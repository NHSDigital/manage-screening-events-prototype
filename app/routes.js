// External dependencies
const express = require('express');

const router = express.Router();

require('./routes/clinics')(router);


// Add your routes here - above the module.exports line

module.exports = router;
