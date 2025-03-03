import { Application } from "express";
import userRouter from './user.routes'
import submissionRouter from './submission.routes'
import leaderboardRouter from './leadboard.routes'

function router(app:Application) {
    app.use("/api/v1/user",userRouter)
    app.use("/api/v1/submission",submissionRouter)
    app.use("/api/v1/leaderboard",leaderboardRouter)
}

export default router;