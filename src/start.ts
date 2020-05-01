import * as rollup from 'rollup'
import express from 'express'
import cp from 'child_process'
import Options from './Options'
import path from 'path'
import InputOptions from './InputOptions'
import OutputOptions from './OutputOptions'
import WatchOptions from './WatchOptions'
import cors from 'cors'
import { HTMLGenerator } from './HTMLGenerator'

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
  const htmlGenerator = new HTMLGenerator(options)

  await htmlGenerator.load()

  if (options.pkg.platform === 'browser') {
    let code: string | null = null
    watcher.on('event', (event: rollup.RollupWatcherEvent) => {
      code = event.code
      process.stdout.cursorTo(0)
      if (code === 'ERROR') {
        console.log(event.error)
      } else if (code === 'END') {
        process.stdout.write('Compiled success')
      } else {
        process.stdout.write('Compiling...')
      }
    })

    const app = express()
    app.use(async (req, res, next) => {
      if (req.path.indexOf('.') > -1) return next()
      res.send(htmlGenerator.toString())
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
          env: options.env,
          cwd: options.dir,
        })
        process.stdout.write('Compiled success')
      } else {
        process.stdout.write('Compiling...')
      }
    })
  }
}
