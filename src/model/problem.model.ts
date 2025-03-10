import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";

export interface IProblem extends Document {
  title: string;
  description: string;
  rankDifficulty: string[];
  algorithmTypes: string;
  difficulty: mongoose.Types.ObjectId[];
  author: mongoose.Types.ObjectId;
  testCases: mongoose.Types.ObjectId[];
  createdAt: Date;
  timeout: number;
  startDate: Date;
  endDate: Date;
  source_code: String; // Th��i gian chơi (ms) của test case này, mặc đ��nh là 5000ms (5s)  (optional)
}

const problemSchema = new Schema<IProblem>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    rankDifficulty: {
      type: [String],
      enum: ["easy", "medium", "hard"],
      required: true,
    },
    difficulty: [{ type: Schema.Types.ObjectId, required: true, ref: "Rank" }],
    algorithmTypes: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    testCases: [{ type: Schema.Types.ObjectId, ref: "TestCase" }],
    timeout: { type: Number, default: 5000 },
    startDate: { type: Date, default: Date.now() },
    endDate: { type: Date },
    source_code: { type: String },
  },
  { timestamps: true }
);

problemSchema.plugin(mongooseDelete, {
  deletedAt: true,
  overrideMethods: "all",
});

export default mongoose.model<IProblem>("Problem", problemSchema);
