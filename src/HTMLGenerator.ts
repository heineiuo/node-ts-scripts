import { promises as fs } from 'fs'
import path from 'path'
import Options from './Options'
import { JSDOM } from 'jsdom'
import { minify } from 'html-minifier'

export class HTMLGenerator {
  constructor(options: Options) {
    this.options = options
    this.indexHTMLPath = path.resolve(options.dir, './public/index.html')
  }

  options: Options
  indexHTMLPath: string

  async renderToString(): Promise<string> {
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
      indexHTML = await fs.readFile(this.indexHTMLPath, 'utf8')
    } catch (e) {}

    const dom = new JSDOM(indexHTML, { runScripts: 'outside-only' })

    const importMapSrc =
      this.options.env.NODE_ENV === 'development'
        ? `http://localhost:${this.options.env.PORT}/importmap.json`
        : 'https://cdn.jsdelivr.net/npm/${this.options.pkg.name}@${this.options.pkg.version}/build/importmap.json'

    dom.window.eval(`
      const script = document.createElement('script')
      script.type = 'systemjs-importmap'
      script.src = '${importMapSrc}'
      document.body.appendChild(script)
    `)

    const htmlScripts = Array.isArray(this.options.pkg.htmlScripts)
      ? this.options.pkg.htmlScripts
      : [
          'https://cdn.jsdelivr.net/combine/npm/promise-polyfill@8.1.3/dist/polyfill.min.js,npm/regenerator-runtime@0.13.5/runtime.min.js,npm/systemjs@6.2.6/dist/system.min.js,npm/systemjs@6.2.6/dist/extras/amd.min.js,npm/systemjs@6.2.6/dist/extras/use-default.min.js,npm/systemjs@6.2.6/dist/extras/named-exports.min.js',
        ]

    for (const htmlScript of htmlScripts) {
      dom.window.eval(`
      const script = document.createElement('script')
      script.src = '${htmlScript}'
      document.body.appendChild(script)
    `)
    }

    dom.window.eval(`
      const script = document.createElement('script')
      script.innerHTML = 'System.import("${this.options.pkg.name}")'
      document.body.appendChild(script)
    `)

    const htmlString = dom.serialize()
    return minify(
      htmlString,
      this.options.pkg.htmlMinifier || {
        removeComments: true,
        collapseWhitespace: true,
      }
    )
  }
}
