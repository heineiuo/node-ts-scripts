// todo

import babel from '@babel/core'
import glob from 'glob'
import BabelOptions from './BabelOptions'
import Options from './Options'

export default async function main(options: Options): Promise<void> {
  const files = glob.sync(`${options.dir}/**/*`)
  const { babelrc, presets, plugins } = new BabelOptions(options)
  for (const file of files) {
    console.log(file + ':')

    const result = await babel.transformFileAsync(file, {
      babelrc,
      presets,
      plugins,
    })
    if (result) {
      const { code } = result
      console.log(code)
      break
    }
  }
}
