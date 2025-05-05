// src/socket/room-battle/room-battle.handler.ts
import { Server, Socket } from "socket.io";
import RoomBattle from "../model/room.model";
import problemModel, { IProblem } from "../model/problem.model";

function handleRoomBattle(client: Socket, server: Server) {
  // Tham gia phòng
  client.on("join_room", async ({ roomId, username }) => {
    try {
      console.log("join_room", roomId, username);
      if (!roomId || !username) {
        client.emit("room_join_error", {
          message: "Thiếu thông tin phòng hoặc tên người chơi",
        });
        return;
      }

      const room = await RoomBattle.findOne({ roomId });

      if (!room) {
        client.emit("room_join_error", { message: "Phòng không tồn tại" });
        return;
      }

      if (!room.players.includes(username)) {
        room.players.push(username);
        await room.save();
      }

      client.join(roomId);
      client.emit("room_joined", room);
      server.to(roomId).emit("player_joined", { room, username });

      const updatedRoom = await RoomBattle.findOne({ roomId });
      server.to(roomId).emit("room_updated", updatedRoom);
    } catch (err) {
      client.emit("room_join_error", { message: "Lỗi khi tham gia phòng" });
    }
  });

  // Rời phòng
  client.on("leave_room", async ({ roomId, username }) => {
    try {
      const room = await RoomBattle.findOne({ roomId });
      if (!room) {
        client.emit("error", { message: "Phòng không tồn tại" });
        return;
      }

      client.leave(roomId);
      room.players = room.players.filter((player) => player !== username);

      if (room.players.length === 0 || room.createdBy === username) {
        await RoomBattle.deleteOne({ roomId });
        server.emit("room_deleted", roomId);
      } else {
        await room.save();
        server.to(roomId).emit("player_left", { room, username });
      }
    } catch (err) {
      client.emit("error", { message: "Lỗi khi rời phòng" });
    }
  });

  // Bắt đầu trận đấu
  client.on("start_battle", async ({ roomId, username }) => {
    try {
      const room = await RoomBattle.findOne({ roomId });
      if (!room) {
        return client.emit("error", { message: "Phòng không tồn tại" });
      }
      if (room.createdBy !== username) {
        return client.emit("error", {
          message: "Không có quyền bắt đầu trận đấu",
        });
      }
      if (room.players.length < 2) {
        return client.emit("error", { message: "Cần ít nhất 2 người chơi" });
      }

      const count = await problemModel.countDocuments();
      if (count === 0) {
        return client.emit("error", { message: "Không có bài toán nào" });
      }

      const random = Math.floor(Math.random() * count);

      const randomProblem = await problemModel
        .findOne()
        .skip(random)
        .select("_id title description difficulty timeout startDate endDate");

      if (!randomProblem) {
        return client.emit("error", { message: "Không thể lấy bài toán" });
      }

      // Lưu problemId vào phòng
      room.problems = randomProblem.id;
      room.status = "ongoing";
      room.startedAt = new Date();
      await room.save();

      console.log(`Đã chọn bài toán ${randomProblem._id} cho phòng ${roomId}`);
      console.log("Room after saving:", room);

      server.to(roomId).emit("battle_started", {
        room,
        problemId: randomProblem._id, // Truyền problemId thay vì toàn bộ bài toán
        battleUrl: `/battle?matchId=${roomId}`,
      });
    } catch (err) {
      console.error("Lỗi khi bắt đầu trận đấu:", err);
      client.emit("error", { message: "Lỗi khi bắt đầu trận đấu" });
    }
  });

  // Kết thúc trận đấu
  client.on("end_battle", async ({ roomId, username, winner }) => {
    try {
      const room = await RoomBattle.findOne({ roomId });
      if (!room)
        return client.emit("error", { message: "Phòng không tồn tại" });

      if (room.createdBy !== username)
        return client.emit("error", {
          message: "Không có quyền kết thúc trận",
        });
      if (!room.players.includes(winner))
        return client.emit("error", { message: "Người thắng không hợp lệ" });

      room.status = "finished";
      room.winner = winner;
      room.endedAt = new Date();
      await room.save();

      server.to(roomId).emit("battle_ended", room);
    } catch (err) {
      client.emit("error", { message: "Lỗi khi kết thúc trận đấu" });
    }
  });
}

export default handleRoomBattle;
