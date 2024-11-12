// app/lib/utils/id-generator.js

// Create an alphabet of lowercase letters and numbers
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

const generateId = (length = 8) => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
};

module.exports = generateId;
