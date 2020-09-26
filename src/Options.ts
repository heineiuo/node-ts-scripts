import { ModuleFormat } from 'rollup'
import findUp from 'find-up'
import path from 'path'
import builtins from 'builtin-modules'
import { Plugin } from 'rollup'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import replace from '@rollup/plugin-replace'
import image from '@rollup/plugin-image'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import { terser } from 'rollup-plugin-terser'
import postcss from 'rollup-plugin-postcss'
import browserslist from 'browserslist'
export default class Options {
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
    this.env = opt.env
    this.pkg = opt.pkg
    this.command = opt.command
    this.entryFile = opt.entryFile
  }

  get outputDir(): string {
    const outputDir = this.argv.outputDir || `./build/${this.env.NODE_ENV}`
    return path.resolve(this.dir, outputDir)
  }

  get publicDir(): string {
    return path.resolve(this.dir, './public')
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

  get platform(): 'node' | 'browser' {
    return this.argv.platform || this.pkg.platform || 'node'
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

    if (this.platform === 'node') {
      result = result.concat(builtins)
    }

    result = result
      .concat(Object.keys(this.pkg.dependencies || {}))
      .concat(Object.keys(this.pkg.peerDependencies || {}))

    if (!this.pkg.devDependencies) return result
    return result.filter((name) => {
      return !this.pkg.devDependencies.hasOwnProperty(name)
    })
  }

  get babelOptions(): any {
    return {
      babelrc: false,
      presets: [
        ['@babel/preset-typescript'],
        ['@babel/preset-react'],
        [
          '@babel/preset-env',
          {
            loose: true,
            useBuiltIns: false,
            targets:
              this.platform === 'node'
                ? {
                    node: 'current',
                  }
                : {
                    browsers: browserslist(null, {
                      path: this.dir,
                      env: this.env.NODE_ENV,
                    }),
                  },
          },
        ],
      ],
      plugins: [
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-syntax-bigint',
        '@babel/plugin-proposal-class-properties',
      ],
      include: [/.*/],
      exclude: [/node_modules/, /build/],
      babelHelpers: 'bundled',
      extensions: this.extensions,
    }
  }

  get plugins(): Plugin[] {
    const plugins: Plugin[] = []
    plugins.push(
      postcss({
        extract: false,
        modules: this.env.USE_CSS_MODULES === 'true',
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
    if (this.platform === 'browser') {
      plugins.push(replace(this.replaceMap))
    }

    plugins.push(
      resolve({
        mainFields:
          this.platform === 'browser'
            ? ['browser', 'main']
            : ['module', 'main'],
        browser: this.platform === 'browser',
        extensions: this.extensions,
        preferBuiltins: this.platform !== 'browser',
      })
    )

    plugins.push(
      commonjs({
        include: [/node_modules/, /build/],
        ignoreGlobal: false,
        sourceMap: false,
      })
    )
    plugins.push(babel(this.babelOptions))

    if (this.env.NODE_ENV === 'production') {
      plugins.push(terser())
    }

    return plugins
  }
}
