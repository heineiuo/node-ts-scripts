import Options from './Options'
import path from 'path'
import { ModuleFormat } from 'rollup'

export default class OutputOptions {
  constructor(options: Options) {
    this.options = options
  }
  private options: Options
  get dir(): string {
    if (this.options.argv.outputDir) {
      return path.resolve(this.options.dir, this.options.argv.outputDir)
    }
    if (this.options.env.NODE_ENV === 'development') {
      return path.resolve(this.options.dir, 'build', this.options.env.NODE_ENV)
    }
    return path.resolve(this.options.dir, 'build', this.options.env.NODE_ENV)
  }
  // file: "build/index.js",
  get format(): ModuleFormat {
    return this.options.format
  }

  get name(): string {
    return `${this.options.pkg.name}`
  }
}
