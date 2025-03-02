import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";

export interface ITestCase extends Document {
  problem: mongoose.Types.ObjectId;
  input: string;
  expectedOutput: string;
  createdAt: Date;
}

const testCaseSchema = new Schema<ITestCase>(
  {
    problem: { type: Schema.Types.ObjectId, ref: "Problem", required: true },
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
  },
  { timestamps: true }
);

testCaseSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

export default mongoose.model<ITestCase>("TestCase", testCaseSchema);
