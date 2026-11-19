import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Console from './console/Console'
import './style.css'
createRoot(document.getElementById('root')!).render(<StrictMode><Console/></StrictMode>)
