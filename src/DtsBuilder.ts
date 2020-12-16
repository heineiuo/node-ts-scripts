import glob from 'glob'
import path from 'path'
import * as ts from 'typescript'
import { Context } from './Context'

// WIP
export class DtsBuilder {
  constructor(options: Context) {
    this.options = options
  }

  options: Context

  build = (): void => {
    console.log('Compiling dts files...')
    const files = glob.sync(`${this.options.cwd}/src/**/*`)
    const compilerOptions = {
      target: ts.ScriptTarget.ES5,
      lib: ['dom', 'dom.iterable', 'esnext'],
      typeRoots: ['./typings'],
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: false,
      emitDeclarationOnly: true,
      declaration: true,
      jsx: ts.JsxEmit.Preserve,
      outDir: path.resolve(this.options.cwd, './build'),
      declarationDir: path.resolve(this.options.cwd, './build'),
    } as ts.CompilerOptions

    const program = ts.createProgram(files, compilerOptions)
    program.emit()
    console.log('Compiled dts success')
  }
}
