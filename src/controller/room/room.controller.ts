import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import RoomBattleModel from "../../model/room.model";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../../utils/AppError";
import { httpCode } from "../../utils/httpCode";
import { comparePassword, hashPassword } from "../../utils/hashPassword";

class RoomBattleController {
  getAllRooms = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { status } = req.query;

      const filter = status ? { status } : {};
      const rooms = await RoomBattleModel.find(filter).sort({ createdAt: -1 });

      res.json({ status: "success", data: rooms });
    }
  );

  getRoomDetails = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId } = req.params;

      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Phòng không tồn tại!", httpCode.NOT_FOUND, "error");
      }

      res.json({
        status: "success",
        data: room,
      });
    }
  );

  checkRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId } = req.params;
      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Phòng không tồn tại!", httpCode.NOT_FOUND, "error");
      }

      res.json({
        status: "success",
        exists: true,
        data: { roomId },
      });
    }
  );

  // Tạo phòng mới với mật khẩu
  // Tạo phòng mới
  createRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        username,
        maxPlayers = 4,
        isPrivate = false,
        password,
      } = req.body;

      if (!username) {
        throw new AppError(
          "Username là bắt buộc!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      // Kiểm tra mật khẩu nếu phòng riêng tư
      if (isPrivate && !password) {
        throw new AppError(
          "Mật khẩu là bắt buộc cho phòng riêng tư!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      const roomId = uuidv4();

      // Tạo object room với các trường cơ bản
      const roomData: any = {
        roomId,
        players: [username],
        status: "waiting",
        maxPlayers,
        createdBy: username,
        isPrivate,
      };

      // Thêm và hash mật khẩu nếu là phòng riêng tư
      if (isPrivate) {
        roomData.password = await hashPassword(password);
      }

      const room = await RoomBattleModel.create(roomData);

      // Không trả về mật khẩu trong response
      const roomResponse = room.toObject();
      delete roomResponse.password;

      res.status(201).json({
        status: "success",
        data: roomResponse,
      });

      // Thông báo cho tất cả client có phòng mới
      if (req.app.locals.io) {
        req.app.locals.io.emit("room-list-updated", {
          action: "created",
          room: roomResponse,
        });
      }
    }
  );

  joinRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId, username, password } = req.body;

      if (!roomId || !username) {
        throw new AppError(
          "roomId và username là bắt buộc!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      // Tìm phòng với mật khẩu nếu có
      const room = await RoomBattleModel.findOne({ roomId }).select(
        "+password"
      );

      if (!room) {
        throw new AppError("Phòng không tồn tại!", httpCode.NOT_FOUND, "error");
      }

      if (room.status !== "waiting") {
        throw new AppError(
          "Phòng không thể tham gia vì không phải trạng thái chờ",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      // Kiểm tra mật khẩu nếu phòng riêng tư
      if (room.isPrivate) {
        if (!password) {
          throw new AppError(
            "Phòng này yêu cầu mật khẩu để tham gia!",
            httpCode.UNAUTHORIZED,
            "error"
          );
        }

        const isMatch = await comparePassword(password, room.password);
        if (!isMatch) {
          throw new AppError(
            "Mật khẩu không đúng!",
            httpCode.UNAUTHORIZED,
            "error"
          );
        }
      }

      if (room.players.length >= room.maxPlayers) {
        throw new AppError("Phòng đã đầy", httpCode.BAD_REQUEST, "error");
      }

      // Kiểm tra nếu người chơi đã trong phòng
      if (room.players.includes(username)) {
        // Loại bỏ password trước khi trả về
        const roomResponse = room.toObject();
        delete roomResponse.password;

        res.status(200).json({
          status: "success",
          message: "Bạn đã ở trong phòng này rồi!",
          data: roomResponse,
        });
      }

      // Thêm người chơi vào phòng
      room.players.push(username);
      await room.save();

      // Loại bỏ password trước khi trả về và gửi qua socket
      const roomResponse = room.toObject();
      delete roomResponse.password;

      // Thông báo cho tất cả người trong phòng
      if (req.app.locals.io) {
        req.app.locals.io
          .to(roomId)
          .emit("player-joined", { username, room: roomResponse });
        req.app.locals.io.to(roomId).emit("room-updated", roomResponse);

        // Thông báo cho tất cả client về việc phòng được cập nhật
        req.app.locals.io.emit("room-list-updated", {
          action: "updated",
          room: roomResponse,
        });
      }

      res.status(200).json({
        status: "success",
        message: "Tham gia phòng thành công",
        data: roomResponse,
      });
    }
  );

  leaveRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId, username } = req.body;
  
      if (!roomId || !username) {
        throw new AppError(
          "roomId và username là bắt buộc!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }
  
      const room = await RoomBattleModel.findOne({ roomId });
  
      if (!room) {
        throw new AppError("Phòng không tồn tại!", httpCode.NOT_FOUND, "error");
      }
  
      // Kiểm tra người chơi có trong phòng không
      if (!room.players.includes(username)) {
        throw new AppError(
          "Bạn không ở trong phòng này!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }
  
      // Xóa người chơi khỏi phòng
      room.players = room.players.filter((player) => player !== username);
  
      // Nếu không còn ai trong phòng, xóa phòng
      if (room.players.length === 0) {
        await RoomBattleModel.deleteOne({ roomId });
  
        if (req.app.locals.io) { 
          req.app.locals.io.emit("room-list-updated", {
            action: "deleted",
            roomId,
          });
        }
  
         res.json({  // Thêm return ở đây
          status: "success",
          message: "Đã rời phòng và phòng đã bị xóa do không còn người chơi",
        });
      }
  
      // Nếu còn người trong phòng, lưu phòng
      await room.save();
  
      // Loại bỏ mật khẩu trước khi gửi
      const roomResponse = room.toObject();
      delete roomResponse.password;
  
      if (req.app.locals.io) {
        req.app.locals.io
          .to(roomId)
          .emit("player-left", { username, room: roomResponse });
        req.app.locals.io.to(roomId).emit("room-updated", roomResponse);
        req.app.locals.io.emit("room-list-updated", {
          action: "updated",
          room: roomResponse,
        });
      }
  
      res.json({
        status: "success",
        message: "Đã rời phòng thành công",
      });
    }
  );
  

  startBattle = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId, username } = req.body;

      if (!roomId || !username) {
        throw new AppError(
          "roomId và username là bắt buộc!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Phòng không tồn tại!", httpCode.NOT_FOUND, "error");
      }

      // Kiểm tra xem người yêu cầu có phải là chủ phòng không
      // Nếu có trường createdBy thì sử dụng, nếu không thì dùng người chơi đầu tiên
      const roomOwner = room.createdBy || room.players[0];
      if (roomOwner !== username) {
        throw new AppError(
          "Chỉ chủ phòng mới có thể bắt đầu trận đấu!",
          httpCode.FORBIDDEN,
          "error"
        );
      }

      if (room.players.length < 2) {
        throw new AppError(
          "Cần ít nhất 2 người chơi để bắt đầu trận đấu!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      room.status = "ongoing";
      room.startedAt = new Date();
      await room.save();

      if (req.app.locals.io) {
        req.app.locals.io.to(roomId).emit("game-started", room);
        req.app.locals.io.emit("room-list-updated", {
          action: "updated",
          room,
        });
      }

      res.json({
        status: "success",
        message: "Trận đấu đã bắt đầu!",
        data: room,
      });
    }
  );

  // Nộp code
  submitCode = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId, username, code } = req.body;

      if (!roomId || !username || !code) {
        throw new AppError(
          "roomId, username và code là bắt buộc!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Phòng không tồn tại!", httpCode.NOT_FOUND, "error");
      }

      if (room.status !== "ongoing") {
        throw new AppError(
          "Trận đấu chưa bắt đầu hoặc đã kết thúc!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      if (!room.players.includes(username)) {
        throw new AppError(
          "Bạn không ở trong phòng này!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      // Khởi tạo mảng submissions nếu chưa có
      if (!room.submissions) {
        room.submissions = [];
      }

      // Thêm bài nộp mới
      const submission = {
        username,
        code,
        submittedAt: new Date(),
      };

      room.submissions.push(submission);
      await room.save();

      if (req.app.locals.io) {
        req.app.locals.io.to(roomId).emit("code-submitted", {
          username,
          submittedAt: submission.submittedAt,
        });
      }

      res.json({
        status: "success",
        message: "Code đã được nộp thành công!",
      });
    }
  );

  // Kết thúc trận đấu
  endBattle = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId, username, winner } = req.body;

      if (!roomId || !username) {
        throw new AppError(
          "roomId và username là bắt buộc!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Phòng không tồn tại!", httpCode.NOT_FOUND, "error");
      }

      // Kiểm tra xem người yêu cầu có phải là chủ phòng không
      const roomOwner = room.createdBy || room.players[0];
      if (roomOwner !== username) {
        throw new AppError(
          "Chỉ chủ phòng mới có thể kết thúc trận đấu!",
          httpCode.FORBIDDEN,
          "error"
        );
      }

      if (room.status !== "ongoing") {
        throw new AppError(
          "Trận đấu chưa bắt đầu hoặc đã kết thúc!",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      // Cập nhật trạng thái phòng - đảm bảo phù hợp với model
      // Lưu ý: Trong model bạn dùng "finished", nhưng ở đây dùng "ended"
      // Nên thống nhất lại
      room.status = "finished"; // Cập nhật thành "finished" để phù hợp với model

      // Thêm trường endedAt nếu model của bạn có hỗ trợ
      if ("endedAt" in room) {
        room.endedAt = new Date();
      }

      if (winner) {
        room.winner = winner;
      }

      await room.save();

      if (req.app.locals.io) {
        req.app.locals.io.to(roomId).emit("game-ended", {
          room,
          winner,
        });

        req.app.locals.io.emit("room-list-updated", {
          action: "updated",
          room,
        });
      }

      res.json({
        status: "success",
        message: "Trận đấu đã kết thúc!",
        data: { room, winner },
      });
    }
  );
}

export default new RoomBattleController();
