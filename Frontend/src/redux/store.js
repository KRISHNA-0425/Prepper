import { configureStore } from '@reduxjs/toolkit'
import userSlice from './userSlice.js'
import themeSlice from './themeSlice.js'

export default configureStore({
    reducer:{
        user: userSlice,
        theme: themeSlice,
    },  
})