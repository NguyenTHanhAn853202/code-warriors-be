import { Router } from "express";
import submissionController from "../controller/submission.controller";
import { auth } from "../middleware/auth";
import express from "express";

const router = Router();

router.post("/", auth, submissionController.evaluation);
router.post("/run", submissionController.run);
router.post("/submitRoom", auth, submissionController.submitRoomBattle);
router.get("/history/:problemId", auth, submissionController.historySubmit);
router.get("/top3/:problemId", submissionController.getTop3Leaderboard);
router.get("/matchResult/:roomId", submissionController.getBattleResult);

export default router;
