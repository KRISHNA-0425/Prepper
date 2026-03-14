import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const isAuth = async (req, res, next) => {

    console.log("JWT_SECRET:", process.env.JWT_SECRET) // 👈 add this
    console.log("Cookie:", req.cookies.token)
    try {
        let token = req.cookies.token;

        if (!token) {
            // ✅ Removed undefined `error` reference
            return res.status(400).json({ message: "Token not found" });
        }

        // ✅ jwt.verify throws if invalid — wrap in try/catch or let the outer catch handle it
        const verifyToken = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = verifyToken.userId;

        next();
    } catch (error) {
        // ✅ Now handles both jwt errors (TokenExpiredError, JsonWebTokenError) and others
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token expired, please login again" });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Invalid token" });
        }
        return res.status(500).json({ message: "Error in isAuth middleware", error: error.message });
    }
}

export default isAuth;