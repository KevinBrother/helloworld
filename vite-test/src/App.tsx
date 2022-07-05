import { useState } from 'react'
import logo from './logo.svg'
import './App.css'
import RpaIcon from './components/rpa-icon'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}

        <RpaIcon icon={'eye'}></RpaIcon>
        <RpaIcon icon='copy'></RpaIcon>
        <p>Hello Vite +1 React!</p>
        <p>
          <div className='border'>

          </div>
          <button type="button" onClick={() => setCount((count) => count + 1)}>
            count is: {count}
          </button>
        </p>
      </header>
    </div>
  )
}

export default App
