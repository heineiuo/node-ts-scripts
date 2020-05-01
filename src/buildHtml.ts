import Options from './Options'
import { HTMLGenerator } from './HTMLGenerator'
import { promises as fs } from 'fs'
import path from 'path'

export default async function buildHtml(options: Options): Promise<void> {
  const htmlGenerator = new HTMLGenerator(options)
  await fs.mkdir(path.resolve(options.dir, './build'), { recursive: true })
  await fs.writeFile(
    path.resolve(options.dir, './build/index.html'),
    htmlGenerator.toString(),
    'utf8'
  )
  await fs.writeFile(
    path.resolve(options.dir, './build/importmap.json'),
    JSON.stringify(options.pkg.importmap),
    'utf8'
  )
  console.log('Build html files success')
}
