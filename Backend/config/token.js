import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config();

const genToken = async (userId) => {
    try {
        const token = jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: "7d" },
        )
        return token
    } catch (error) {
        console.log('error in genToken function', error.message);
    }
}

export default genToken