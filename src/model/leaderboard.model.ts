import mongoose, { Schema, Document } from "mongoose";

interface ILeaderboard extends Document {
  user: Schema.Types.ObjectId; // Người dùng
  problem: Schema.Types.ObjectId; // Bài toán
  time: number; // Thời gian thực thi
  attempts: number; // Số lần nộp
  score: number; // Điểm số (nếu có)
  createdAt: Date;
  memory: number;
  languageId:number; //
  oldSource: string; // Nguồn mà người dùng đã nộp bài (nếu có)
}

const LeaderboardSchema = new Schema<ILeaderboard>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    problem: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
    time: { type: Number, required: true }, // Tính bằng giây
    memory:{type:Number},
    attempts: { type: Number, required: true, default: 1 },
    score: { type: Number, required: true, default: 0 }, // Có thể không cần
    oldSource: { type: String},
    languageId:{type:Number},
  },
  { timestamps: true }
);

const Leaderboard = mongoose.model<ILeaderboard>("Leaderboard", LeaderboardSchema);
export default Leaderboard;
