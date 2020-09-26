import browserslist from 'browserslist'

console.log(
  browserslist(null, {
    path: process.cwd(),
    env: 'production',
  })
)
