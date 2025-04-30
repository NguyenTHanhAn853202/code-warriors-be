import mongoose, { Document, Schema } from "mongoose";

export interface IRoomBattle extends Document {
  roomId: string;
  players: string[]; // Danh sách username người chơi
  maxPlayers: number;
  createdBy: string; // Username người tạo phòng
  status: "waiting" | "ongoing" | "finished";
  isPrivate: boolean;
  password?: string;
  winner?: string | null; // Username người chiến thắng
  startedAt?: Date;
  endedAt?: Date; // Thêm trường mới để lưu thời gian kết thúc
}

const roomBattleSchema = new Schema<IRoomBattle>({
  roomId: { type: String, required: true, unique: true },
  players: [{ type: String }], // Lưu trữ username
  maxPlayers: { type: Number, default: 4, min: 2, max: 5 },
  createdBy: { type: String, required: true },
  status: {
    type: String,
    enum: ["waiting", "ongoing", "finished"],
    default: "waiting",
  },
  isPrivate: { type: Boolean, default: false },
  password: { type: String, select: false },
  winner: { type: String, default: null },
  startedAt: { type: Date },
  endedAt: { type: Date },
});

export default mongoose.model<IRoomBattle>("RoomBattle", roomBattleSchema);
