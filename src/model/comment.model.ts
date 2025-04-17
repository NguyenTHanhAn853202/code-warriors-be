import mongoose,{Schema, Document} from "mongoose";
import MongooseDelete from "mongoose-delete";

interface IComment extends Document{
    author:Schema.Types.ObjectId;
    content:String;
    discussionId:Schema.Types.ObjectId
}

const CommentSchema  = new Schema<IComment>(
    {
        author:{type:Schema.Types.ObjectId,ref:"User",required:true},
        content:{type:String, required:true},
        discussionId:{type:Schema.Types.ObjectId,required:true,ref:"Discussion"}
    },
    {
        timestamps:true
    }
)

CommentSchema.plugin(MongooseDelete,{deletedAt:true,deletedBy:true,overrideMethods:'all'})

const Comment = mongoose.model<IComment>("Comment",CommentSchema)

export default Comment