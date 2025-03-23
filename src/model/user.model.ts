import mongoose, { Document, Schema } from "mongoose";
import mongooseDelete from "mongoose-delete";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TOKEN_KEY } from "../utils/secret";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: "user" | "admin";
  xp: number;
  elo: number;
  rank: Schema.Types.ObjectId;
  createdAt: Date;
  hashPassword(): Promise<void>;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, unique: true, required: true },
    email: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    xp: { type: Number, default: 0 },
    elo: { type: Number, default: 1000 },
    rank: { type: Schema.Types.ObjectId, ref: "Rank" },
  },
  { timestamps: true }
);

// Hash password trước khi lưu vào database
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// So sánh mật khẩu khi đăng nhập
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Tạo token xác thực
userSchema.methods.generateToken = function (): string {
  return jwt.sign(
    { _id: this._id, username: this.username, role: this.role },TOKEN_KEY,
    { expiresIn: "30d" }
  );
};

// Kích hoạt soft delete
userSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

export default mongoose.model<IUser>("User", userSchema);
