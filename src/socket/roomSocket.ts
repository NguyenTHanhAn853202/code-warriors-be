import { Server, Socket } from "socket.io";
import RoomBattleModel from "../model/room.model";
import { v4 as uuidv4 } from "uuid";
import { comparePassword, hashPassword } from "../utils/hashPassword";

// Socket handler cho phòng đấu
export default function roomBattle(socket: Socket, io: Server) {
  // Xử lý tạo phòng
  socket.on("create-room", async (data) => {
    try {
      const { username, maxPlayers = 4, isPrivate = false, password } = data;
      console.log(`[${new Date().toISOString()}] 🏠 Room creation requested by: ${username}`);
      
      // Kiểm tra nếu phòng riêng tư nhưng không có mật khẩu
      if (isPrivate && !password) {
        console.log(`[${new Date().toISOString()}] ❌ Private room without password requested by: ${username}`);
        return socket.emit("error", "Phòng riêng tư cần có mật khẩu!");
      }
      
      const roomId = uuidv4();
      
      // Chuẩn bị dữ liệu phòng
      const roomData: any = {
        roomId,
        players: [username],
        status: "waiting",
        maxPlayers,
        createdBy: username,
        isPrivate
      };
      
      // Thêm mật khẩu đã hash nếu là phòng riêng tư
      if (isPrivate && password) {
        const hashedPassword = await hashPassword(password);
        if (hashedPassword) {
          roomData.password = hashedPassword;
        }
      }
      
      // Tạo phòng trong database
      const room = await RoomBattleModel.create(roomData);

      // Lưu thông tin vào socket
      socket.data.username = username;
      socket.data.roomId = roomId;
      socket.join(roomId);

      // Chuẩn bị dữ liệu phòng để gửi về client (không có mật khẩu)
      const roomResponse = room.toObject();
      delete roomResponse.password;

      console.log(`[${new Date().toISOString()}] ✅ Room created: ${roomId} by ${username} (private: ${isPrivate})`);
      socket.emit("room-created", roomResponse);
      io.emit("room-list-updated", {
        action: "created",
        room: roomResponse,
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error creating room:`, error);
      socket.emit("error", "Lỗi khi tạo phòng!");
    }
  });

  // Xử lý tham gia phòng
  socket.on("join-room", async ({ roomId, username, password }) => {
    try {
      console.log(`[${new Date().toISOString()}] 🚪 Join room request: ${username} -> ${roomId}`);
      
      // Tìm phòng với mật khẩu nếu có
      const room = await RoomBattleModel.findOne({ roomId }).select('+password');

      if (!room) {
        console.log(`[${new Date().toISOString()}] ❌ Room not found: ${roomId}`);
        return socket.emit("error", "Phòng không tồn tại!");
      }

      if (room.status !== "waiting") {
        console.log(`[${new Date().toISOString()}] ❌ Room not in waiting status: ${roomId} (${room.status})`);
        return socket.emit(
          "error",
          "Phòng không thể tham gia vì không phải trạng thái chờ"
        );
      }

      // Kiểm tra mật khẩu nếu phòng riêng tư
      if (room.isPrivate) {
        if (!password) {
          console.log(`[${new Date().toISOString()}] ❌ No password provided for private room: ${roomId}`);
          return socket.emit("error", "Phòng này yêu cầu mật khẩu để tham gia!");
        }
        
        const isMatch = await comparePassword(password, room.password);
        if (!isMatch) {
          console.log(`[${new Date().toISOString()}] ❌ Incorrect password for room: ${roomId}`);
          return socket.emit("error", "Mật khẩu không đúng!");
        }
        
        console.log(`[${new Date().toISOString()}] ✅ Password verified for private room: ${roomId}`);
      }

      if (room.players.length >= room.maxPlayers) {
        console.log(`[${new Date().toISOString()}] ❌ Room is full: ${roomId} (${room.players.length}/${room.maxPlayers})`);
        return socket.emit("error", "Phòng đã đầy!");
      }

      // Kiểm tra nếu người chơi đã trong phòng
      if (room.players.includes(username)) {
        console.log(`[${new Date().toISOString()}] ℹ️ User already in room: ${username} in ${roomId}`);
        socket.data.username = username;
        socket.data.roomId = roomId;
        socket.join(roomId);
        
        // Loại bỏ mật khẩu trước khi gửi
        const roomResponse = room.toObject();
        delete roomResponse.password;
        
        return socket.emit("room-updated", roomResponse);
      }

      // Thêm người chơi vào phòng
      room.players.push(username);
      await room.save();

      socket.data.username = username;
      socket.data.roomId = roomId;
      socket.join(roomId);

      // Loại bỏ mật khẩu trước khi gửi
      const roomResponse = room.toObject();
      delete roomResponse.password;

      console.log(`[${new Date().toISOString()}] ✅ User joined room: ${username} -> ${roomId}`);
      console.log(`[${new Date().toISOString()}] 👥 Current players: ${room.players.join(', ')}`);
      
      io.to(roomId).emit("player-joined", { username, room: roomResponse });
      io.to(roomId).emit("room-updated", roomResponse);
      io.emit("room-list-updated", {
        action: "updated",
        room: roomResponse,
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error joining room:`, error);
      socket.emit("error", "Lỗi khi tham gia phòng!");
    }
  });

  socket.on("leave-room", async () => {
    try {
      const username = socket.data.username;
      const roomId = socket.data.roomId;

      if (!username || !roomId) {
        console.log(`[${new Date().toISOString()}] ❌ Leave room failed: No room or username in socket data`);
        return socket.emit("error", "Bạn không ở trong phòng nào!");
      }

      console.log(`[${new Date().toISOString()}] 🚶 User leaving room: ${username} from ${roomId}`);
      
      const room = await RoomBattleModel.findOne({ roomId });
      if (!room) {
        console.log(`[${new Date().toISOString()}] ❌ Room not found: ${roomId}`);
        return socket.emit("error", "Phòng không tồn tại!");
      }

      // Xóa người chơi khỏi phòng
      room.players = room.players.filter((player) => player !== username);
      console.log(`[${new Date().toISOString()}] ℹ️ Remaining players: ${room.players.join(', ') || 'none'}`);

      // Nếu không còn ai trong phòng, xóa phòng
      if (room.players.length === 0) {
        await RoomBattleModel.deleteOne({ roomId });
        console.log(`[${new Date().toISOString()}] 🗑️ Room deleted: ${roomId} (no players left)`);
        
        io.emit("room-list-updated", {
          action: "deleted",
          roomId,
        });
      } else {
        await room.save();
        console.log(`[${new Date().toISOString()}] ✅ Room updated after user left: ${roomId}`);
        
        // Loại bỏ mật khẩu trước khi gửi
        const roomResponse = room.toObject();
        delete roomResponse.password;
        
        io.to(roomId).emit("player-left", { username, room: roomResponse });
        io.to(roomId).emit("room-updated", roomResponse);
        io.emit("room-list-updated", {
          action: "updated",
          room: roomResponse,
        });
      }

      socket.leave(roomId);
      delete socket.data.roomId;
      socket.emit("left-room-success");
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error leaving room:`, error);
      socket.emit("error", "Lỗi khi rời phòng!");
    }
  });
  socket.on('disconnect', async () => {
    try {
      const username = socket.data.username;
      const roomId = socket.data.roomId;
  
      // Nếu không có thông tin người dùng hoặc phòng, không làm gì cả
      if (!username || !roomId) {
        return;
      }
  
      console.log(`[${new Date().toISOString()}] 🔌 User disconnected: ${username} from room ${roomId}`);
      
      // Tìm phòng
      const room = await RoomBattleModel.findOne({ roomId });
      if (!room) {
        return;
      }
  
      // Xóa người chơi khỏi phòng
      room.players = room.players.filter((player) => player !== username);
      
      // Nếu không còn ai trong phòng, xóa phòng
      if (room.players.length === 0) {
        await RoomBattleModel.deleteOne({ roomId });
        
        io.emit("room-list-updated", {
          action: "deleted",
          roomId,
        });
      } else {
        await room.save();
        
        // Loại bỏ mật khẩu trước khi gửi
        const roomResponse = room.toObject();
        delete roomResponse.password;
        
        io.to(roomId).emit("player-left", { username, room: roomResponse });
        io.to(roomId).emit("room-updated", roomResponse);
        io.emit("room-list-updated", {
          action: "updated",
          room: roomResponse,
        });
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error handling disconnect:`, error);
    }
  });
  socket.on("leave-room-explicit", async (data) => {
    try {
      const { roomId, username } = data;
  
      console.log(`[${new Date().toISOString()}] 🚶 Explicit leave room request: ${username} from ${roomId}`);
      
      // ... rest of the code same as leave-room handler ...
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error leaving room:`, error);
      socket.emit("error", "Lỗi khi rời phòng!");
    }
  });
}
