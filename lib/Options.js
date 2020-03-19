const findUp = require('find-up')
const path = require('path')
const fs = require('fs').promises

class Options {
  static async from() {
    const nodeModule = await findUp('node_modules', { type: 'directory' })
    const dir = path.dirname(nodeModule)
    const pkg = JSON.parse(
      await fs.readFile(path.resolve(dir, './package.json'), 'utf8')
    )
    const opt = { dir, pkg }

    return new Options(opt)
  }

  constructor(opt) {
    this.dir = opt.dir
    this.pkg = opt.pkg
  }

  get format() {
    if (this.pkg.platform === 'node') return 'cjs'
    return 'system'
  }

  get importmap() {
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
}

module.exports = Options
