import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const isAuth = async (req, res, next) => {
    try {
        let token = req.cookies?.token;

        // Fallback to Authorization: Bearer <token> header when third-party cookies are blocked
        if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1]?.trim();
        }

        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({ message: "Token not found" });
        }

        const verifyToken = jwt.verify(token, process.env.JWT_SECRET);

        if (!verifyToken) {
            return res.status(401).json({ message: "user don't have verified token" });
        }

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