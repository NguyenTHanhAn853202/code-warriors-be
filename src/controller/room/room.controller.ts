import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import RoomBattleModel from "../../model/room.model";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../../utils/AppError";
import { httpCode } from "../../utils/httpCode";
import { comparePassword, hashPassword } from "../../utils/hashPassword";
import { status } from "../../utils/response";

class RoomBattleController {
  getRooms = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const rooms = await RoomBattleModel.find({ status: "waiting" });

      res.json({
        status: "success",  
        data: rooms,
      });
    }
  );

  // Tạo phòng mới
  createRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { maxPlayers, isPrivate, password } = req.body;
      // const username = req.user.username;
      const username = req.body.username;

      const hashedPassword = password
        ? await hashPassword(password)
        : undefined;

      const newRoom = await RoomBattleModel.create({
        roomId: uuidv4(),
        players: [username],
        maxPlayers: maxPlayers || 4,
        createdBy: username,
        isPrivate,
        password: hashedPassword,
        status: "waiting",
      });
      console.log("infor room", newRoom);

      res.status(httpCode.OK).json({
        status: "success",
        data: newRoom,
      });
    }
  );

  joinRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId, password } = req.body;
      // const username = req.user.username;
      const username = req.body.username;
      if (!username) {
        throw new AppError(
          "Username is required",
          httpCode.UNAUTHORIZED,
          "error"
        );
      }
      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Room not found", httpCode.NOT_FOUND, "error");
      }

      if (room.status !== "waiting") {
        throw new AppError(
          "Room is not available",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      if (room.players.length >= room.maxPlayers) {
        throw new AppError("Room is full", httpCode.BAD_REQUEST, "error");
      }

      if (room.players.includes(username)) {
        throw new AppError("Already in room", httpCode.BAD_REQUEST, "error");
      }

      if (room.isPrivate && password !== room.password) {
        throw new AppError("Invalid password", httpCode.UNAUTHORIZED, "error");
      }
      if (room.isPrivate) {
        const isMatch = await comparePassword(password, room.password);
        if (!isMatch) {
          throw new AppError(
            "Invalid password",
            httpCode.UNAUTHORIZED,
            "error"
          );
        }
      }

      room.players.push(username);
      await room.save();

      res.json({
        status: "success",
        data: room,
      });
    }
  );

  leaveRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId } = req.body;
      // const username = req.user.username;
      const username = req.body.username;

      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Room not found", httpCode.NOT_FOUND, "error");
      }

      if (!room.players.includes(username)) {
        throw new AppError("Not in room", httpCode.BAD_REQUEST, "error");
      }
      if (room.createdBy === username) {
        await RoomBattleModel.deleteOne({ roomId });
        res.json({
          status: "success",
          message: "Room deleted as creator left",
        });
      }
      if (room.status !== "waiting") {
        throw new AppError(
          "Cannot leave after game started",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      room.players = room.players.filter((player) => player !== username);
      await room.save();

      res.json({
        status: "success",
        data: room,
      });
    }
  );

  getRoomById = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId } = req.params;
      const room = await RoomBattleModel.findOne({ roomId });
      if (!room) {
        throw new AppError("Room not found", httpCode.NOT_FOUND, "error");
      }
      res.status(httpCode.OK).json({
        status: "success",
        data: room,
      });
    }
  );
}

export default new RoomBattleController();
