import start from './start'
import build from './build'
import bundle from './bundle'
import Options from './Options'

async function main(): Promise<void> {
  const options = await Options.from()

  if (options.command === 'start') {
    start(options)
    return
  }

  if (options.command === 'build') {
    build(options)
    return
  }

  if (options.command === 'bundle') {
    bundle(options)
    return
  }
}

main()
