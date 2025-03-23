import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import RoomBattleModel from "../../model/room.model";

import { v4 as uuidv4 } from "uuid";
import { AppError } from "../../utils/AppError";
import { httpCode } from "../../utils/httpCode";

class RoomBattleController {
  getAllRooms = expressAsyncHandler(async (req: Request, res: Response) => {
    const rooms = await RoomBattleModel.find();
    res.json({ status: "success", data: rooms });
  });


  
  createRoom = expressAsyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;
    if (!username) throw new AppError("Tên người chơi là bắt buộc!", httpCode.BAD_REQUEST, "error");
  
    const existsUser = await RoomBattleModel.findOne({ players: username });
    if (existsUser) throw new AppError("Người chơi đã ở trong phòng!", httpCode.BAD_REQUEST, "error");
  
    const roomId = uuidv4();
    const newRoom = await RoomBattleModel.create({
      roomId,
      players: [username],
      status: "waiting",
    });
  
    console.log("Phòng vừa tạo:", newRoom);
    res.json({ status: "success", data: newRoom });
  });
  

  joinRoom = expressAsyncHandler(async (req: Request, res: Response) => {
    const { roomId, username } = req.body;
    const room = await RoomBattleModel.findOne({ roomId });

    if (!room) throw new Error("Phòng không tồn tại!");
    if (room.players.length >= 2) throw new Error("Phòng đã đầy!");

    room.players.push(username);
    room.status = "ongoing";
    await room.save();

    res.json({ status: "success", data: room });
  });

  startBattle = expressAsyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.body;
    const room = await RoomBattleModel.findOne({ roomId });

    if (!room) throw new Error("Phòng không tồn tại!");
    room.status = "ongoing";
    await room.save();

    res.json({ status: "success", message: "Trận đấu bắt đầu!" });
  });

  submitCode = expressAsyncHandler(async (req: Request, res: Response) => {
    const { roomId, username, code } = req.body;
    console.log(`Người chơi ${username} gửi code: ${code}`);

    res.json({ status: "success", message: "Code đã nộp!" });
  });
}

export default new RoomBattleController();
