import User from "../models/user.model.js"

export const getCurrentUser = async (req, res) => {
    try {
        // because we are using the middleware isAuth
        // that gives the userId of the current user
        const userId = req.userId

        const user = await User.findById(userId) // finding the user with the help of the userId 

        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }

        return res.status(200).json(user);

    } catch (error) {
        return res.status(500).json({ message: "error in getCurrentUser Controller", error })
    }
}