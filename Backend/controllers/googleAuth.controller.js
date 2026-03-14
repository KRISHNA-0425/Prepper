// step 01- Get the data from the frontend
// step 02- Create a user with the help of the same data
// step 03- generate a token for the user
// step 04- store the token in the cookie

import genToken from "../config/token.js";
import User from "../models/user.model.js";
import dotenv from 'dotenv'

dotenv.config();


export const googleAuthController = async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: "Invalid Credentials" })
        }

        let user = await User.findOne({ email })

        if (!user) {
            user = await User.create({
                name: name,
                email: email,
            })
        }

        let token = genToken(user._id)
        res.cookie("token", token, {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: 'strict'
        })

        return res.status(200).json({ message: "user created", user })

    } catch (error) {
        return res.status(500).json({ message: `internal server error in googleAuthController ${error}` })
    }
}


export const logout = async (_, res) => {
    try {
        await res.clearCookie('token') // clears the cookie of name token
        return res.status(200).json({ message: "logout successful" });
    } catch (error) {
        return res.status(500).json({ message: "internal server error in logout controller" });
    }
}