import * as rollup from 'rollup'
import { promises as fs } from 'fs'
import express from 'express'
import Options from './Options'
import path from 'path'
import InputOptions from './InputOptions'
import OutputOptions from './OutputOptions'
import WatchOptions from './WatchOptions'
import { JSDOM } from 'jsdom'

export default async function main(options: Options): Promise<void> {
  const { input, external, plugins } = new InputOptions(options)
  const watcher = rollup.watch([
    {
      input,
      external,
      plugins,
      output: new OutputOptions(options),
      watch: new WatchOptions(options),
    },
  ])

  if (options.pkg.platform === 'browser') {
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

    const app = express()
    app.use(async (req, res, next) => {
      if (req.path.indexOf('.') > -1) return next()

      const indexHTMLPath = path.resolve(options.dir, './public/index.html')
      console.log(
        'read html file from: ',
        path.resolve(options.dir, './public/index.html')
      )
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
      const dom = new JSDOM(indexHTML, { runScripts: 'outside-only' })
      const { window } = dom
      window.eval(`
        const script = document.createElement('script')
        script.type = 'systemjs-importmap'
        script.src = '/importmap.json'
        document.body.appendChild(script)
      `)
      window.eval(`
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/systemjs@6.2.6/dist/system.js'
        document.body.appendChild(script)
      `)
      window.eval(`
        const script = document.createElement('script')
        script.type = 'systemjs-module'
        script.src = '/index.js'
        document.body.appendChild(script)
      `)

      res.send(dom.serialize())
    })

    app.use('/importmap.json', (req, res) => {
      res.json(options.importmap)
    })

    app.use(express.static(path.resolve(process.cwd(), './.cache')))
    app.use(express.static(path.resolve(process.cwd(), './public')))

    app.listen(3000, () => {
      console.log('node-ts-script listening on http://localhost:3000')
    })
  } else {
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
  }
}
