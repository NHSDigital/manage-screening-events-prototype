// app/lib/utils/referrers.js

/**
 * Handle chained referrer URLs for back navigation
 * Allows deep linking while maintaining proper back navigation chains
 */

/**
 * Parse referrer string into array of URLs
 * @private
 * @param {string|Array} referrer - Referrer string or array
 * @returns {Array} Array of referrer URLs
 */
const parseReferrerChain = (referrer) => {
  if (!referrer) return []
  if (Array.isArray(referrer)) return referrer
  return referrer.split(',').filter(Boolean)
}

/**
 * Get destination from referrer chain, falling back to provided URL if no referrer
 * @param {string} url - Default URL to use if no referrer
 * @param {string} referrer - Referrer chain
 * @returns {string} URL to use for back link
 * @example
 * // In templates:
 * <a href="{{ '/default-path' | orReferrer(referrer) }}">Back</a>
 */
const orReferrer = function(url, referrer) {
  // Get currentUrl from context if available
  const currentUrl = this?.ctx?.currentUrl

  const chain = parseReferrerChain(referrer)
    .filter(ref => ref !== currentUrl)

  if (!chain.length) return url

  // For single referrer, return it directly
  if (chain.length === 1) return chain[0]

  // For multiple referrers, return last one with remaining chain as query param
  const remainingChain = chain.slice(0, -1)
  const destination = chain[chain.length - 1]

  return `${destination}?referrer=${remainingChain.join(',')}`
}

/**
 * Add referrer to URL as query parameter
 * @param {string} url - Base URL
 * @param {string} referrer - Referrer to append
 * @returns {string} URL with referrer query param
 * @example
 * // In templates:
 * <a href="{{ '/next-page' | withReferrer(referrer) }}">Continue</a>
 */
const withReferrer = (url, referrer) => {
  if (!referrer) return url
  return `${url}?referrer=${referrer}`
}

/**
 * Append a URL to an existing referrer chain
 * @param {string|Array} existingReferrer - Existing referrer chain
 * @param {string} newUrl - URL to append
 * @returns {string} Combined referrer chain
 * @example
 * // In templates:
 * {% set updatedReferrer = referrer | appendReferrer(currentUrl) %}
 */
const appendReferrer = (existingReferrer, newUrl) => {
  if (!newUrl) return existingReferrer
  if (!existingReferrer) return newUrl

  const chain = parseReferrerChain(existingReferrer)
  chain.push(newUrl)
  return chain.join(',')
}

module.exports = {
  orReferrer,
  withReferrer,
  appendReferrer,
}
