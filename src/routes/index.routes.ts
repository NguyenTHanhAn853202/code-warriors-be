import { Application } from "express";
import userRouter from "./user.routes";
import submissionRouter from "./submission.routes";
import leaderboardRouter from "./leadboard.routes";
import problemRoutes from "./problems.routes";
import contestRoutes from "./contests.routes";
import algorithmTypes from "./algorithmTypes.routes";
import room from "./room.routes";
function router(app: Application) {
  app.use("/api/v1/problems", problemRoutes);
  app.use("/api/v1/user", userRouter);
  app.use("/api/v1/submission", submissionRouter);
  app.use("/api/v1/leaderboard", leaderboardRouter);
  app.use("/api/v1/contest", contestRoutes);
  app.use("/api/v1/algorithmTypes", algorithmTypes);
  app.use("/api/v1/room", room);
}

export default router;
