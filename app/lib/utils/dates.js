// app/lib/utils/dates.js

const dayjs = require('dayjs')
const relativeTime = require('dayjs/plugin/relativeTime')
const advancedFormat = require('dayjs/plugin/advancedFormat')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const isToday = require('dayjs/plugin/isToday')
const isTomorrow = require('dayjs/plugin/isTomorrow')
const isYesterday = require('dayjs/plugin/isYesterday')
const customParseFormat = require('dayjs/plugin/customParseFormat')

// Add plugins
dayjs.extend(relativeTime)
dayjs.extend(advancedFormat)
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(isToday)
dayjs.extend(isTomorrow)
dayjs.extend(isYesterday)
dayjs.extend(customParseFormat)

// Set timezone to UK
dayjs.tz.setDefault('Europe/London')

/**
 * Format a date in UK format
 * @param {string} dateString - ISO date string
 * @param {string} format - Optional format string
 */
const formatDate = (dateString, format = 'D MMMM YYYY') => {
  if (!dateString) return ''
  return dayjs(dateString).format(format)
}

/**
 * Format a date in UK format with special month abbreviations
 * For months with 4 letters (June, July), use the full name
 * For other months, use 3 letter abbreviation
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
const formatDateShort = (dateString) => {
  if (!dateString) return ''

  const date = dayjs(dateString)
  const monthFormat = ['June', 'July'].includes(date.format('MMMM')) ? 'MMMM' : 'MMM'

  return `${date.format('D')} ${date.format(monthFormat)} ${date.format('YYYY')}`
}

/**
 * Format a time in UK format
 * @param {string} dateString - ISO date string
 * @param {string} format - Optional format string
 */
const formatTime = (dateString, format = 'H:mm') => {
  if (!dateString) return ''
  return dayjs(dateString).format(format)
}

/**
 * Format a time in 12-hour format with special cases for round hours, midday and midnight
 * @param {string} input - Either a time string (e.g. "17:00") or full date/datetime
 * @returns {string} Formatted time (e.g. "5pm", "5:30pm", "midday", "midnight")
 */
const formatTimeString = (input) => {
  if (!input) return ''

  // If it looks like just a time (contains no date), prefix with dummy date
  const datetime = input.includes('T') || input.includes('-')
    ? input
    : `2000-01-01T${input}`

  const time = dayjs(datetime)
  const hour = time.hour()
  const minute = time.minute()

  // Handle special cases
  if (minute === 0) {
    if (hour === 0) return 'midnight'
    if (hour === 12) return 'midday'
    return `${time.format('h')}${time.format('a')}`
  }

  // For non-zero minutes, return full format
  return time.format('h:mma')
}

/**
 * Format clinic session times for display
 * @param {Object} sessionTimes - Object containing startTime and endTime
 * @returns {string} Formatted time range (e.g. "9:00am - 5:00pm")
 */
const formatTimeRange = (times) => {
  if (!times?.startTime || !times?.endTime) return ''
  return `${formatTimeString(times.startTime)} to ${formatTimeString(times.endTime)}`
}

/**
 * Format a date and time
 * @param {string} dateString - ISO date string
 * @param {string} format - Optional format string
 */
const formatDateTime = (dateString, format = 'D MMMM YYYY, HH:mm') => {
  if (!dateString) return ''
  return dayjs(dateString).format(format)
}

/**
 * Format a date as a relative time
 * @param {string} dateString - ISO date string
 * @param {boolean} withoutSuffix - If true, removes the 'ago' suffix
 */
const formatRelativeDate = (dateString, withoutSuffix = false) => {
  if (!dateString) return ''
  const date = dayjs(dateString).startOf('day')
  const now = dayjs().startOf('day')

  if (date.isToday()) return 'today'
  if (date.isTomorrow()) return 'tomorrow'
  if (date.isYesterday()) return 'yesterday'

  // Calculate days difference for near dates
  const daysDiff = date.diff(now, 'day')
  if (daysDiff > 0 && daysDiff <= 6) {
    return `in ${daysDiff} day${daysDiff > 1 ? 's' : ''}`
  }
  if (daysDiff < 0 && daysDiff >= -6) {
    return `${Math.abs(daysDiff)} day${Math.abs(daysDiff) > 1 ? 's' : ''} ago`
  }

  return date.fromNow(withoutSuffix)
}

/**
 * Calculate the number of days since a given date
 * @param {string} dateString - ISO date string for past date
 * @param {string|dayjs} [compareDate=null] - Optional reference date (defaults to today)
 * @returns {number} Number of days since the date (positive integer for past dates)
 */
const daysSince = (dateString, compareDate = null) => {
  if (!dateString) return 0

  const date = dayjs(dateString).startOf('day')
  const reference = compareDate ? dayjs(compareDate).startOf('day') : dayjs().startOf('day')

  // Return positive number for days in the past
  return reference.diff(date, 'day')
}

/**
 * Check if date is in the past
 * @param {string} dateString - ISO date string
 */
const isPast = (dateString) => {
  if (!dateString) return false
  return dayjs(dateString).isBefore(dayjs(), 'day')
}

/**
 * Check if date is in the future
 * @param {string} dateString - ISO date string
 */
const isFuture = (dateString) => {
  if (!dateString) return false
  return dayjs(dateString).isAfter(dayjs())
}

/**
* Check if a date is before another date (at day precision)
* @param {string} inputDate - ISO date string to check
* @param {string|dayjs} compareDate - Optional date to compare against (defaults to today)
* @returns {boolean} True if inputDate is before compareDate
*/
const isBeforeDate = (inputDate, compareDate = dayjs()) => {
  if (!inputDate) return false
  return dayjs(inputDate).isBefore(dayjs(compareDate), 'day')
}

/**
* Check if a date is after another date (at day precision)
* @param {string} inputDate - ISO date string to check
* @param {string|dayjs} compareDate - Optional date to compare against (defaults to today)
* @returns {boolean} True if inputDate is after compareDate
*/
const isAfterDate = (inputDate, compareDate = dayjs()) => {
  if (!inputDate) return false
  return dayjs(inputDate).isAfter(dayjs(compareDate), 'day')
}

/**
* Get today's date at midnight
* @returns {string} Today's date as ISO string
*/
const today = () => {
  return dayjs().startOf('day').toISOString()
}

/**
 * Get current date and time
 * @returns {string} Current date/time as ISO string
 */
const now = () => {
  return dayjs().toISOString()
}

/**
 * Format a date range
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 */
const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return ''

  const start = dayjs(startDate)
  const end = dayjs(endDate)

  // If same day
  if (start.isSame(end, 'day')) {
    return `${start.format('D MMMM YYYY')}`
  }

  // If same month
  if (start.isSame(end, 'month')) {
    return `${start.format('D')} - ${end.format('D MMMM YYYY')}`
  }

  // If same year
  if (start.isSame(end, 'year')) {
    return `${start.format('D MMMM')} - ${end.format('D MMMM YYYY')}`
  }

  // Different years
  return `${start.format('D MMMM YYYY')} - ${end.format('D MMMM YYYY')}`
}

/**
 * Get calendar week dates
 * @param {string} dateString - ISO date string to center the week on
 * @returns {Array} Array of day objects for the week
 */
const getWeekDates = (dateString) => {
  const date = dateString ? dayjs(dateString) : dayjs()
  const startOfWeek = date.startOf('week')

  return Array.from({ length: 7 }, (_, i) => {
    const day = startOfWeek.add(i, 'day')
    return {
      date: day.toISOString(),
      dayName: day.format('dddd'),
      dayShort: day.format('ddd'),
      dayNumber: day.format('D'),
      isToday: day.isToday(),
      isPast: day.isBefore(dayjs(), 'day'),
      isFuture: day.isAfter(dayjs(), 'day'),
    }
  })
}

/**
 * Check if a date is within specified age range
 * @param {string} dateString - ISO date string to check
 * @param {number} minDays - Minimum days old (inclusive)
 * @param {number} [maxDays=null] - Maximum days old (inclusive), if null, no upper bound
 * @param {string|dayjs} [compareDate=null] - Optional reference date (defaults to today)
 * @returns {boolean} True if date is within specified age range
 */
const isWithinDayRange = (dateString, minDays, maxDays = null, compareDate = null) => {
  if (!dateString) return false

  const date = dayjs(dateString).startOf('day')
  const reference = compareDate ? dayjs(compareDate).startOf('day') : dayjs().startOf('day')

  // Calculate days difference
  const daysDifference = reference.diff(date, 'day')

  // Check if within range
  const isOlderThanMin = daysDifference >= minDays
  const isYoungerThanMax = maxDays === null || daysDifference <= maxDays

  return isOlderThanMin && isYoungerThanMax
}

module.exports = {
  formatDate,
  formatDateShort,
  formatTime,
  formatTimeString,
  formatTimeRange,
  formatDateTime,
  formatRelativeDate,
  formatDateRange,
  isPast,
  isFuture,
  isBeforeDate,
  isAfterDate,
  today,
  now,
  getWeekDates,
  // Export dayjs instance for direct use if needed
  dayjs,
  daysSince,
  isWithinDayRange,
}
