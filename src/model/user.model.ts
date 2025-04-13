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
  avtImage: string;
  gender: string;
  location: string;
  birthday: Date |string;
  summary: string;
  website: string;
  github: string;
  work: string;
  education: string;
  technicalSkills: string[];
  createdAt: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  hashPassword(): Promise<void>;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    xp: { type: Number, default: 0 },
    elo: { type: Number, default: 0 },
    rank: { type: Schema.Types.ObjectId, ref: "Rank" },
    // Avatar image URL from Firebase
    avtImage: { type: String, default: "" },
    gender: { type: String, default: "" },
    location: { type: String, default: "" },
    birthday: { type: Date },
    summary: { type: String, default: "" },
    website: { type: String, default: "" },
    github: { type: String, default: "" },
    work: { type: String, default: "" },
    education: { type: String, default: "" },
    technicalSkills: [{ type: String }],
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
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
    { id: this._id, username: this.username, role: this.role },
    TOKEN_KEY,
    { expiresIn: "30d" }
  );
};

// Kích hoạt soft delete
userSchema.plugin(mongooseDelete, { deletedAt: true, overrideMethods: "all" });

export default mongoose.model<IUser>("User", userSchema);