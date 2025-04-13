import { Router } from "express";
import { getUser, register, login, getUserDetail, changePassword, forgotPassword,resetPassword,validateResetToken,updateProfile } from "../controller/user.controller";
import { auth } from "../middleware/auth";
const router = Router();

router.get("/", getUser);
router.post("/register", register);
router.post("/login", login);
router.post("/changePassword",auth,changePassword);
router.post("/forgotPassword",forgotPassword);
router.post("/resetPassword/:token",resetPassword);
router.get("/validateResetToken/:token",validateResetToken);
router.patch("/updateProfile",auth,updateProfile);
router.get("/info",auth, getUserDetail);

export default router;