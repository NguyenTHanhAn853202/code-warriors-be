import { Router } from "express";
import problemsController from "../controller/problems/problems.controller";
import { auth } from "../middleware/auth";

const router = Router();

router.post("/createProblems", problemsController.CreateProblems);
router.get("/viewAllProblems", problemsController.ViewAllProblems);
router.get("/viewOneProblems/:id", problemsController.ViewOneProblems);
router.patch("/updateProblems/:id", problemsController.UpdateProblem);
router.delete("/deleteProblems/:id", problemsController.DeleteProblem);

router.get("/:id", problemsController.get);

export default router;
