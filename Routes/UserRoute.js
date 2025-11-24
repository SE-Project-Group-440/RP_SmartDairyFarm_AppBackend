import express from 'express'

import UserController from '../Controllers/UserController.js'
import requireAuth from '../Middleware/UserAuth.js'
import passport from "../Middleware/googleAuth.js";
import jwt from "jsonwebtoken";
const UserRoute = express.Router()

// login route
UserRoute.post('/login', UserController.loginUser)

// signup route
UserRoute.post('/signup', UserController.signupUser)

// In your routes
UserRoute.post('/logout', UserController.logoutUser);

// Get user details (protected)
UserRoute.get('/me', requireAuth, UserController.getUserDetails);

UserRoute.get('/getAll', UserController.getAllUsers);


//GOOGLE AUTH
UserRoute.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

UserRoute.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "http://localhost:5173/login" }),
    (req, res) =>
    {
        // Create JWT from Google user
        const token = jwt.sign({ _id: req.user._id }, process.env.SECRET, { expiresIn: "3d" });

        // Redirect to frontend with token
        res.redirect(`http://localhost:5173/oauth-success?token=${token}`);
    }
);
export default UserRoute;