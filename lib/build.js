'use strict'

const rollup = require('rollup')
const commonjs = require('@rollup/plugin-commonjs')
const json = require('@rollup/plugin-json')
const resolve = require('@rollup/plugin-node-resolve')
const reolace = require('@rollup/plugin-replace')
const image = require('@rollup/plugin-image')
const babel = require('rollup-plugin-babel')
const minify = require('rollup-plugin-babel-minify')
const generatePackageJson = require('rollup-plugin-generate-package-json')
const builtins = require('builtin-modules')
const fs = require('fs').promises
const express = require('express')
const path = require('path')
const Options = require('./Options')

async function createInputOptions(options) {
  const { dir, pkg } = options
  const extensions = ['.js', '.jsx', '.ts', '.tsx']

  const inputOptions = {
    input: 'src/index',
    external: [builtins, ...Object.keys(pkg.externalDependencies || {})],
    plugins: [
      image(),
      json({
        include: ['src/**', 'node_modules/**'],
        preferConst: true,
        indent: '  ',
        compact: true,
        namedExports: true,
      }),
      reolace({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      resolve({
        extensions,
        preferBuiltins: true,
      }),
      commonjs({
        include: 'node_modules/**',
        ignoreGlobal: false,
        sourceMap: false,
        namedExports: {},
      }),
      babel({
        babelrc: false,
        presets: [
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
        ],
        plugins: [
          '@babel/plugin-proposal-optional-chaining',
          '@babel/plugin-syntax-bigint',
          '@babel/plugin-proposal-class-properties',
        ],
        extensions,
        include: ['src/**/*'],
        exclude: 'node_modules/**',
      }),
      minify({
        comments: false,
        sourceMap: false,
      }),
      generatePackageJson(),
    ],
  }

  return inputOptions
}

async function createOutputOptions(options) {
  return {
    dir: path.resolve(options.dir, './build'),
    // file: "build/index.js",
    format: options.format,
  }
}

async function main() {
  const options = await Options.from()
  const bundle = await rollup.rollup(await createInputOptions(options))
  const outputOptions = await createOutputOptions(options)
  await bundle.write(outputOptions)

  console.log('Build success')
}

module.exports = main
