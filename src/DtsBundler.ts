import Options from './Options'
import path from 'path'
import fs from 'fs'
import { generateDtsBundle } from 'dts-bundle-generator'

export class DtsBundler {
  constructor(options: Options) {
    this.options = options
  }

  options: Options

  ensureTSConfig = async (): Promise<string> => {
    let workspaceTSConfig = path.resolve(this.options.dir, './tsconfig.json')
    try {
      await fs.promises.open(workspaceTSConfig, 'r')
    } catch (e) {
      workspaceTSConfig = path.resolve(
        this.options.dir,
        './.cache/tsconfig.json'
      )
      try {
        await fs.promises.mkdir(path.resolve(this.options.dir, './.cache'))
      } catch (e) {}
      await fs.promises.writeFile(
        workspaceTSConfig,
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
          include: ['src'],
          exclude: ['node_modules'],
        })
      )
    }
    return workspaceTSConfig
  }

  bundle = async (): Promise<void> => {
    const results = generateDtsBundle([{ filePath: this.options.entryFile }], {
      preferredConfigPath: await this.ensureTSConfig(),
    })
    await fs.promises.writeFile(
      path.resolve(this.options.dir, './build/index.d.ts'),
      results[0]
    )
  }
}
