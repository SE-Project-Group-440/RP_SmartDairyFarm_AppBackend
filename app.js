import cors from 'cors'
import "dotenv/config"
import express, { response } from "express"
import helmet from "helmet";
import { Logger } from "./Utilities/Logger.js"
import MongoConnect from "./Configurations/DB_Connection.js"
import { errors } from 'celebrate';
import session from "express-session";
import passport from "./Middleware/googleAuth.js";
import UserRoute from "./Routes/UserRoute.js"
import CowRoute from "./Routes/CowRoute.js"
import LactationCycleRoute from "./Routes/LactationCycleRoutes.js"
import MilkingRecordRoute from "./Routes/MilkingRecordRoutes.js"
import recommendationRoute from "./Routes/recommendationRoutes.js"
import analyticsRoute from "./Routes/AnalyticsRoute.js"
import DashboardRoute from "./Routes/DashboardRoute.js"

const app = express()
const PORT = process.env.PORT

// app.use(cors({
//     origin: 'http://localhost:5173',
//     optionsSuccessStatus: 200
// }))

app.use(cors())

// security headerss
app.use(helmet());

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
app.use("/auth", UserRoute);
app.use("/cows",  CowRoute);
app.use("/lact",  LactationCycleRoute);
app.use("/milk",  MilkingRecordRoute);
app.use("/rec",  recommendationRoute);
app.use("/analytics", analyticsRoute);
app.use("/dashboard", DashboardRoute);

app.use(errors()); 

app.listen(PORT, () =>
{
    Logger.info("Connected via Port " + PORT)
    MongoConnect()
})


export default app; 