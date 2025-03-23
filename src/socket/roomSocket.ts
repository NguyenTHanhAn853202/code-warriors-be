import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import RoomBattleModel from "../model/room.model";

export default function roomBattleSocket(socket: Socket, io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("create-room", async (username) => {
      const roomId = uuidv4();
      const room = await RoomBattleModel.create({
        roomId,
        players: [username],
        status: "waiting",
      });

      socket.join(roomId);
      io.to(roomId).emit("room-created", roomId);
    });

    socket.on("join-room", async ({ roomId, username }) => {
      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        socket.emit("error", "Phòng không tồn tại!");
        return;
      }

      if (room.players.length >= 2) {
        socket.emit("error", "Phòng đã đầy!");
        return;
      }

      room.players.push(username);
      room.status = "ongoing";
      await room.save();

      socket.join(roomId);
      io.to(roomId).emit("room-joined", room.players);
    });

    socket.on("start-battle", (roomId) => {
      io.to(roomId).emit("start-timer", { time: 60 });
    });

    socket.on("submit-code", ({ roomId, username, code }) => {
      io.to(roomId).emit("code-submitted", { username, code });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}
