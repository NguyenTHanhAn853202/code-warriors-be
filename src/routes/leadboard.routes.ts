import { Router } from "express";
import leaderboardController from "../controller/leaderboard.controller";

const router = Router();

router.get("/:problemId",leaderboardController.get)

export default router