'use strict'

const argv = require('yargs').argv
const shelljs = require('shelljs')
const findUp = require('find-up')
const path = require('path')
const fs = require('fs')
const devServer = require('./dev-server')
const build = require('./build')

async function main() {
  if (argv._.length === 0) {
    console.log('node-ts-scripts command: dev, build, eject')
    return
  }

  if (argv._[0] === 'eject') {
    const nodeModule = await findUp('node_modules', { type: 'directory' })
    const dir = path.dirname(nodeModule)
    shelljs.cp(
      path.resolve(__dirname, '../rollup.config.js'),
      path.resolve(dir, './rollup.config.js')
    )
    return
  }
  if (argv._[0] === 'dev') {
    const nodeModule = await findUp('node_modules', { type: 'directory' })
    const dir = path.dirname(nodeModule)
    shelljs.cd(dir)
    shelljs.exec(
      `NODE_ENV=development nodemon --ext js,mjs,json,ts,tsx --watch package.json --watch src --watch .env* --exec 'babel src -d build/debug --extensions \".ts\" && node -r dotenv/config build/debug'`
    )
    return
  }

  if (argv._[0] === 'dev-server') {
    devServer()
    return
  }

  if (argv._[0] === 'test') {
    const nodeModule = await findUp('node_modules', { type: 'directory' })
    const dir = path.dirname(nodeModule)
    shelljs.cd(dir)
    shelljs.exec(`jest ${process.argv.slice(2).join(` `)}`)
    return
  }

  if (argv._[0] === 'build') {
    build()
    return
  }
}

main()
