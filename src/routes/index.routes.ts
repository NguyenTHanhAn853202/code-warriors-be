import { Application } from "express";
import userRouter from './user.routes'

function router(app:Application) {
    app.use("/api/v1/user",userRouter)
}

export default router;