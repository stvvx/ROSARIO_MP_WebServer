import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RosarioPage from './RosarioPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RosarioPage />
  </StrictMode>,
)
