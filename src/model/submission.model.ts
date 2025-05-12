import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";

export interface ISubmission extends Document {
    user: mongoose.Types.ObjectId;
    problem: mongoose.Types.ObjectId;
    match: mongoose.Types.ObjectId | null; // Nếu là nộp bài trong trận đấu
    room : mongoose.Types.ObjectId | null; 
    code: string;
    language: string;
    status: "Pending" | "Accepted" | "Wrong Answer" | "Runtime Error";
    executionTime: number;
    memoryUsage: number;
    results: mongoose.Types.ObjectId[];
    grade: number;
    createdAt: Date;
    timeSubmission:number
  }
  
const submissionSchema = new Schema<ISubmission>(
    {
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      problem: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
      match: { type: Schema.Types.ObjectId, ref: "Match", default: null }, // Bổ sung matchId
      room : { type: Schema.Types.ObjectId, ref: "RoomBattle", default: null },
      code: { type: String, required: true },
      language: { type: String, required: true },
      status: { type: String, enum: ["Pending", "Accepted", "Wrong Answer", "Runtime Error"], default: "Pending" },
      executionTime: { type: Number, default: 0 },
      memoryUsage: { type: Number, default: 0 },
      grade: { type: Number, default:0},
      timeSubmission:{type:Number}
    },
    { timestamps: true }
  );
  
submissionSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

export default mongoose.model<ISubmission>("Submission", submissionSchema);