import React, { useEffect } from 'react'
import { messageService } from '../services'

export default function Message() {
  const [messages, setMessages] = React.useState([])
  useEffect(() => {
    console.log('hello world')
    messageService.getMessage().then(message => {
      setMessages(message)
    })

  }, [])

  return (
    <>
      {
        Object.keys(messages).map(key => {
          return (
            <ul>
              <li key={key}>{key}: {messages[key]}
              </li>
            </ul>
          )
        })
      }
    </>
  )
}
