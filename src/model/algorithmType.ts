import mongoose, { Document, Schema } from "mongoose";

export interface IAlgorithmType extends Document {
  name: string;
}

const algorithmTypeSchema = new Schema<IAlgorithmType>(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IAlgorithmType>(
  "AlgorithmType",
  algorithmTypeSchema
);
