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
import * as ts from 'typescript'
import { Transformer } from './Transformer'

async function dts(options: Options): Promise<void> {
  console.log('Compiling dts files...')
  const files = glob.sync(`${options.dir}/src/**/*`)
  const compilerOptions = {
    target: ts.ScriptTarget.ES5,
    lib: ['dom', 'dom.iterable', 'esnext'],
    allowJs: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: false,
    emitDeclarationOnly: true,
    declaration: true,
    jsx: ts.JsxEmit.Preserve,
    outDir: path.resolve(options.dir, './build'),
    declarationDir: path.resolve(options.dir, './build'),
  } as ts.CompilerOptions

  const program = ts.createProgram(files, compilerOptions)
  program.emit()
  console.log('Compiled dts success')
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
  await bundle.write({ dir, format, name })
  await dts(options)
  console.log('Build success')
  if (options.platform === 'browser') {
    await buildHtml(options)
    console.log('Build html success')
  }
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
    app.use(async (req, res, next) => {
      if (req.path.indexOf('.') > -1) return next()
      res.send(await htmlGenerator.renderToString())
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
