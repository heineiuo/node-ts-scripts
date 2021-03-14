import * as rollup from 'rollup'
import express from 'express'
import cp from 'child_process'
import path from 'path'
import cors from 'cors'
import { HTMLGenerator } from './HTMLGenerator'
import { Context } from './Context'
import { promises as fs } from 'fs'
import babel from '@babel/core'
import glob from 'glob'
import { Transformer } from './Transformer'
import { generateDtsBundle } from 'dts-bundle-generator'

export class Scheduler {
  constructor() {
    this.ctx = new Context()
  }

  ctx: Context

  runCommand(): Promise<void> {
    if (this.ctx.command === 'run') {
      this.run()
      return
    }

    if (this.ctx.command === 'bundle') {
      this.bundle()
      return
    }

    if (this.ctx.command === 'transform') {
      this.transform()
      return
    }
  }

  async run(): Promise<void> {
    const watcher = rollup.watch([
      {
        input: this.ctx.entryFile,
        external: this.ctx.external,
        plugins: this.ctx.plugins,
        output: { dir: this.ctx.outputDir, format: this.ctx.format },
        watch: {
          clearScreen: true,
          exclude: ['node_modules/**'],
        },
      },
    ])

    let tmpOutputFileName = path.basename(this.ctx.entryFile)
    tmpOutputFileName = tmpOutputFileName.substr(
      0,
      tmpOutputFileName.length - path.extname(this.ctx.entryFile).length
    )

    const htmlGenerator = new HTMLGenerator(this.ctx)

    console.log(`Platform: ${this.ctx.platform}`)
    if (this.ctx.platform === 'browser') {
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

      app.get('/', async (_, res) => {
        res.send(await htmlGenerator.renderToString())
      })
      app.use('/node_modules', express.static(this.ctx.nodeModulesDir))
      app.use(express.static(this.ctx.outputDir))
      app.use(express.static(this.ctx.publicDir))

      app.use(async (_, res) => {
        res.send(await htmlGenerator.renderToString())
      })

      const port = this.ctx.env.PORT || 3000
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
            path.resolve(this.ctx.outputDir, `${tmpOutputFileName}.js`),
            [],
            {
              env: this.ctx.env,
              cwd: this.ctx.cwd,
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
    const transformer = new Transformer(this.ctx)
    await transformer.transform(this.ctx.entryFile, this.ctx.outputDir)
    console.log('transform success')
  }

  async bundle(): Promise<void> {
    try {
      const bundle = await rollup.rollup({
        input: this.ctx.entryFile,
        plugins: this.ctx.plugins,
        external: this.ctx.external,
      })
      if (this.ctx.format === 'umd') {
        await bundle.write({
          dir: this.ctx.outputDir,
          format: this.ctx.format,
          name: this.ctx.name,
        })
      } else {
        await bundle.write({
          dir: this.ctx.outputDir,
          format: this.ctx.format,
        })
      }
      console.log('Bundle js success')
    } catch (e) {
      console.log('Bundle js failed')
      console.log('Tips: Did you forget add some packages to your importmap?')
      console.log(this.ctx.debug)
      if (this.ctx.debug) {
        console.error(e)
      }
      return
    }
    try {
      if (this.ctx.dts) {
        await this.dts()
        console.log('Bundle dts finished')
      }
    } catch (e) {
      console.log('Bundle dts failed')
      if (this.ctx.debug) {
        console.error(e)
      }
    }
  }

  async dts(): Promise<void> {
    try {
      console.log('Bundling dts files...')
      console.log(`importedLibraries: ${this.ctx.external.join(',')}`)

      const results = generateDtsBundle(
        [
          {
            filePath: this.ctx.entryFile,
            libraries: {
              importedLibraries: this.ctx.external,
            },
          },
        ],
        {
          preferredConfigPath: this.ctx.tsconfig,
        }
      )
      await fs.writeFile(this.ctx.dtsFile, results[0])

      console.log('Bundling dts success')
    } catch (e) {
      console.error(e)
      console.log('Bundling dts fail, You can use "tsc" as fallback solution')
    }
  }

  // WIP
  async buildDir(): Promise<void> {
    const files = glob.sync(`${this.ctx.cwd}/**/*`)
    const { babelrc, presets, plugins } = this.ctx.babelOptions
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
