import { Router } from "express";
import contestController from "../controller/contest.controller";
import { auth } from "../middleware/auth";

const router = Router();

router.post("/createContest", auth, contestController.createContest);
router.get("/viewAllContest", contestController.viewAllContests);
router.get("/FeaturedContest", contestController.GetLatestContests);
router.patch("/updateContest/:id",contestController.updateContest);
router.delete("/deleteContest/:id",contestController.deleteContest);
router.get("/viewDetailContest/:id", contestController.viewContestDetail);
router.get("/viewAllMyContest", auth, contestController.viewAllMyContests);

export default router;
