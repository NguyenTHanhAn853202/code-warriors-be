import express from "express";

const router = express.Router();
import RoomBattleController from "../controller/room/room.controller";

router.get("/rooms", RoomBattleController.getAllRooms);
router.post("/create", RoomBattleController.createRoom);
router.get("/roomId/:roomId", RoomBattleController.getRoomDetails);
router.get("/check", RoomBattleController.checkRoom);
router.post("/join", RoomBattleController.joinRoom);
router.post("/leave", RoomBattleController.leaveRoom);
router.post("/start", RoomBattleController.startBattle);
// router.post("/submit-code", RoomBattleController.submitCode);

export default router;
