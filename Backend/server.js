import express from 'express'
import dotenv from 'dotenv'
import connectDb from './config/db.js'
import authRouter from './routes/auth.routes.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import userRouter from './routes/user.routes.js'
import interviewRouter from './routes/interview.routes.js'
import helmet from 'helmet'
import paymentRouter from './routes/payment.routes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 5000

// Required on Render so Express trusts HTTPS headers forwarded by Render's reverse proxy
app.set('trust proxy', 1)

app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use(cors({
  origin: process.env.SERVER_URL,
  credentials: true,
}))

app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/interview", interviewRouter)
app.use("/api/payment", paymentRouter)

const startServer = async () => {
  try {
    await connectDb()
    app.listen(port, () => {
      console.log(`Server is running on port: ${port}`)
    })
  } catch (error) {
    console.log('Error starting the server:', error.message)
  }
}

startServer()