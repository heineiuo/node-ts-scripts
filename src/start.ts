import * as rollup from 'rollup'
import { promises as fs } from 'fs'
import express from 'express'
import cp from 'child_process'
import Options from './Options'
import path from 'path'
import InputOptions from './InputOptions'
import OutputOptions from './OutputOptions'
import WatchOptions from './WatchOptions'
import { JSDOM } from 'jsdom'
import cors from 'cors'

export default async function main(options: Options): Promise<void> {
  const { input, external, plugins } = new InputOptions(options)
  const { dir, format } = new OutputOptions(options)
  const watcher = rollup.watch([
    {
      input,
      external,
      plugins,
      output: { dir, format },
      watch: new WatchOptions(options),
    },
  ])

  if (options.pkg.platform === 'browser') {
    let code: string | null = null
    watcher.on('event', event => {
      code = event.code
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
        script.src = '/systemjs/dist/system.js'
        document.body.appendChild(script)
      `)
      window.eval(`
        const script = document.createElement('script')
        script.src = '/systemjs/dist/extras/amd.js'
        document.body.appendChild(script)
      `)
      window.eval(`
        const script = document.createElement('script')
        script.src = '/systemjs/dist/extras/use-default.js'
        document.body.appendChild(script)
      `)
      window.eval(`
      const script = document.createElement('script')
      script.src = '/systemjs/dist/extras/named-exports.js'
      document.body.appendChild(script)
    `)
      window.eval(`
        const script = document.createElement('script')
        script.type = 'systemjs-module'
        script.src = '/index.js'
        document.body.appendChild(script)
      `)

      // if (code !== 'END') {
      //   window.eval(`
      //   const script = document.createElement('script')
      //   script.innerHTML = 'setInterval(location.reload, 1000)'
      //   document.body.appendChild(script)
      // `)
      // }

      res.send(dom.serialize())
    })

    app.use(cors())

    app.use('/importmap.json', (req, res) => {
      res.json(options.importmap)
    })

    app.use(
      '/systemjs',
      express.static(path.resolve(options.dir, './node_modules/systemjs'))
    )
    app.use(express.static(path.resolve(process.cwd(), './.cache')))
    app.use(express.static(path.resolve(process.cwd(), './public')))

    const port = options.env.PORT || 3000
    app.listen(port, () => {
      console.log(`node-ts-script listening on http://localhost:${port}`)
    })
  } else {
    let child: cp.ChildProcess | null = null
    watcher.on('event', event => {
      process.stdout.cursorTo(0)
      child?.kill()
      if (event.code === 'ERROR') {
        console.log(event.error)
      } else if (event.code === 'END') {
        child = cp.fork(path.resolve(options.dir, './.cache/index.js'), [], {
          cwd: options.dir,
        })
        process.stdout.write('Compiled success')
      } else {
        process.stdout.write('Compiling...')
      }
    })
  }
}
