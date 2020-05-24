import Options from './Options'
import path from 'path'
import { ModuleFormat } from 'rollup'

export default class OutputOptions {
  constructor(options: Options) {
    this.options = options
  }
  private options: Options
  get dir(): string {
    const folder =
      this.options.env.NODE_ENV === 'production' ? 'build' : '.cache'
    return path.resolve(this.options.dir, `./${folder}`)
  }
  // file: "build/index.js",
  get format(): ModuleFormat {
    return this.options.format
  }

  get name(): string {
    return `${this.options.pkg.name}`
  }
}
