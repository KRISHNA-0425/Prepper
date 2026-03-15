import React, { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'

export const backendServerUrl = import.meta.env.VITE_SERVER_URL


function App() {

  const dispatch = useDispatch()

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await axios.get(backendServerUrl + '/api/user/currentUser', { withCredentials: true })
        // console.log(response.data)
        dispatch(setUserData(response.data)) // setting the current user in the userData in userSlice 
      } catch (error) {
        console.log(`error in getCurrentUser ${error}`)
        dispatch(setUserData(null))
      }
    }
    getCurrentUser()
  }, [dispatch]) // due to this ever the userData is updated the function will work

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