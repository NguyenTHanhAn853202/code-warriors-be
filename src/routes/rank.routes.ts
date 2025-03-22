import { Router } from "express";
import RankController from "../controller/rank.controller";

const router = Router();

router.post("/createRanks", RankController.createRanks);
router.get("/viewAllRanks", RankController.viewAllRanks);

export default router;
