import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'

export const backendServerUrl = import.meta.env.VITE_SERVER_URL

function App() {
  return (
    <>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/auth' element={<Auth />} />
      </Routes>
    </>
  )
}

export default App
