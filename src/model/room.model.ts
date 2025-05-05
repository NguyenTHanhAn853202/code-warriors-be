import mongoose, { Document, Schema } from "mongoose";

export interface IRoomBattle extends Document {
  roomId: string;
  players: string[]; 
  maxPlayers: number;
  createdBy: string; 
  status: "waiting" | "ongoing" | "finished";
  problems: mongoose.Types.ObjectId;
  isPrivate: boolean;
  password?: string;
  winner?: string | null; 
  startedAt?: Date;
  endedAt?: Date; 
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
  problems: { type: Schema.Types.ObjectId, ref: "Problem" },

  password: { type: String, select: false },
  winner: { type: String, default: null },
  startedAt: { type: Date },
  endedAt: { type: Date },
});

export default mongoose.model<IRoomBattle>("RoomBattle", roomBattleSchema);
