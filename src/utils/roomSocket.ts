import { Server } from "socket.io";

export const setupSocket = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Thay bằng URL frontend nếu có
      methods: ["GET", "POST"],
    },
  });

  const rooms: Record<string, string[]> = {};

  io.on("connection", (socket) => {
    console.log("🔌 Người chơi kết nối:", socket.id);

    socket.on("create-room", (username: string) => {
      const roomId = `room-${Date.now()}`;
      rooms[roomId] = [username];
      socket.join(roomId);
      socket.emit("room-created", roomId);
    });

    socket.on("join-room", ({ roomId, username }) => {
      if (rooms[roomId] && rooms[roomId].length < 2) {
        rooms[roomId].push(username);
        socket.join(roomId);
        io.to(roomId).emit("room-joined", rooms[roomId]);
      } else {
        socket.emit("room-full");
      }
    });

    socket.on("start-battle", (roomId) => {
      io.to(roomId).emit("start-timer", { time: 300 }); // 5 phút đấu
    });

    socket.on("submit-code", ({ roomId, username, code }) => {
      io.to(roomId).emit("code-submitted", { username, code });
    });

    socket.on("disconnect", () => {
      console.log("❌ Người chơi rời khỏi:", socket.id);
    });
  });

  return io; // Trả về `io`
};
