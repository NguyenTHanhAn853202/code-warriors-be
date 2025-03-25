import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";

export interface IMatch extends Document {
  player1: mongoose.Types.ObjectId; // Người chơi 1
  player2: mongoose.Types.ObjectId; // Người chơi 2
  problems: mongoose.Types.ObjectId; // Danh sách bài toán trong trận đấu
  player1Submissions: mongoose.Types.ObjectId; // Bài nộp của người chơi 1
  player2Submissions: mongoose.Types.ObjectId; // Bài nộp của người chơi 2
  winner: mongoose.Types.ObjectId | null; // Người chiến thắng (null nếu chưa có)
  status: "Pending" | "Ongoing" | "Completed";
  startedAt: Date | null;
  endedAt: Date | null;
}

const matchSchema = new Schema<IMatch>(
  {
    player1: { type: Schema.Types.ObjectId, ref: "User", default:null },
    player2: { type: Schema.Types.ObjectId, ref: "User",default:null  },
    problems: { type: Schema.Types.ObjectId, ref: "Problem"},
    player1Submissions: { type: Schema.Types.ObjectId, ref: "Submission",default:null },
    player2Submissions: { type: Schema.Types.ObjectId, ref: "Submission",default:null },
    winner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["Pending", "Ongoing", "Completed"], default: "Pending" },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: new Date(Date.now() + 10* 60 *1000) },
  },
  { timestamps: true }
);

matchSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

export default mongoose.model<IMatch>("Match", matchSchema);
