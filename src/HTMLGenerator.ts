import path from 'path'
import { Context } from './Context'
import { minify } from 'html-minifier'
import escapeStringRegexp from 'escape-string-regexp'

export class HTMLGenerator {
  constructor(options: Context) {
    this.options = options
    this.indexHTMLPath = path.resolve(options.cwd, './public/index.html')
  }

  options: Context
  indexHTMLPath: string

  getVariables(): { [x: string]: string } {
    return {
      NODE_ENV: this.options.env.NODE_ENV,
      PACKAGE_NAME: this.options.name,
    }
  }

  async renderToString(): Promise<string> {
    let indexHTML = await this.options.indexHtmlPromise
    const variables = this.getVariables()

    Object.keys(variables).forEach((key) => {
      const value = variables[key]
      indexHTML = indexHTML.replace(
        new RegExp('%' + escapeStringRegexp(key) + '%', 'g'),
        value
      )
    })

    if (this.options.env.NODE_ENV === 'development') {
      return indexHTML
    }

    return minify(indexHTML, {
      removeComments: true,
      collapseWhitespace: true,
    })
  }
}
