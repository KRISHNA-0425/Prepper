import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log('connected to db')
    } catch (error) {
        console.log('unable to connect to db', error.message)
    }
}

export default connectDb
