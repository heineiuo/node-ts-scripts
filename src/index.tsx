import React from 'react'
import ReactDOM from 'react-dom'
import data from './data.json'
import style from './style.css'

console.log(style)

const Image = React.lazy(() => import('./Image'))

function App() {
  return (
    <>
      <div> hi {JSON.stringify(data)}</div>
      <div>
        <React.Suspense fallback={'loading'}>
          <Image className={style.image}></Image>
        </React.Suspense>
      </div>
    </>
  )
}

function main() {
  console.log(ReactDOM)
  ReactDOM.render(<App></App>, document.getElementById('app'))
}

main()
