import mongoose, { Document, Schema } from "mongoose";

export interface IRoomBattle extends Document {
  roomId: string;
  players: string[];
  maxPlayers: number;
  createdBy: string;
  status: "waiting" | "ongoing" | "finished";
  problems: mongoose.Types.ObjectId;
  isPrivate: boolean;
  submissions: {
    username: string;
    submission: mongoose.Types.ObjectId;
    submittedAt?: Date;
  }[];
  submitting: string[];
  rankings: Array<{
    username: string;
    points: number;
    executionTime: number;
    memoryUsage: number;
    status: string;
    duration: number;
    rank: number;
  }>;
  password?: string;
  winner?: string | null;
  startedAt?: Date;
  endedAt?: Date;
}

const roomBattleSchema = new Schema<IRoomBattle>({
  roomId: { type: String, required: true, unique: true },
  players: [{ type: String }], 
  maxPlayers: { type: Number, default: 4, min: 2, max: 4 },
  createdBy: { type: String, required: true },
  status: {
    type: String,
    enum: ["waiting", "ongoing", "finished"],
    default: "waiting",
  },
  isPrivate: { type: Boolean, default: false },
  problems: { type: Schema.Types.ObjectId, ref: "Problem" },
  submissions: [
    {
      username: { type: String },
      submission: { type: Schema.Types.ObjectId, ref: "Submission" },
      submittedAt: { type: Date },
    },
  ],
  submitting: [{ type: String }], 
  password: { type: String, select: false },
  winner: { type: String, default: null },
  rankings: [
    {
      username: { type: String },
      points: { type: Number },
      executionTime: { type: Number },
      memoryUsage: { type: Number },
      status: { type: String },
      duration: { type: Number },
      rank: { type: Number },
      submittedAt: { type: Date },
    },
  ],
  startedAt: { type: Date },
  endedAt: { type: Date },
});

roomBattleSchema.index({ status: 1 });
roomBattleSchema.index({ "submissions.username": 1 });

export default mongoose.model<IRoomBattle>("RoomBattle", roomBattleSchema);
