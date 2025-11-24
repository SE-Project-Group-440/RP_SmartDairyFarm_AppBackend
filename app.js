import cors from 'cors'
import "dotenv/config"
import express, { response } from "express"
import helmet from "helmet";
import { Logger } from "./Utilities/Logger.js"
import MongoConnect from "./Configurations/DB_Connection.js"

import { errors } from 'celebrate';

import session from "express-session";
import passport from "./Middleware/googleAuth.js";


const app = express()
const PORT = process.env.PORT

app.use(cors({
    origin: 'http://localhost:5173',
    optionsSuccessStatus: 200
}))

// security headers
app.use(helmet());

// Content Security Policy: adjust sources for your needs
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://checkout.stripe.com"],
            connectSrc: ["'self'", "https://checkout.stripe.com"],
            imgSrc: ["'self'", "data:"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            frameSrc: ["'self'", "https://checkout.stripe.com"],
        },
    })
);

app.use(session({ secret: process.env.SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

//middleware
app.use(express.json())

app.use((req, res, next) =>
{
    console.log(req.path, req.method)
    next()
})

//routes
//app.use('/auth', UserRoute)

app.use(errors());

app.listen(PORT, () =>
{
    Logger.info("Connected via Port " + PORT)
    MongoConnect()
})


export default app; 