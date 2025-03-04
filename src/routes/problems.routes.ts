import { Router } from "express";
import problemsController from "../controller/problems/problems.controller";

const router = Router();

router.get("/a", problemsController.Hello);

export default router;
