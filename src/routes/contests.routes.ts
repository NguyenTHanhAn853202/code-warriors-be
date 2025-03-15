import { Router } from "express";
import contestController from "../controller/contests/contests.controller";

const router = Router();

router.post("/createContest", contestController.CreateContest);
router.get("/viewAllContest", contestController.ViewAllContests);
router.patch("/updateContest/:id", contestController.UpdateContest);
router.delete("/deleteContest/:id", contestController.DeleteContest);
router.get("/FeaturedContest", contestController.GetLatestContests);

export default router;
