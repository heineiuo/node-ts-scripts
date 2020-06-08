import { Plugin } from 'rollup'
import Options from './Options'
import builtins from 'builtin-modules'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import image from '@rollup/plugin-image'
import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'
import BabelOptions from './BabelOptions'
import postcss from 'rollup-plugin-postcss'

export default class InputOptions {
  constructor(options: Options) {
    this.options = options
  }

  private options: Options

  private getBuiltinModules(): string[] {
    return builtins.filter(item => {
      if (this.options.pkg.dependencies) {
        if (this.options.pkg.dependencies.hasOwnProperty(item)) return false
      }
      if (this.options.pkg.devDependencies) {
        if (this.options.pkg.devDependencies.hasOwnProperty(item)) return false
      }
      return true
    })
  }

  get plugins(): Plugin[] {
    const result: Plugin[] = []
    const babelOptions = new BabelOptions(this.options)
    result.push(
      postcss({
        extract: false,
        modules: this.options.env.USE_CSS_MODULES === 'true',
        use: [],
      })
    )
    result.push(image())
    result.push(
      json({
        include: ['src/**', 'node_modules/**'],
        preferConst: true,
        indent: '  ',
        compact: true,
        namedExports: true,
      })
    )
    if (this.options.platform === 'browser') {
      result.push(replace(this.options.replaceMap))
    }
    result.push(
      resolve({
        mainFields:
          this.options.platform === 'browser'
            ? ['browser']
            : ['module', 'main'],
        browser: this.options.platform === 'browser',
        extensions: this.options.extensions,
        preferBuiltins: this.options.platform !== 'browser',
      })
    )
    result.push(
      commonjs({
        include: 'node_modules/**',
        ignoreGlobal: false,
        sourceMap: false,
        namedExports: {},
      })
    )
    result.push(babel(babelOptions))

    if (this.options.env.NODE_ENV === 'production') {
      result.push(terser())
    }

    return result
  }

  get input(): string {
    return this.options.entryFile
  }

  get external(): string[] {
    let result = this.getBuiltinModules()
    if (this.options.platform === 'node') {
      result = result.concat(Object.keys(this.options.pkg.dependencies || {}))
      result = result.concat(
        Object.keys(this.options.pkg.peerDependencies || {})
      )
    } else if (this.options.platform === 'browser') {
      result = result.concat(Object.keys(this.options.importmap.imports))
      result = result.concat(
        Object.keys(this.options.pkg.peerDependencies || {})
      )
    }
    return result
  }
}
