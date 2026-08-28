import { Router } from "express";
import { summonerRoutes } from "./summoner.routes.js";
import { staticRoutes } from "./static.routes.js";
import { analyticsRoutes } from "./analytics.routes.js";
import { matchRoutes } from "./matches.routes.js";

// Root API router. Mount each feature module here under its own prefix.
const router = Router();

router.use("/summoners", summonerRoutes);
router.use("/static", staticRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/matches", matchRoutes);

export { router as routes };