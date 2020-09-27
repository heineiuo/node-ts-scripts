import * as rollup from 'rollup'
import express from 'express'
import cp from 'child_process'
import path from 'path'
import cors from 'cors'
import { HTMLGenerator } from './HTMLGenerator'
import Options from './Options'
import { promises as fs } from 'fs'
import babel from '@babel/core'
import glob from 'glob'
import { Transformer } from './Transformer'
// import { DtsBuilder } from './DtsBuilder'
import { DtsBundler } from './DtsBundler'
import { argv } from 'yargs'
import dotenv from 'dotenv'
import findUp from 'find-up'

export class Scheduler {
  async ok(): Promise<void> {
    const options = await this.createOptions()
    this.options = options
  }

  async loadEnv(
    dir: string,
    command: string
  ): Promise<{ [x: string]: string }> {
    if (!process.env.NODE_ENV) {
      if (
        command === 'build' ||
        command === 'bundle' ||
        command === 'build-html'
      ) {
        process.env.NODE_ENV = 'production'
      } else {
        process.env.NODE_ENV = 'development'
      }
    }

    const env: { [x: string]: string } = {
      PORT: '3000',
    }
    const envfiles = [
      `.env.${process.env.NODE_ENV}`,
      `.env.${process.env.NODE_ENV}.local`,
    ]
    for (const envfile of envfiles) {
      try {
        Object.assign(
          env,
          dotenv.parse(await fs.readFile(path.resolve(dir, envfile)))
        )
      } catch (e) {}
    }
    Object.assign(env, process.env)
    return env
  }

  async createOptions(): Promise<Options> {
    if (argv._.length === 0) {
      throw new Error('node-ts-scripts command: run, bundle')
    }

    if (argv._.length === 1) {
      throw new Error('node-ts-scripts: need an entry file')
    }
    const command = argv._[0]
    let entryFile = argv._[1]

    let workDir = process.cwd()
    if (argv.workDir) {
      workDir = path.resolve(workDir, argv.workDir as string)
    }

    entryFile = path.resolve(workDir, entryFile)

    const pkgFile = findUp.sync('package.json', { cwd: workDir })
    if (!pkgFile) {
      throw new Error('node-ts-scripts: could not find package.json')
    }
    const pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'))
    const env = await this.loadEnv(workDir, command)

    const opt = {
      command,
      argv,
      entryFile,
      dir: workDir,
      pkg,
      env,
    }

    return new Options(opt)
  }

  options: Options

  async runCommand(): Promise<void> {
    await this.ok()

    if (this.options.command === 'run') {
      this.run()
      return
    }

    if (this.options.command === 'bundle') {
      this.bundle()
      return
    }

    if (this.options.command === 'transform') {
      this.transform()
      return
    }
  }

  async run(): Promise<void> {
    const options = this.options

    const watcher = rollup.watch([
      {
        input: this.options.entryFile,
        external: this.options.external,
        plugins: this.options.plugins,
        output: { dir: this.options.outputDir, format: this.options.format },
        watch: {
          clearScreen: true,
          exclude: ['node_modules/**'],
        },
      },
    ])

    let tmpOutputFileName = path.basename(this.options.entryFile)
    tmpOutputFileName = tmpOutputFileName.substr(
      0,
      tmpOutputFileName.length - path.extname(this.options.entryFile).length
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
        res.json(options.importmap || {})
      })

      app.use('/importmap.:env.json', async (req, res) => {
        try {
          const file = await fs.readFile(
            path.resolve(
              options.publicDir,
              `./importmap.${req.params.env}.json`
            ),
            'utf8'
          )
          res.end(file)
        } catch (e) {
          res.json(options.importmap || {})
        }
      })

      app.use(
        '/systemjs',
        express.static(path.resolve(options.dir, './node_modules/systemjs'))
      )
      app.get('/', async (_, res) => {
        res.send(await htmlGenerator.renderToString())
      })
      app.use(express.static(options.outputDir))
      app.use(express.static(options.publicDir))

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
          child = cp.fork(
            path.resolve(options.outputDir, `${tmpOutputFileName}.js`),
            [],
            {
              env: options.env,
              cwd: options.dir,
            }
          )
          process.stdout.write('Compiled success')
        } else {
          process.stdout.write('Compiling...')
        }
      })
    }
  }

  async transform(): Promise<void> {
    const options = this.options
    const transformer = new Transformer(options)
    await transformer.transform(options.entryFile, options.outputDir)
    console.log('transform success')
  }

  async bundle(): Promise<void> {
    const options = this.options

    const bundle = await rollup.rollup({
      input: this.options.entryFile,
      plugins: this.options.plugins,
      external: this.options.external,
    })
    if (this.options.format === 'umd') {
      await bundle.write({
        dir: this.options.outputDir,
        format: this.options.format,
        name: this.options.pkg.name,
      })
    } else {
      await bundle.write({
        dir: this.options.outputDir,
        format: this.options.format,
      })
    }
    console.log('Bundle js success')
    if (options.argv.dts) {
      await this.dts()
    }
    if (options.platform === 'browser' && options.argv.html) {
      await this.buildHtml()
    }
    console.log('Bundle finished')
  }

  async buildHtml(): Promise<void> {
    const options = this.options

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

  async dts(): Promise<void> {
    const options = this.options

    // const builder = new DtsBuilder(options)
    // builder.build()
    try {
      console.log('Bundling dts files...')

      const bundler = new DtsBundler(options)
      await bundler.bundle()
      console.log('Bundling dts success')
    } catch (e) {
      console.error(e)
      console.log('Bundling dts fail, You can use "tsc" as fallback solution')
    }
  }

  // WIP
  async buildDir(): Promise<void> {
    const options = this.options

    const files = glob.sync(`${options.dir}/**/*`)
    const { babelrc, presets, plugins } = options.babelOptions
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
}
