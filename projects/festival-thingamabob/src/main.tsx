import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { PasscodeGate } from './components/PasscodeGate.tsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PasscodeGate>
      <App />
    </PasscodeGate>
  </React.StrictMode>,
)
