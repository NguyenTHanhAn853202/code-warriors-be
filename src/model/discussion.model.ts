import mongoose, { Schema, Document } from "mongoose";
import MongooseDelete from "mongoose-delete";

interface IDiscussion extends Document {
  author: Schema.Types.ObjectId; // Người dùng
  title: string ; // Bài toán
  content: string; // Thời gian thực thi
  favourite:Schema.Types.ObjectId[]
}

const DiscussionSchema = new Schema<IDiscussion>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String},
    content: { type: String },
    favourite:[{type:Schema.Types.ObjectId}]
  },
  { timestamps: true }
);

DiscussionSchema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: "all" });

const Discussion = mongoose.model<IDiscussion>("Discussion", DiscussionSchema);
export default Discussion;
