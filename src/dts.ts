import * as ts from 'typescript'
import Options from './Options'
import glob from 'glob'
import path from 'path'

export default async function dts(options: Options): Promise<void> {
  console.log('Compiling dts files...')
  const files = glob.sync(`${options.dir}/src/**/*`)
  const compilerOptions = {
    target: ts.ScriptTarget.ES5,
    lib: ['dom', 'dom.iterable', 'esnext'],
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
    outDir: path.resolve(options.dir, './build'),
    declarationDir: path.resolve(options.dir, './build'),
  } as ts.CompilerOptions

  const program = ts.createProgram(files, compilerOptions)
  program.emit()
  console.log('Compiled dts success')
}
