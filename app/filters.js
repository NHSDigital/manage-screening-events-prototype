const fs = require('fs');
const path = require('path');

module.exports = function (env) { /* eslint-disable-line func-names,no-unused-vars */
  /**
   * Instantiate object used to store the methods registered as a
   * 'filter' (of the same name) within nunjucks. You can override
   * gov.uk core filters by creating filter methods of the same name.
   * @type {Object}
   */
  const filters = {};

  // Get all files from utils directory
  const utilsPath = path.join(__dirname, 'lib/utils');
  
  try {
    // Read all files in the utils directory
    const files = fs.readdirSync(utilsPath);

    files.forEach(file => {
      // Only process .js files
      if (path.extname(file) === '.js') {
        // Get the utils module
        const utils = require(path.join(utilsPath, file));
        
        // Add each exported function as a filter
        Object.entries(utils).forEach(([name, func]) => {
          // Only add if it's a function
          if (typeof func === 'function') {
            filters[name] = func;
          }
        });
      }
    });
  } catch (err) {
    console.warn('Error loading filters from utils:', err);
  }


  return filters;
};
