// app/lib/utils/dates.js

const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
const advancedFormat = require('dayjs/plugin/advancedFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isToday = require('dayjs/plugin/isToday');
const isTomorrow = require('dayjs/plugin/isTomorrow');
const isYesterday = require('dayjs/plugin/isYesterday');
const customParseFormat = require('dayjs/plugin/customParseFormat');

// Add plugins
dayjs.extend(relativeTime);
dayjs.extend(advancedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(customParseFormat);

// Set timezone to UK
dayjs.tz.setDefault('Europe/London');

/**
 * Format a date in UK format
 * @param {string} dateString - ISO date string
 * @param {string} format - Optional format string
 */
const formatDate = (dateString, format = 'D MMMM YYYY') => {
  if (!dateString) return '';
  return dayjs(dateString).format(format);
};

/**
 * Format a time in UK format
 * @param {string} dateString - ISO date string
 * @param {string} format - Optional format string
 */
const formatTime = (dateString, format = 'HH:mm') => {
  if (!dateString) return '';
  return dayjs(dateString).format(format);
};

/**
 * Format a date and time
 * @param {string} dateString - ISO date string
 * @param {string} format - Optional format string
 */
const formatDateTime = (dateString, format = 'D MMMM YYYY, HH:mm') => {
  if (!dateString) return '';
  return dayjs(dateString).format(format);
};

/**
 * Format a date as a relative time
 * @param {string} dateString - ISO date string
 * @param {boolean} withoutSuffix - If true, removes the 'ago' suffix
 */
const formatRelativeDate = (dateString, withoutSuffix = false) => {
  if (!dateString) return '';
  const date = dayjs(dateString);
  
  if (date.isToday()) return 'today';
  if (date.isTomorrow()) return 'tomorrow';
  if (date.isYesterday()) return 'yesterday';
  
  return date.fromNow(withoutSuffix);
};

/**
 * Check if date is in the past
 * @param {string} dateString - ISO date string
 */
const isPast = (dateString) => {
  if (!dateString) return false;
  return dayjs(dateString).isBefore(dayjs());
};

/**
 * Check if date is in the future
 * @param {string} dateString - ISO date string
 */
const isFuture = (dateString) => {
  if (!dateString) return false;
  return dayjs(dateString).isAfter(dayjs());
};

/**
 * Format a date range
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 */
const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  // If same day
  if (start.isSame(end, 'day')) {
    return `${start.format('D MMMM YYYY')}`;
  }
  
  // If same month
  if (start.isSame(end, 'month')) {
    return `${start.format('D')} - ${end.format('D MMMM YYYY')}`;
  }
  
  // If same year
  if (start.isSame(end, 'year')) {
    return `${start.format('D MMMM')} - ${end.format('D MMMM YYYY')}`;
  }
  
  // Different years
  return `${start.format('D MMMM YYYY')} - ${end.format('D MMMM YYYY')}`;
};

/**
 * Get calendar week dates
 * @param {string} dateString - ISO date string to center the week on
 * @returns {Array} Array of day objects for the week
 */
const getWeekDates = (dateString) => {
  const date = dateString ? dayjs(dateString) : dayjs();
  const startOfWeek = date.startOf('week');
  
  return Array.from({ length: 7 }, (_, i) => {
    const day = startOfWeek.add(i, 'day');
    return {
      date: day.toISOString(),
      dayName: day.format('dddd'),
      dayShort: day.format('ddd'),
      dayNumber: day.format('D'),
      isToday: day.isToday(),
      isPast: day.isBefore(dayjs(), 'day'),
      isFuture: day.isAfter(dayjs(), 'day')
    };
  });
};

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeDate,
  formatDateRange,
  isPast,
  isFuture,
  getWeekDates,
  // Export dayjs instance for direct use if needed
  dayjs
};
