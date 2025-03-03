import { Application } from "express";
import userRouter from './user.routes'
import submissionRouter from './submission.routes'

function router(app:Application) {
    app.use("/api/v1/user",userRouter)
    app.use("/api/v1/",submissionRouter)
}

export default router;