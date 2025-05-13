import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";

export interface ISubmission extends Document {
  user: mongoose.Types.ObjectId;
  username: string; // Bỏ optional vì cần username để hiển thị
  problem: mongoose.Types.ObjectId;
  match: mongoose.Types.ObjectId | null;
  room: mongoose.Types.ObjectId | null;
  code: string;
  language: string;
  status: "Pending" | "Accepted" | "Wrong Answer" | "Runtime Error";
  executionTime: number;
  memoryUsage: number;
  results: mongoose.Types.ObjectId[];
  grade: number;
  createdAt: Date;
  timeSubmission: number; // Thời gian làm bài (ms)
}

const submissionSchema = new Schema<ISubmission>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: false },
    username: { type: String, required: true }, // Sửa thành required true
    problem: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
    match: { type: Schema.Types.ObjectId, ref: "Match", default: null },
    room: { type: Schema.Types.ObjectId, ref: "RoomBattle", default: null },
    code: { type: String, required: true },
    language: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Wrong Answer", "Runtime Error"],
      default: "Pending",
    },
    executionTime: { type: Number, default: 0 },
    memoryUsage: { type: Number, default: 0 },
    grade: { type: Number, default: 0 },
    timeSubmission: { type: Number, required: true }, // Thêm required
  },
  { timestamps: true }
);

submissionSchema.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: "all",
});

export default mongoose.model<ISubmission>("Submission", submissionSchema);
