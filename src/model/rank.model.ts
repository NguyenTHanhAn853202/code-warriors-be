import mongoose, { Document, Schema } from "mongoose";

export interface IRank extends Document {
  name: string; // Tên rank (Bronze, Silver, Gold, ...)
  minElo: number; // Elo tối thiểu để đạt rank này
  maxElo: number; // Elo tối đa trong rank này
  badge: string; // Hình ảnh hoặc icon của rank
}

const rankSchema = new Schema<IRank>(
  {
    name: { type: String, required: true, unique: true },
    minElo: { type: Number, required: true },
    maxElo: { type: Number, required: true },
    badge: { type: String, required: false }, // URL ảnh đại diện rank
  },
  { timestamps: true }
);

export default mongoose.model<IRank>("Rank", rankSchema);
