import { Plugin } from 'rollup'
import Options from './Options'
import builtins from 'builtin-modules'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import image from '@rollup/plugin-image'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import BabelOptions from './BabelOptions'
import postcss from 'rollup-plugin-postcss'

export default class InputOptions {
  constructor(options: Options) {
    this.options = options
  }

  private options: Options

  get plugins(): Plugin[] {
    const plugins: Plugin[] = []
    const babelOptions = new BabelOptions(this.options)
    plugins.push(
      postcss({
        extract: false,
        modules: this.options.env.USE_CSS_MODULES === 'true',
        use: [],
      })
    )
    plugins.push(image())
    plugins.push(
      json({
        include: ['**'],
        preferConst: true,
        indent: '  ',
        compact: true,
        namedExports: true,
      })
    )
    if (this.options.platform === 'browser') {
      plugins.push(replace(this.options.replaceMap))
    }

    plugins.push(
      resolve({
        mainFields:
          this.options.platform === 'browser'
            ? ['browser', 'main']
            : ['module', 'main'],
        browser: this.options.platform === 'browser',
        extensions: this.options.extensions,
        preferBuiltins: this.options.platform !== 'browser',
      })
    )

    plugins.push(
      commonjs({
        include: [/node_modules/, /build/],
        ignoreGlobal: false,
        sourceMap: false,
      })
    )
    plugins.push(
      babel({
        babelrc: false,
        presets: babelOptions.presets,
        plugins: babelOptions.plugins,
        include: babelOptions.include,
        exclude: babelOptions.exclude,
        babelHelpers: babelOptions.babelHelpers,
        extensions: babelOptions.extensions,
      })
    )

    if (this.options.env.NODE_ENV === 'production') {
      plugins.push(terser())
    }

    return plugins
  }

  get input(): string {
    return this.options.entryFile
  }

  // If packages was installed to dependencies or peerDependencies,
  // and not installed to devDependencies,
  // it will be treat as external
  //
  // Although in brwoser, packages is not really compiled or
  // bundled for useage if it was add to importmap,
  // but in real development,
  // packages should be installed to support type definition.
  get external(): string[] {
    let result = []

    if (this.options.platform === 'node') {
      result = result.concat(builtins)
    }

    result = result
      .concat(Object.keys(this.options.pkg.dependencies || {}))
      .concat(Object.keys(this.options.pkg.peerDependencies || {}))

    if (!this.options.pkg.devDependencies) return result
    return result.filter((name) => {
      return !this.options.pkg.devDependencies.hasOwnProperty(name)
    })
  }
}
