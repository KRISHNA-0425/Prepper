import express from 'express'
import { googleAuthController, logout } from '../controllers/googleAuth.controller.js';

const authRouter = express.Router()

authRouter.post('/googleAuth', googleAuthController)
authRouter.get('/logout', logout)


export default authRouter;