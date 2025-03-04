import { Router } from "express";
import problemsController from "../controller/problems/problems.controller";

const router = Router();

router.post("/createProblems", problemsController.CreateProblems);
router.get("/viewAllProblems", problemsController.ViewAllProblems);

export default router;
