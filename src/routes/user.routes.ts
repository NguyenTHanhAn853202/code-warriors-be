import { Router } from "express";
import { getUser, register } from "../controller/user.controller";

const router = Router();

router.get("/",getUser)
router.post("/register",register)

export default router