import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Web3OnboardProvider } from "@web3-onboard/react";
import { onboard } from "./wallet/onboard";
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Web3OnboardProvider web3Onboard={onboard}>
        <App />
      </Web3OnboardProvider>
    </BrowserRouter>
  </React.StrictMode>
)