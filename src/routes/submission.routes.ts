import { Router } from "express";
import submissionController from "../controller/submission.controller";
import { auth } from "../middleware/auth";

const router = Router();

router.post("/",auth,submissionController.evaluation)
router.post("/run",submissionController.run)
router.get("/history/:problemId",auth,submissionController.historySubmit)

export default router