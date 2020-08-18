import Options from './Options'

export default class WatchOptions {
  constructor(options: Options) {
    this.options = options
  }
  private options: Options
  // chokidar,
  // clearScreen,
  get exclude(): string[] {
    return ['node_modules/**']
  }
  // get include(): string[] {
  //   return ['./**']
  // }
}
