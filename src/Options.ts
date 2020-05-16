import { argv } from 'yargs'
// import findUp from 'find-up'
import path from 'path'
import { promises as fs } from 'fs'
import dotenv from 'dotenv'
import { ModuleFormat } from 'rollup'

export default class Options {
  static async loadEnv(dir: string, command: string): Promise<any> {
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

    const envfile = `.env.${process.env.NODE_ENV}`

    try {
      const env = dotenv.parse(await fs.readFile(path.resolve(dir, envfile)))
      return { ...process.env, ...env }
    } catch (e) {
      return { ...process.env }
    }
  }

  static async from(): Promise<Options> {
    if (argv._.length === 0) {
      throw new Error('node-ts-scripts command: run, bundle')
    }

    if (argv._.length === 1) {
      throw new Error('node-ts-scripts: need an entry file')
    }
    const command = argv._[0]
    const entryFile = argv._[1]

    const dir = process.cwd()
    const pkg = JSON.parse(
      await fs.readFile(path.resolve(dir, './package.json'), 'utf8')
    )
    const opt = {
      command,
      argv,
      entryFile,
      dir,
      pkg,
      env: await this.loadEnv(dir, command),
    }

    return new Options(opt)
  }

  command: string
  dir: string
  pkg: any
  env: {
    [x: string]: any
  }
  argv: {
    [x: string]: any
  }
  entryFile: string

  constructor(opt: any) {
    this.argv = opt.argv
    this.dir = opt.dir
    this.pkg = opt.pkg
    this.env = opt.env
    this.command = opt.command
    this.entryFile = opt.entryFile
  }

  get format(): ModuleFormat {
    if (this.argv.format) return this.argv.format
    if (this.platform === 'node') return 'cjs'
    if (this.platform === 'browser') return 'systemjs'
    return 'umd'
  }

  get importmap(): any {
    try {
      return {
        imports: this.pkg.importmap.imports,
      }
    } catch (e) {
      return {
        imports: {},
      }
    }
  }

  get extensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx', '.mjs']
  }

  get replaceMap(): any {
    const result: any = {}

    for (const key of Object.keys(this.env)) {
      result[`process.env.${key}`] = JSON.stringify(this.env[key])
    }
    return result
  }

  get platform(): string {
    return this.argv.platform || this.pkg.platform || 'node'
  }
}
