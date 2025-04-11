// app/filters/nunjucks.js

const log = (a, description = null) => {
  if (description) {
    description = `console.log("${description}:");`
  }
  return `<script>${description || ''}console.log(${JSON.stringify(a, null, '\t')});</script>`
}

/**
 * Get user name by user ID with format options
 * @param {string} userId - ID of the user
 * @param {Object} options - Display options
 * @param {boolean} [options.identifyCurrentUser=false] - Whether to add "(you)" for current user
 * @param {string} [options.format='full'] - Name format: 'full', 'short', or 'initial'
 * @returns {string} User's name in requested format
 */
const getUsername = function(userId, options={}) {
  if (!userId) return '';

  const users = this.ctx.data.users;
  if (!users) return userId;

  const user = users.find(u => u.id === userId);
  if (!user) return userId;

  // Format options: full (default), short (initial + surname), initial (just initials)
  const format = options.format || 'full';

  let formattedName;
  switch (format) {
    case 'short':
      formattedName = `${user.firstName.charAt(0)}. ${user.lastName}`;
      break;
    case 'initial':
      formattedName = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
      break;
    case 'full':
    default:
      formattedName = `${user.firstName} ${user.lastName}`;
  }

  const currentUser = this.ctx.data.currentUser;
  if (options.identifyCurrentUser && user.id === currentUser.id) {
    return `${formattedName} (you)`;
  }

  return formattedName;
}

/**
 *
 * @returns {Object} The context data
 */
const getContext = function() {
  return this.ctx;
}

module.exports = {
  log,
  getUsername,
  getContext,
}
