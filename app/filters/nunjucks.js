// app/filters/nunjucks.js



const log = (a, description=false) => {

  if (description){
    description = `console.log("${description}:");`
  }
  return `<script>${description}console.log(${JSON.stringify(a, null, '\t')});</script>`
}

module.exports = {
  log
}
