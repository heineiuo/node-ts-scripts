import rollup from 'rollup'
import { promises as fs } from 'fs'
import express from 'express'
import Options from './Options'
import path from 'path'
import InputOptions from './InputOptions'
import OutputOptions from './OutputOptions'
import WatchOptions from './WatchOptions'

export default async function main(options: Options): Promise<void> {
  const app = express()

  app.use(async (req, res, next) => {
    if (req.path.indexOf('.') > -1) return next()

    const indexHTMLPath = path.resolve(options.dir, './public/index.html')
    let indexHTML = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>node ts scripts</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
     </head>
    <body>
      <div id="app"></div>
    </body>
    </html>`
    try {
      indexHTML = await fs.readFile(indexHTMLPath, 'utf8')
    } catch (e) {}
    res.send(indexHTML)
  })

  app.use('/importmap.json', (req, res) => {
    res.json(options.importmap)
  })

  app.use(express.static(path.resolve(process.cwd(), './.cache')))
  app.use(express.static(path.resolve(process.cwd(), './public')))

  app.listen(3000, () => {
    console.log('node-ts-script listening on http://localhost:3000')
  })
}
