const users = require("./users")
const breastScreeningUnits = require("./breast-screening-units.js")



module.exports = {
  users,
  currentUser: users[0],
  breastScreeningUnits
}
