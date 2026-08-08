import { Router } from "express";
import { summonerRoutes } from "./summoner.routes.js";

// Root API router. Mount each feature module here under its own prefix.
const router = Router();

router.use("/summoners", summonerRoutes);

export { router as routes };