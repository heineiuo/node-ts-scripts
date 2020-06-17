import * as rollup from 'rollup'
import express from 'express'
import cp from 'child_process'
import path from 'path'
import InputOptions from './InputOptions'
import OutputOptions from './OutputOptions'
import WatchOptions from './WatchOptions'
import cors from 'cors'
import { HTMLGenerator } from './HTMLGenerator'
import Options from './Options'
import { promises as fs } from 'fs'
import babel from '@babel/core'
import glob from 'glob'
import BabelOptions from './BabelOptions'
import { Transformer } from './Transformer'
// import { DtsBuilder } from './DtsBuilder'
import { DtsBundler } from './DtsBundler'

async function dts(options: Options): Promise<void> {
  // const builder = new DtsBuilder(options)
  // builder.build()
  try {
    console.log('Bundling dts files...')

    const bundler = new DtsBundler(options)
    await bundler.bundle()
    console.log('Bundling dts success')
  } catch (e) {
    console.log('Bundling dts fail, You can use "tsc" as fallback solution')
  }
}

// WIP
async function buildDir(options: Options): Promise<void> {
  const files = glob.sync(`${options.dir}/**/*`)
  const { babelrc, presets, plugins } = new BabelOptions(options)
  for (const file of files) {
    console.log(file + ':')

    const result = await babel.transformFileAsync(file, {
      babelrc,
      presets,
      plugins,
    })
    if (result) {
      const { code } = result
      console.log(code)
      break
    }
  }
}

async function buildHtml(options: Options): Promise<void> {
  const htmlGenerator = new HTMLGenerator(options)
  await fs.mkdir(path.resolve(options.dir, './build'), { recursive: true })
  await fs.writeFile(
    path.resolve(options.dir, './build/index.html'),
    await htmlGenerator.renderToString(),
    'utf8'
  )
  await fs.writeFile(
    path.resolve(options.dir, './build/importmap.json'),
    JSON.stringify(options.importmap),
    'utf8'
  )
  console.log('Build html files success')
}

async function bundle(options: Options): Promise<void> {
  const { input, plugins, external } = new InputOptions(options)
  const bundle = await rollup.rollup({ input, plugins, external })
  const { dir, format, name } = new OutputOptions(options)
  if (format === 'umd') {
    await bundle.write({ dir, format, name })
  } else {
    await bundle.write({ dir, format })
  }
  console.log('Bundle js success')
  if (options.argv.dts) {
    await dts(options)
  }
  if (options.platform === 'browser' && options.argv.html) {
    await buildHtml(options)
  }
  console.log('Bundle finished')
}

async function run(options: Options): Promise<void> {
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

  let tmpOutputFileName = path.basename(input)
  tmpOutputFileName = tmpOutputFileName.substr(
    0,
    tmpOutputFileName.length - path.extname(input).length
  )

  const htmlGenerator = new HTMLGenerator(options)

  console.log(`Platform: ${options.platform}`)
  if (options.platform === 'browser') {
    let code: string | null = null
    watcher.on('event', (event: any) => {
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

    app.use(cors())

    app.use('/importmap.json', (req, res) => {
      res.json(options.importmap)
    })

    app.use(
      '/systemjs',
      express.static(path.resolve(options.dir, './node_modules/systemjs'))
    )
    app.get('/', async (_, res) => {
      res.send(await htmlGenerator.renderToString())
    })
    app.use(express.static(path.resolve(process.cwd(), './.cache')))
    app.use(express.static(path.resolve(process.cwd(), './public')))

    app.use(async (_, res) => {
      res.send(await htmlGenerator.renderToString())
    })

    const port = options.env.PORT || 3000
    app.listen(port, () => {
      console.log(`node-ts-script listening on http://localhost:${port}`)
    })
  } else {
    let child: cp.ChildProcess | null = null
    watcher.on('event', (event) => {
      process.stdout.cursorTo(0)
      child?.kill()
      if (event.code === 'ERROR') {
        console.log(event.error)
      } else if (event.code === 'END') {
        child = cp.fork(path.resolve(dir, `${tmpOutputFileName}.js`), [], {
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

async function transform(options: Options): Promise<void> {
  const transformer = new Transformer(options)
  await transformer.transform(options.entryFile, options.output)
  console.log('transform success')
}

async function main(): Promise<void> {
  const options = await Options.from()

  if (options.command === 'run') {
    run(options)
    return
  }

  if (options.command === 'bundle') {
    bundle(options)
    return
  }

  if (options.command === 'transform') {
    transform(options)
    return
  }
}

main()
