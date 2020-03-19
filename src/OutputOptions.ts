import Options from './Options'
import path from 'path'

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
  get format(): 'cjs' | 'system' {
    return this.options.format
  }
}
