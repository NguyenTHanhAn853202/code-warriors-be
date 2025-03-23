import mongoose, { Document, Schema } from "mongoose";

export interface IRoomBattle extends Document {
  roomId: string;
  players: string[]; // Danh sách username của 2 người chơi
  winner?: string | null; // Người thắng (có thể null nếu chưa kết thúc)
  status: "waiting" | "ongoing" | "finished";
}

const roomBattleSchema = new Schema<IRoomBattle>(
  {
    roomId: { type: String, required: true, unique: true },
    players: [{ type: String, required: true }],
    winner: { type: String, default: null },
    status: {
      type: String,
      enum: ["waiting", "ongoing", "finished"],
      default: "waiting",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IRoomBattle>("RoomBattle", roomBattleSchema);
