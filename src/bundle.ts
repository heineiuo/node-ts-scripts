import * as rollup from 'rollup'
import Options from './Options'
import InputOptions from './InputOptions'
import OutputOptions from './OutputOptions'

export default async function main(options: Options): Promise<void> {
  const { input, plugins, external } = new InputOptions(options)
  const bundle = await rollup.rollup({ input, plugins, external })
  const { dir, format } = new OutputOptions(options)
  await bundle.write({ dir, format })

  console.log('Build success')
}
