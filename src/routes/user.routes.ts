import { Router } from "express";
import { getUser, register, login, getTopUsers,getUserDetail, logout,changePassword, forgotPassword,resetPassword,validateResetToken,updateProfile, getRank } from "../controller/user.controller";
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
router.post("/logout", logout);
router.get("/topUser",getTopUsers);
router.get("/rank",auth,getRank);


export default router;