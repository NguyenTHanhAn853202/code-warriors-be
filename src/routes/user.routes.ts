import { Router } from "express";
import { getUser } from "../controller/user.controller";

const router = Router();

router.get("/",getUser)

export default router