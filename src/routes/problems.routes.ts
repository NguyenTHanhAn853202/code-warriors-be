import { Router } from "express";
import problemsController from "../controller/problems/problems.controller";

const router = Router();

router.post("/createProblems", problemsController.CreateProblems);
router.get("/viewAllProblems", problemsController.ViewAllProblems);
router.patch("/updateProblems/:id", problemsController.UpdateProblem)
router.delete("/deleteProblems/:id", problemsController.DeleteProblem)

export default router;
