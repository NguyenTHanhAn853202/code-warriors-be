import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";

export interface IProblem extends Document {
  title: string;
  description: string;
  difficulty: mongoose.Types.ObjectId[];
  author: mongoose.Types.ObjectId;
  testCases: mongoose.Types.ObjectId[]; // Liên kết với TestCase
  createdAt: Date;
}

const problemSchema = new Schema<IProblem>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: [ {type: Schema.Types.ObjectId, required: true }],
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    testCases: [{ type: Schema.Types.ObjectId, ref: "TestCase" }],
  },
  { timestamps: true }
);

problemSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

export default mongoose.model<IProblem>("Problem", problemSchema);
