import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";

export interface IProblem extends Document {
  title: string;
  description: string;
  difficulty: mongoose.Types.ObjectId[];
  author: mongoose.Types.ObjectId;
  testCases: mongoose.Types.ObjectId[];
  algorithmTypes: mongoose.Types.ObjectId[];
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
    difficulty: [{ type: Schema.Types.ObjectId, required: true, ref: "Rank" }],
    author: { type: Schema.Types.ObjectId, ref: "User", required: false },
    testCases: [{ type: Schema.Types.ObjectId, ref: "TestCase" }],
    algorithmTypes: [{ type: Schema.Types.ObjectId, ref: "AlgorithmType" }],
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
