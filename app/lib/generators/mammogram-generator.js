// app/lib/generators/mammogram-generator.js

const { faker } = require('@faker-js/faker')
const generateId = require('../utils/id-generator')
const dayjs = require('dayjs')
const weighted = require('weighted')

const STANDARD_VIEWS = [
  { side: 'right', view: 'mediolateral oblique' },
  { side: 'right', view: 'craniocaudal' },
  { side: 'left', view: 'craniocaudal' },
  { side: 'left', view: 'mediolateral oblique' }
]

const REPEAT_REASONS = [
  'patient movement',
  'positioning issue',
  'exposure issue',
  'blurred image',
  'technical fault'
]

// Default probability settings
const DEFAULT_PROBABILITIES = {
  viewMissing: 0.05, // 5% chance of a view being missing
  needsRepeat: 0.15 // 15% chance of one view needing a repeat
}

const generateViewKey = (side, view) => {
  const prefix = side === 'right' ? 'right' : 'left'
  const viewName = view === 'mediolateral oblique' ? 'MediolateralOblique' : 'Craniocaudal'
  return `${prefix}${viewName}`
}

const generateImageUrl = (side, view, accessionNumber) => {
  const sideCode = side === 'right' ? 'R' : 'L'
  const viewCode = view === 'mediolateral oblique' ? 'MLO' : 'CC'
  return `/images/mammograms/${sideCode}-${viewCode}-${accessionNumber.replace('/', '-')}.dcm`
}

/**
 * Generate images for a single view
 * @param {Object} params - Parameters for image generation
 * @param {string} params.side - Breast side ('right' or 'left')
 * @param {string} params.view - View type ('mediolateral oblique' or 'craniocaudal')
 * @param {string} params.accessionBase - Base accession number
 * @param {number} params.startIndex - Starting index for image numbering
 * @param {string} params.startTime - Start timestamp
 * @param {boolean} params.isSeedData - Whether generating seed data
 * @param {boolean} [params.needsRepeat] - Force this view to be repeated
 * @returns {Object} View data with images
 */
const generateViewImages = ({ side, view, accessionBase, startIndex, startTime, isSeedData, needsRepeat = false }) => {
  let currentIndex = startIndex
  let currentTime = dayjs(startTime)
  const images = []

  // Generate initial image
  images.push({
    timestamp: currentTime.toISOString(),
    accessionNumber: `${accessionBase}/${currentIndex}`,
    url: generateImageUrl(side, view, `${accessionBase}/${currentIndex}`)
  })

  // Generate repeat if needed
  if (needsRepeat) {
    currentIndex++
    currentTime = currentTime.add(faker.number.int({ min: 25, max: 50 }), 'seconds')

    images.push({
      timestamp: currentTime.toISOString(),
      accessionNumber: `${accessionBase}/${currentIndex}`,
      url: generateImageUrl(side, view, `${accessionBase}/${currentIndex}`)
    })
  }

  return {
    side,
    view,
    viewShort: view === 'mediolateral oblique' ? 'MLO' : 'CC',
    viewShortWithSide: `${side === 'right' ? 'R' : 'L'}${view === 'mediolateral oblique' ? 'MLO' : 'CC'}`,
    images,
    isRepeat: needsRepeat && isSeedData,
    repeatReason: needsRepeat && isSeedData ? faker.helpers.arrayElement(REPEAT_REASONS) : null
  }
}

/**
 * Generate a complete set of mammogram images
 * @param {Object} options - Generation options
 * @param {Date|string} [options.startTime] - Starting timestamp (defaults to now)
 * @param {boolean} [options.isSeedData=false] - Whether generating seed data
 * @param {Object} [options.config] - Optional configuration for specific scenarios
 * @param {string} [options.config.repeatView] - Force a specific view to be repeated (e.g. 'RMLO')
 * @param {string[]} [options.config.missingViews] - Array of views to omit (e.g. ['RMLO'])
 * @param {Object} [options.probabilities] - Override default probabilities
 * @returns {Object} Complete mammogram data
 */
const generateMammogramImages = ({
  startTime = new Date(),
  isSeedData = false,
  config = {},
  probabilities = DEFAULT_PROBABILITIES
} = {}) => {
  const accessionBase = faker.number.int({ min: 100000000, max: 999999999 }).toString()
  let currentIndex = 1
  let currentTime = dayjs(startTime)
  const views = {}

  // Determine which view gets repeated (if any)
  let viewToRepeat = null
  if (config.repeatView) {
    viewToRepeat = config.repeatView
  } else if (Math.random() < probabilities.needsRepeat) {
    viewToRepeat = faker.helpers.arrayElement(['RMLO', 'RCC', 'LCC', 'LMLO'])
  }

  // Generate each standard view
  STANDARD_VIEWS.forEach(({ side, view }) => {
    const viewKey = generateViewKey(side, view)
    const viewShortWithSide = `${side === 'right' ? 'R' : 'L'}${view === 'mediolateral oblique' ? 'MLO' : 'CC'}`

    // Skip if this view is in missingViews config
    if (config.missingViews?.includes(viewShortWithSide) ||
        (!config.missingViews && Math.random() < probabilities.viewMissing)) {
      return
    }

    const viewData = generateViewImages({
      side,
      view,
      accessionBase,
      startIndex: currentIndex,
      startTime: currentTime.toISOString(),
      isSeedData,
      needsRepeat: viewToRepeat === viewShortWithSide
    })

    views[viewKey] = viewData

    // Update counters for next view
    currentIndex += viewData.images.length
    currentTime = currentTime.add(faker.number.int({ min: 45, max: 70 }), 'seconds')
  })

  // Calculate metadata
  const totalImages = Object.values(views).reduce((sum, view) => sum + view.images.length, 0)
  const allTimestamps = Object.values(views)
    .flatMap(view => view.images.map(img => img.timestamp))
    .sort()

  return {
    accessionBase,
    views,
    metadata: {
      totalImages,
      standardViewsCompleted: Object.keys(views).length === 4,
      startTime: allTimestamps[0],
      endTime: allTimestamps[allTimestamps.length - 1]
    }
  }
}

module.exports = {
  generateMammogramImages,
  STANDARD_VIEWS,
  REPEAT_REASONS
}