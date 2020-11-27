import fs from 'fs'
import { argv } from 'yargs'
import { CommandType, ImportMap, TargetPlatform } from './types'
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
import dotenv from 'dotenv'
import uuid from 'uuid'
import os from 'os'

export class Context {
  constructor() {
    this.cwd = process.cwd()
    this.env = this.loadEnv()
    this.id = uuid.v1()
    this.getAbsolutePath = this.getAbsolutePath.bind(this)
  }

  cwd: string
  env: { [x: string]: string }
  id: string
  private _importmap?: ImportMap
  private _name?: string
  private _version?: string

  loadEnv(): { [x: string]: string } {
    if (!process.env.NODE_ENV) {
      if (this.command === 'bundle') {
        process.env.NODE_ENV = 'production'
      } else {
        process.env.NODE_ENV = 'development'
      }
    }

    const env: { [x: string]: string } = {
      PORT: '3000',
    }
    const envfiles = [
      `.env.${process.env.NODE_ENV}`,
      `.env.${process.env.NODE_ENV}.local`,
    ]
    for (const envfile of envfiles) {
      try {
        Object.assign(
          env,
          dotenv.parse(fs.readFileSync(this.getAbsolutePath(envfile)))
        )
      } catch (e) {}
    }
    Object.assign(env, process.env)
    return env
  }

  getAbsolutePath(filename: string): string {
    return path.resolve(this.cwd, filename)
  }

  get debug(): boolean {
    return argv.debug === true || typeof argv.debug === 'string'
  }

  get importmap(): ImportMap {
    if (this._importmap) return this._importmap
    this._importmap = { imports: {} }
    if (typeof argv['import-map'] === 'string') {
      try {
        this._importmap = JSON.parse(
          fs.readFileSync(this.getAbsolutePath(argv['import-map']), 'utf-8')
        )
      } catch (e) {}
    }
    return this._importmap
  }

  get name(): string {
    if (this._name) return this._name
    const argvName = argv.name as string
    if (argvName) return argvName
    const pkgFile = findUp.sync('package.json')
    if (!pkgFile) {
      throw new Error('Unknown name')
    }
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'))
    this._name = pkg.name
    return this._name
  }

  get dts(): boolean {
    return typeof argv.dts === 'string'
  }

  get html(): boolean {
    return typeof argv.html === 'string'
  }

  get version(): string {
    if (this._version) return this._version
    const argvversion = argv.version as string
    if (argvversion) return argvversion
    const pkgFile = findUp.sync('package.json')
    if (!pkgFile) {
      throw new Error('Unknown version')
    }
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'))
    this._version = pkg.version
    return this._version
  }

  get command(): CommandType {
    const command = argv._[0]
    if (command === 'run' || command === 'bundle') {
      return command
    }
    throw new Error('Unknown command')
  }

  get tsconfig(): string {
    if (this.env.tsconfig) {
      return this.env.tsconfig
    }
    const file = findUp.sync('tsconfig.json')
    if (file) return file

    const tmpFolder = path.resolve(os.tmpdir(), this.id)
    const tmpFile = path.resolve(tmpFolder, 'tsconfig.json')

    try {
      fs.statSync(tmpFile)
      return tmpFile
    } catch (e) {
      fs.mkdirSync(tmpFolder, { recursive: true })
      fs.writeFileSync(
        tmpFile,
        JSON.stringify({
          compilerOptions: {
            module: 'esnext',
            target: 'esnext',
            lib: [
              'es2019',
              'dom',
              'esnext.asynciterable',
              'dom.iterable',
              'esnext',
            ],
            declaration: true,
            allowJs: false,
            skipLibCheck: true,
            jsx: 'react',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: false,
            forceConsistentCasingInFileNames: true,
            downlevelIteration: true,
            resolveJsonModule: true,
            moduleResolution: 'node',
            isolatedModules: true,
            emitDeclarationOnly: true,
            noEmit: false,
          },
          include: ['*'],
          exclude: ['node_modules'],
        }),
        'utf8'
      )
      return tmpFile
    }
  }

  get entryFile(): string {
    const entry = argv._[1]
    if (entry) {
      return this.getAbsolutePath(entry)
    }
    throw new Error('Unknown entry file')
  }

  get indexHTMLPath(): string {
    const a = argv['index-html']
    if (typeof a === 'string') {
      return this.getAbsolutePath(a)
    }
    throw new Error('index-html not defined')
  }

  get indexHtmlPromise(): Promise<string> {
    return new Promise(async (resolve) => {
      let indexHTML = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>node ts scripts</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
       </head>
      <body>
        <div id="app"></div>
        <script type="systemjs-importmap" src="/importmap.%NODE_ENV%.json"></script>
        <script src="https://cdn.jsdelivr.net/combine/npm/promise-polyfill@8.1.3/dist/polyfill.min.js,npm/regenerator-runtime@0.13.5/runtime.min.js,npm/systemjs@6.2.6/dist/system.min.js,npm/systemjs@6.2.6/dist/extras/amd.min.js,npm/systemjs@6.2.6/dist/extras/use-default.min.js,npm/systemjs@6.2.6/dist/extras/named-exports.min.js"></script>
        <script>System.import("%PACKAGE_NAME")</script>
      </body>
      </html>`
      try {
        indexHTML = await fs.promises.readFile(this.indexHTMLPath, 'utf8')
      } catch (e) {}
      resolve(indexHTML)
    })
  }

  get outputDir(): string {
    const outputDir =
      (argv['output-dir'] as string) || `./build/${this.env.NODE_ENV}`
    return this.getAbsolutePath(outputDir)
  }

  get dtsFile(): string {
    const argvDtsfile = argv['dts-file']
    if (typeof argvDtsfile === 'string') {
      return this.getAbsolutePath(argvDtsfile)
    }
    return path.resolve(this.outputDir, './index.d.ts')
  }

  get publicDir(): string {
    const publicDir = (argv['public-dir'] as string) || `./public`
    return this.getAbsolutePath(publicDir)
  }

  get format(): ModuleFormat {
    if (argv.format) return argv.format as ModuleFormat
    if (this.platform === 'node') return 'cjs'
    if (this.platform === 'browser') return 'systemjs'
    return 'umd'
  }

  get outputMainUrl(): string {
    if (this.env.NODE_ENV === 'development') {
      return `http://localhost:${this.env.PORT}/index.js`
    } else {
      const baseURL = argv.baseURL || 'https://cdn.jsdelivr.net/npm'
      return `${baseURL}/${this.name}@${this.version}/build/index.js`
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

  get platform(): TargetPlatform {
    return (argv.platform as TargetPlatform) || 'node'
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
    const str = (argv.external as string) || ''
    let ext = str
      .split(',')
      .map((item) => {
        return item.trimLeft().trimRight()
      })
      .filter((item) => item !== '')
    if (this.platform === 'node') {
      ext = ext.concat(builtins)
    }
    ext = ext.concat(Object.keys(this.importmap.imports))
    return ext
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
                      path: this.cwd,
                      env: process.env.NODE_ENV,
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
