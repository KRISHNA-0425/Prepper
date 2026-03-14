import React, { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'
import axios from 'axios'

export const backendServerUrl = import.meta.env.VITE_SERVER_URL


function App() {


  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await axios.get(backendServerUrl + '/api/user/currentUser', { withCredentials: true })
        console.log(response.data)
      } catch (error) {
        console.log(`error in getCurrentUser ${error}`)
      }
    }
    getCurrentUser()
  }, [])

  return (
    <>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/auth' element={<Auth />} />
      </Routes>
    </>
  )
}

export default App;