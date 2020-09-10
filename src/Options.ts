import { argv } from 'yargs'
import findUp from 'find-up'
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
    const defaultEnv = {
      PORT: 3000,
    }
    try {
      const env = dotenv.parse(await fs.readFile(path.resolve(dir, envfile)))
      return { ...defaultEnv, ...process.env, ...env }
    } catch (e) {
      return { ...defaultEnv, ...process.env }
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
    let entryFile = argv._[1]

    const dir = process.cwd()

    entryFile = path.resolve(dir, entryFile)
    let outputDir = './build'
    if (argv._[2]) {
      outputDir = argv._[2]
    }
    outputDir = path.resolve(dir, outputDir)

    const pkg = JSON.parse(
      await fs.readFile(path.resolve(dir, './package.json'), 'utf8')
    )
    const opt = {
      command,
      argv,
      entryFile,
      outputDir,
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
  output: string

  constructor(opt: any) {
    this.argv = opt.argv
    this.dir = opt.dir
    this.pkg = opt.pkg
    this.env = opt.env
    this.command = opt.command
    this.entryFile = opt.entryFile
    this.output = opt.outputDir
  }

  get format(): ModuleFormat {
    if (this.argv.format) return this.argv.format
    if (this.platform === 'node') return 'cjs'
    if (this.platform === 'browser') return 'systemjs'
    return 'umd'
  }

  get importmap(): any {
    let rawImports = null
    const imports = {}

    try {
      const importmapFile = findUp.sync('importmap.config.js')
      if (importmapFile) {
        rawImports = require(importmapFile).imports
      }
    } catch (e) {}
    if (!rawImports) {
      // fallback to `imports` property in package.json
      try {
        rawImports = this.pkg.importmap.imports
        console.warn(
          'Define importmap in package.json is deprecated, ' +
            'please use importmap.config.js instead.'
        )
      } catch (e) {}
    }

    // node-ts-scripts support use different url based on
    // different NODE_ENV value.
    for (const [key, value] of Object.entries(rawImports)) {
      if (typeof value === 'string') {
        imports[key] = value
      } else {
        const nodeEnv = value[this.env.NODE_ENV]
        if (typeof nodeEnv === 'string') {
          imports[key] = nodeEnv
        }
      }
    }

    imports[this.pkg.name] = this.outputMainUrl
    return { ...(this.pkg.importmap || {}), imports }
  }

  get outputMainUrl(): string {
    if (this.env.NODE_ENV === 'development') {
      return `http://localhost:${this.env.PORT}/index.js`
    } else {
      const baseURL = this.argv.baseURL || 'https://cdn.jsdelivr.net/npm'
      return `${baseURL}/${this.pkg.name}@${this.pkg.version}/build/index.js`
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
