// rollup.config.js
// import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import minify from 'rollup-plugin-babel-minify'
import generatePackageJson from 'rollup-plugin-generate-package-json'
import typescript from 'rollup-plugin-typescript'

export default {
  input: 'src/index.ts',
  output: {
    file: 'build/release/index.js',
    format: 'cjs',
  },
  plugins: [
    // resolve({
    //   preferBuiltins: true
    // }),
    typescript(),
    commonjs({
      include: 'node_modules/**',
      ignoreGlobal: false,
      sourceMap: false,
      namedExports: {},
    }),
    json({
      include: 'node_modules/**',
      preferConst: true,
      indent: '  ',
      compact: true,
      namedExports: true,
    }),
    babel({
      exclude: 'node_modules/**',
    }),
    minify({
      comments: false,
      sourceMap: false,
    }),
    generatePackageJson(),
  ],
}
