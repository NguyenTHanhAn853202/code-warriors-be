import { Router } from "express";
import { getUser, register, login } from "../controller/user.controller";

const router = Router();

router.get("/", getUser);
router.post("/register", register);
router.post("/login", login);

export default router;
