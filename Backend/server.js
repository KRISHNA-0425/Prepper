import express from 'express'
import dotenv from 'dotenv'
import connectDb from './config/db.js'
import authRouter from './routes/auth.routes.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
dotenv.config()

const app = express()

const port = process.env.PORT || 5000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(cors({
    origin: process.env.SERVER_URL ,
    credentials: true,
}))

app.use("/api/auth", authRouter)


const startServer = async () => {
    try {
        await connectDb()
        app.listen(port, () => {
            console.log(`server is running on port: ${port}`);
        })
    } catch (error) {
        console.log('error in starting the server', error.message);
    }
}

startServer()