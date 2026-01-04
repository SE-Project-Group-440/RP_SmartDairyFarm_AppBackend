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
import cattleDiseaseRoutes from "./Routes/CattleDiseaseRoutes.js"
 
 
const app = express()
const PORT = process.env.PORT
 
 
// const allowedOrigins = [
//   "http://localhost:5173",      // Vite frontend
//   "http://localhost:8081",      // Expo Web dev
//   "http://localhost:19000",     // Expo web default
//   "http://127.0.0.1:19000",
//   "http://192.168.1.10:19000"  // Expo Go mobile (replace with your PC LAN IP)
// ];
 
app.use(cors());
 
 
// security headers
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
app.use("/cattle", cattleDiseaseRoutes);
 
 
app.use(errors());
 
app.listen(PORT, () =>
{
    Logger.info("Connected via Port " + PORT)
    MongoConnect()
})
 
 
export default app;