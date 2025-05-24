import { Router } from "express";
import problemsController from "../controller/problems/problems.controller";
import { admin, auth } from "../middleware/auth";

const router = Router();

router.post("/createProblems",[auth,admin], problemsController.CreateProblems);
router.get("/viewAllProblems", problemsController.ViewAllProblems);
router.get("/viewOneProblems/:id", problemsController.ViewOneProblems);
router.patch("/updateProblems/:id",[auth,admin], problemsController.UpdateProblem);
router.delete("/deleteProblems/:id",[auth,admin], problemsController.DeleteProblem);

router.get("/:id", problemsController.get);

export default router;
