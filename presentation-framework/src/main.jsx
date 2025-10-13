import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PresentationLoader } from './PresentationLoader.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PresentationLoader />
  </StrictMode>,
)
