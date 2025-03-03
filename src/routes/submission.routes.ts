import { Router } from "express";
import submissionController from "../controller/submission.controller";

const router = Router();

router.post("/",submissionController.evaluation)

export default router