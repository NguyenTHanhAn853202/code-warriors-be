import { Router } from "express";
import { auth } from "../middleware/auth";
import matchController from "../controller/match.controller";

const router = Router();

router.get("/:id", matchController.getProblem);
router.get("/result/:matchId", matchController.getResult);
router.post("/get-problemId", matchController.getProblemId);

export default router;
