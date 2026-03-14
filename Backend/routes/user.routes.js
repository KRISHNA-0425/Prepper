import express from 'express'
import { getCurrentUser } from '../controllers/user.controller.js'
import isAuth from '../middleware/isAuth.js'

const userRouter = express.Router()

// only the authenticated user can get the current user
userRouter.get("/currentUser", isAuth, getCurrentUser)


export default userRouter