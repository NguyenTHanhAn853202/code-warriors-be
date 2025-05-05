import express from "express";

const router = express.Router();
import RoomBattleController from "../controller/room/room.controller";
import { auth } from "../middleware/auth";

router.get("/", RoomBattleController.getRooms);

router.post("/", RoomBattleController.createRoom);

router.post("/join", RoomBattleController.joinRoom);

router.delete("/:roomId/leave", RoomBattleController.leaveRoom);
router.get("/:roomId", RoomBattleController.getRoomById);

router.post("/submit",auth,RoomBattleController.submit)

export default router;
