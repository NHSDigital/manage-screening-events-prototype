// app/filters/nunjucks.js

const log = (a, description = null) => {
  if (description) {
    description = `console.log("${description}:");`
  }
  return `<script>${description || ''}console.log(${JSON.stringify(a, null, '\t')});</script>`
}

/**
 * Get user name by user ID
 * @param {string} userId - ID of the user
 * @returns {string} User's name
 */
const getUsername = function(userId, options={}) {
  if (!userId) return '';

  const users = this.ctx.data.users;
  if (!users) return userId;

  const user = users.find(u => u.id === userId);
  if (!user) return userId;

  const currentUser = this.ctx.data.currentUser;
  if (options.identifyCurrentUser && user.id === currentUser.id) {
    return `${user.firstName} ${user.lastName} (you)`;
  }

  else return `${user.firstName} ${user.lastName}`;
}

module.exports = {
  log,
  getUsername,
}
