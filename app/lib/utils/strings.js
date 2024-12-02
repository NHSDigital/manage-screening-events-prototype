// app/lib/utils/strings.js

/**
 * Convert string to sentence case
 * @param {string} input - String to convert
 * @returns {string} Sentence case string
 */
const sentenceCase = (input) => {
  if (!input) return '';
  if (typeof input !== 'string') return input;
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
};

/**
 * Convert string to start with lowercase
 * @param {string} input - String to convert
 * @returns {string} String starting with lowercase
 */
const startLowerCase = (input) => {
  if (!input) return '';
  if (typeof input !== 'string') return input;
  return input.charAt(0).toLowerCase() + input.slice(1);
};

/**
 * Separate words with hyphens
 * @param {string} input - String to convert
 * @returns {string} Hyphen-separated string
 */
const kebabCase = (input) => {
  if (!input) return '';
  return input.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
};

/**
 * Create URL-friendly slug from string
 * @param {string} input - String to convert
 * @returns {string} URL-safe slug
 */
const slugify = (input) => {
  if (!input) return '';
  return input.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Split a string using a separator
 * @param {string} input - String to split
 * @param {string} separator - Separator to split on
 * @returns {Array} Array of split strings
 */
const split = (input, separator) => {
  if (!input || typeof input !== 'string') return [];
  return input.split(separator);
};

/**
 * Add appropriate indefinite article (a/an) before a word
 * @param {string} input - Word to prefix
 * @returns {string} Word with appropriate article
 */
const addIndefiniteArticle = (input) => {
  if (!input) return '';
  return /^[aeiou]/i.test(input) ? `an ${input}` : `a ${input}`;
};

/**
 * Make a string possessive
 * @param {string} input - String to make possessive
 * @returns {string} Possessive form of string
 */
const possessive = (input) => {
  if (!input) return '';
  const isAllUpperCase = input === input.toUpperCase();
  const endsInS = /s$/i.test(input);

  if (endsInS) {
    return `${input}'`;
  }
  if (isAllUpperCase) {
    return `${input}'S`;
  }
  return `${input}'s`;
};

/**
 * Pad a number with leading zeros
 * @param {number|string} input - Number to pad
 * @param {number} length - Desired length
 * @returns {string} Padded number
 */
const padDigits = (input, length) => {
  if (!input) return '';
  return input.toString().padStart(length, '0');
};

/**
 * Format number as currency with thousands separators
 * @param {number} input - Number to format
 * @returns {string} Formatted currency string
 */
const formatCurrency = (input) => {
  if (!input) return '–';
  const value = parseInt(input, 10);
  const formatted = Math.abs(value).toLocaleString();
  return value < 0 ? `–£${formatted}` : `£${formatted}`;
};

/**
 * Format number as currency without separators (for CSV)
 * @param {number} input - Number to format
 * @returns {string} Formatted currency string
 */
const formatCurrencyForCsv = (input) => {
  if (!input) return '0';
  const value = parseInt(input, 10);
  return value < 0 ? `-£${Math.abs(value)}` : `£${value}`;
};

/**
 * Check if string starts with target
 * @param {string} input - String to check
 * @param {string} target - String to look for at start
 * @returns {boolean} Whether string starts with target
 */
const startsWith = (input, target) => {
  if (typeof input !== 'string') return false;
  return input.startsWith(target);
};

/**
 * Check if value is a string
 * @param {any} input - Value to check
 * @returns {boolean} Whether value is a string
 */
const isString = (input) => {
  return typeof input === 'string';
};


/**
 * Format separated words as a sentence
 * Example: 'in_progress' becomes 'In progress'
 * @param {string} input - String to format
 * @param {string} [separator='_'] - Character that separates words
 * @returns {string} Formatted string as words
 */
const formatWords = (input, separator = '_') => {
  if (!input) return '';
  if (typeof input !== 'string') return input;
  
  return input
    .split(separator)
    .map(word => word.toLowerCase())
    .join(' ')
    // .replace(/^./, firstChar => firstChar.toUpperCase());
};

/**
 * Support for template literals in Nunjucks
 * Usage: {{ 'The count is ${count}' | stringLiteral }}
 * @param {string} str - Template string
 * @returns {string} Processed string with variables replaced
 */
const stringLiteral = function(str) {
  return (new Function('with (this) { return `' + str + '` }')).call(this.ctx);
};

/**
 * Wrap string in a no-wrap span
 * @param {string} input - String to wrap
 * @returns {string} HTML string with no-wrap class
 */
const noWrap = (input) => {
  if (!input) return '';
  return `<span class="app-nowrap">${input}</span>`;
};

/**
 * Wrap string in a no-wrap span
 * @param {string} input - String to wrap
 * @returns {string} HTML string with no-wrap class
 */
const asHint = (input) => {
  if (!input) return '';
  return `<span class="app-text-grey">${input}</span>`;
};

/**
 * Format phone number for display with spaces
 * @param {string} phoneNumber - Raw phone number string
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  if (typeof phoneNumber !== 'string') return phoneNumber;

  if (phoneNumber.startsWith('07')) {
    return `${phoneNumber.slice(0, 5)} ${phoneNumber.slice(5)}`;
  }

  return `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4, 7)} ${phoneNumber.slice(7)}`;
};

/**
 * Format NHS number with spaces (3-3-4 format)
 * @param {string|number} input - NHS number to format
 * @returns {string} Formatted NHS number or original input if invalid
 */
const formatNhsNumber = (input) => {
  if (!input) return '';
  const nhsStr = input.toString().replace(/\s/g, '');
  
  if (!/^\d{10}$/.test(nhsStr)) {
    return input;
  }

  return `${nhsStr.slice(0,3)} ${nhsStr.slice(3,6)} ${nhsStr.slice(6)}`;
};

// Example usage:
// formatNhsNumber('4857773456') // returns '485 777 3456'
// formatNhsNumber(4857773456)   // returns '485 777 3456'
// formatNhsNumber('485 777 3456') // returns '485 777 3456'

module.exports = {
  addIndefiniteArticle,
  formatCurrency,
  formatCurrencyForCsv,
  formatNhsNumber,
  formatWords,
  isString,
  kebabCase,
  noWrap,
  asHint,
  padDigits,
  possessive,
  sentenceCase,
  slugify,
  split,
  startLowerCase,
  startsWith,
  stringLiteral,
  formatPhoneNumber,
};
