module.exports = (config) => (req, res, next) => {
  res.locals.serviceName = config.serviceName
  res.locals.url = req.path
  res.locals.flash = req.flash()
  res.locals.query = req.query
  next()
}
