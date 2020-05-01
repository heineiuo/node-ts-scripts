import { promises as fs } from 'fs'
import path from 'path'
import Options from './Options'
import { JSDOM } from 'jsdom'

export class HTMLGenerator {
  constructor(options: Options) {
    this.options = options
    this.indexHTMLPath = path.resolve(options.dir, './public/index.html')
  }

  options: Options
  indexHTMLPath: string

  indexHTML = `<!DOCTYPE html>
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

  load = async (): Promise<void> => {
    try {
      this.indexHTML = await fs.readFile(this.indexHTMLPath, 'utf8')
    } catch (e) {}
  }

  toString(): string {
    const dom = new JSDOM(this.indexHTML, { runScripts: 'outside-only' })
    const { window } = dom

    if (this.options.env.NODE_ENV === 'development') {
      window.eval(`
      const script = document.createElement('script')
      script.type = 'systemjs-importmap'
      script.src = '/importmap.json'
      document.body.appendChild(script)
    `)
      window.eval(`
      const script = document.createElement('script')
      script.src = '/systemjs/dist/system.js'
      document.body.appendChild(script)
    `)
      window.eval(`
      const script = document.createElement('script')
      script.src = '/systemjs/dist/extras/amd.js'
      document.body.appendChild(script)
    `)
      window.eval(`
      const script = document.createElement('script')
      script.src = '/systemjs/dist/extras/use-default.js'
      document.body.appendChild(script)
    `)
      window.eval(`
    const script = document.createElement('script')
    script.src = '/systemjs/dist/extras/named-exports.js'
    document.body.appendChild(script)
  `)
      window.eval(`
      const script = document.createElement('script')
      script.type = 'systemjs-module'
      script.src = '/index.js'
      document.body.appendChild(script)
    `)

      // if (code !== 'END') {
      //   window.eval(`
      //   const script = document.createElement('script')
      //   script.innerHTML = 'setInterval(location.reload, 1000)'
      //   document.body.appendChild(script)
      // `)
      // }
    } else {
      window.eval(`
      const script = document.createElement('script')
      script.type = 'systemjs-importmap'
      script.src = 'https://cdn.jsdelivr.net/npm/${this.options.pkg.name}@${this.options.pkg.version}/build/importmap.json'
      document.body.appendChild(script)
    `)
      if (Array.isArray(this.options.pkg.htmlScripts)) {
        window.eval(`
      const script = document.createElement('script')
      script.src = '${this.options.pkg.htmlScripts.join(',')}'
      document.body.appendChild(script)
    `)
      }
      window.eval(`
      const script = document.createElement('script')
      script.type = 'systemjs-module'
      script.src = 'https://cdn.jsdelivr.net/npm/${this.options.pkg.name}@${this.options.pkg.version}/build/index.js'
      document.body.appendChild(script)
    `)
    }

    return dom.serialize()
  }
}
