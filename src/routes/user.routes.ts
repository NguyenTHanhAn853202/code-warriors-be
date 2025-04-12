import { Router } from "express";
import { getUser, register, login, changePassword, forgotPassword,resetPassword } from "../controller/user.controller";
import { auth } from "../middleware/auth";
const router = Router();

router.get("/", getUser);
router.post("/register", register);
router.post("/login", login);
router.post("/changePassword",auth,changePassword);
router.post("/forgotPassword",forgotPassword);
router.post("/resetPassword/:token",resetPassword);

export default router;