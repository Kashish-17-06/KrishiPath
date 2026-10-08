import React from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router-dom'
import App from './App'
import {AuthProvider} from './shared/auth'
import {I18nProvider} from './shared/i18n'
import './index.css'
createRoot(document.getElementById('root')).render(<BrowserRouter><I18nProvider><AuthProvider><App/></AuthProvider></I18nProvider></BrowserRouter>)
