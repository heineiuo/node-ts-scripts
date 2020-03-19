import Options from './Options'

export default class BabelOptions {
  constructor(options: Options) {
    this.babelrc = false
    this.extensions = options.extensions
    this.presets = [
      ['@babel/preset-typescript'],
      ['@babel/preset-react'],
      [
        '@babel/preset-env',
        {
          loose: true,
          useBuiltIns: false,
          targets: {
            node: 'current',
          },
        },
      ],
    ]
    this.plugins = [
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-syntax-bigint',
      '@babel/plugin-proposal-class-properties',
    ]
  }

  extensions: string[]
  babelrc: boolean
  presets: any[]
  plugins: any[]

  get include(): string[] {
    return ['src/**/*']
  }
  get exclude(): string[] {
    return ['node_modules/**']
  }
}
