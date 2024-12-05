// app/filters/nunjucks.js



const log = (a, description=null) => {

  if (description){
    description = `console.log("${description}:");`
  }
  return `<script>${description ? description : ""}console.log(${JSON.stringify(a, null, '\t')});</script>`
}

module.exports = {
  log
}
