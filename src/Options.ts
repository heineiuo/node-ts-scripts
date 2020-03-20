import { argv } from 'yargs'
import findUp from 'find-up'
import path from 'path'
import { promises as fs } from 'fs'
import dotenv from 'dotenv'

export default class Options {
  static async loadEnv(dir: string, command: string): Promise<any> {
    let envfile = `.env`
    if (process.env.NODE_ENV === 'production') {
      envfile += `.production`
    } else {
      envfile += `.development`
    }

    const defaultEnv = {
      NODE_ENV: command === 'start' ? 'development' : 'production',
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
      throw new Error('node-ts-scripts command: start, build')
    }
    const command = argv._[0]

    const nodeModule = await findUp('node_modules', { type: 'directory' })
    if (!nodeModule) throw new Error('node_modules not found')
    const dir = path.dirname(nodeModule)
    const pkg = JSON.parse(
      await fs.readFile(path.resolve(dir, './package.json'), 'utf8')
    )
    const opt = { command, dir, pkg, env: await this.loadEnv(dir, command) }

    return new Options(opt)
  }

  constructor(opt: any) {
    this.dir = opt.dir
    this.pkg = opt.pkg
    this.env = opt.env
    this.command = opt.command
  }

  command: string
  dir: string
  pkg: any
  env: {
    [x: string]: any
  }

  get format(): 'cjs' | 'system' {
    if (this.pkg.platform === 'node') return 'cjs'
    return 'system'
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
    return ['.ts', '.tsx', '.js', '.jsx']
  }

  get replaceMap(): any {
    const result: any = {}

    for (const key of Object.keys(this.env)) {
      result[`process.env.${key}`] = JSON.stringify(this.env[key])
    }
    return result
  }
}