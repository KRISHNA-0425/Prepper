import React, { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Auth from './pages/Auth'
import axios from 'axios'
import { Toaster } from 'react-hot-toast'
import { useDispatch } from 'react-redux'
import { setUserData } from './redux/userSlice'
import InterviewPage from './pages/InterviewPage'
import InterViewHistory from './pages/InterViewHistory'
import Pricing from './pages/Pricing'
import InterviewReport from './pages/InterviewReport'


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

      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          // Professional styling to match Slate/Yellow theme
          style: {
            borderRadius: '12px',
            background: '#333',
            color: '#fff',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '14px',
          },
        }}
      />

      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/auth' element={<Auth />} />
        <Route path='/interview' element={<InterviewPage />} />
        <Route path='/history' element={<InterViewHistory/>}/>
        <Route path='/pricing' element={<Pricing/>}/>
        <Route path='/report/:id' element={<InterviewReport/>}/>
      </Routes>
    </>
  )
}

export default App;