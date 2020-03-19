'use strict'

const rollup = require('rollup')
const commonjs = require('@rollup/plugin-commonjs')
const json = require('@rollup/plugin-json')
const resolve = require('@rollup/plugin-node-resolve')
const reolace = require('@rollup/plugin-replace')
const image = require('@rollup/plugin-image')
const babel = require('rollup-plugin-babel')
const minify = require('rollup-plugin-babel-minify')
const generatePackageJson = require('rollup-plugin-generate-package-json')
const builtins = require('builtin-modules')
const fs = require('fs').promises
const express = require('express')
const Options = require('./Options')
const path = require('path')
const css = require('@modular-css/rollup')

function filterbuiltins(options, builtins) {
  return builtins.filter(item => {
    if (options.pkg.dependencies) {
      if (options.pkg.dependencies.hasOwnProperty(item)) return false
    }
    if (options.pkg.devDependencies) {
      if (options.pkg.devDependencies.hasOwnProperty(item)) return false
    }
    return true
  })
}

/**
 *
 * @param {Options} options
 */
async function createInputOptions(options) {
  const { dir, pkg } = options
  const extensions = ['.js', '.jsx', '.ts', '.tsx']
  const inputOptions = {
    input: 'src/index',
    external: [
      ...filterbuiltins(options, builtins),
      ...Object.keys(pkg.externalDependencies || {}),
      ...Object.keys(options.importmap.imports),
    ],
    plugins: [
      css({ styleExport: true }),
      image(),
      json({
        include: ['src/**', 'node_modules/**'],
        preferConst: true,
        indent: '  ',
        compact: true,
        namedExports: true,
      }),
      reolace({
        'process.env.NODE_ENV': JSON.stringify('development'),
      }),
      resolve({
        extensions,
        preferBuiltins: true,
      }),
      commonjs({
        include: 'node_modules/**',
        ignoreGlobal: false,
        sourceMap: false,
        namedExports: {},
      }),
      babel({
        babelrc: false,
        presets: [
          ['@babel/preset-typescript'],
          ['@babel/preset-react'],
          [
            '@babel/preset-env',
            {
              loose: true,
              useBuiltIns: false,
              targets: {
                node: 'current',
              },
            },
          ],
        ],
        plugins: [
          '@babel/plugin-proposal-optional-chaining',
          '@babel/plugin-syntax-bigint',
          '@babel/plugin-proposal-class-properties',
        ],
        extensions,
        include: ['src/**/*'],
        exclude: 'node_modules/**',
      }),
    ],
  }

  return inputOptions
}

async function createWatchOptions() {
  return {
    // chokidar,
    // clearScreen,
    exclude: 'node_modules/**',
    include: 'src/**',
  }
}

async function createOutputOptions(options) {
  return {
    dir: path.resolve(options.dir, './.cache'),
    // file: "build/index.js",
    format: options.format,
  }
}

async function main() {
  const app = express()
  const options = await Options.from()
  const watcher = rollup.watch({
    ...(await createInputOptions(options)),
    output: [await createOutputOptions(options)],
    watch: createWatchOptions(options),
  })

  watcher.on('event', event => {
    process.stdout.cursorTo(0)
    if (event.code === 'ERROR') {
      console.log(event.error)
    } else if (event.code === 'END') {
      process.stdout.write('Compiled success')
    } else {
      process.stdout.write('Compiling...')
    }
  })

  app.use(async (req, res, next) => {
    if (req.path.indexOf('.') > -1) return next()

    const indexHTMLPath = path.resolve(options.dir, './public/index.html')
    let indexHTML = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>node ts scripts</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
     </head>
    <body>
      <div id="app"></div>
    </body>
    </html>`
    try {
      indexHTML = await fs.readFile(indexHTMLPath, 'utf8')
    } catch (e) {}
    res.send(indexHTML)
  })

  app.use('/importmap.json', (req, res, next) => {
    res.json(options.importmap)
  })

  app.use(express.static(path.resolve(process.cwd(), './.cache')))
  app.use(express.static(path.resolve(process.cwd(), './public')))

  app.listen(3000, () => {
    console.log('node-ts-script listening on http://localhost:3000')
  })
}

module.exports = main
