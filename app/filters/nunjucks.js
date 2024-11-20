// app/lib/utils/nunjucks.js

/**
 * Coerces a value to boolean, handling common web cases
 * @param {any} value - Value to convert to boolean
 * @returns {boolean} Coerced boolean value
 */
const falsify = (value) => {
  // Handle strings case-insensitively
  if (typeof value === 'string') {
    const normalised = value.trim().toLowerCase();
    
    // Explicit false values
    if (['false', 'no', 'off', '0', '', 'null', 'undefined'].includes(normalised)) {
      return false;
    }
    
    // Explicit true values
    if (['true', 'yes', 'on', '1'].includes(normalised)) {
      return true;
    }
  }
  
  // Handle numbers
  if (typeof value === 'number') {
    return value !== 0;
  }
  
  // Use JavaScript's standard boolean coercion for other cases
  return Boolean(value);
};

module.exports = {
  falsify
};
