import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage.jsx'
import { PresentationView } from './pages/PresentationView.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/present/:presentationName" element={<PresentationView />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
