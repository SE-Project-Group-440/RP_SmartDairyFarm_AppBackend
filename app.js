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
import aiRecommendationRoutes from "./Routes/ai_prediction_routes.js";
import recommendationRoute from "./Routes/recommendationRoutes.js"
import analyticsRoute from "./Routes/AnalyticsRoute.js"
import DashboardRoute from "./Routes/DashboardRoute.js"
import RetrainingPipelineRoute from "./Routes/RetrainingPipelineRoutes.js"

import SttRoute from "./Routes/SttRoute.js";
// import cattleDiseaseRoutes from "./Routes/CattleDiseaseRoutes.js"
import ChatRouter from "./Routes/ChatRoute.js";
import CattleHeatRoutes from "./Routes/CattleHeatRoutes.js";
import SprinklerRoutes from "./Routes/SprinklerRoutes.js";
import { startSprinklerAutoService } from "./Services/SprinklerAutoService.js";
 

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
app.use("/cattle", cattleDiseaseRoutes);

app.use("/api/ai", aiRecommendationRoutes);
app.use("/rec",  recommendationRoute);
app.use("/analytics", analyticsRoute);
app.use("/dashboard", DashboardRoute);

app.use("/pipeline", RetrainingPipelineRoute);

app.use("/stt", SttRoute);
app.use("/chat", ChatRouter);

app.use("/cattle", cattleDiseaseRoutes);
app.use("/cattle-heat", CattleHeatRoutes);
app.use("/sprinkler", SprinklerRoutes);



app.use(errors()); 

app.listen(PORT, "0.0.0.0", () => 
{
    Logger.info("Connected via Port " + PORT)
    MongoConnect()
    startSprinklerAutoService();
    console.log("Server running on port 8000");
})


export default app; 