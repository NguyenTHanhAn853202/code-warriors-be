import mongoose, { Document, Schema } from "mongoose";

export interface IRoomBattle extends Document {
  roomId: string;
  players: string[];
  maxPlayers: number;
  winner?: string | null;
  status: "waiting" | "ongoing" | "finished";
  submissions?: { username: string; code: string; submittedAt: Date }[];
  createdBy?: string;
  startedAt?: Date;
  isPrivate: boolean;
  password?: string;
}

const roomBattleSchema = new Schema<IRoomBattle>(
  {
    roomId: { type: String, required: true, unique: true },
    players: [{ type: String, required: true }],
    maxPlayers: { type: Number, default: 4 },
    winner: { type: String, default: null },
    status: {
      type: String,
      enum: ["waiting", "ongoing", "finished"],
      default: "waiting",
    },
    submissions: [
      {
        username: String,
        code: String,
        submittedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: String,
    startedAt: Date,
    isPrivate: { type: Boolean, default: false },
    password: { type: String, select: false },
  },
  { timestamps: true }
);

export default mongoose.model<IRoomBattle>("RoomBattle", roomBattleSchema);
