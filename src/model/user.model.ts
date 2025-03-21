import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";

export interface IUser extends Document {
  username: string; 
  email: string;
  password: string;
  role: "user" | "admin";
  xp: number;
  elo: number;
  rank: Schema.Types.ObjectId;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, unique: true, required: true },
    email: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    xp: { type: Number, default: 0 },
    elo: { type: Number, default: 0 },
    rank: { type: Schema.Types.ObjectId, ref: "Rank" },
  },
  { timestamps: true }
);

userSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

export default mongoose.model<IUser>("User", userSchema);
