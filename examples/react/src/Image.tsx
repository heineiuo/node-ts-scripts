import React from 'react'
import abc from './logo.svg'

export default function Image(props: any) {
  return (
    <div>
      <img src={abc} alt="" {...props} />
      image
    </div>
  )
}
