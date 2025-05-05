import { Request, Response } from "express"
import Discussion from "../model/discussion.model"
import { AppError } from "../utils/AppError"
import { httpCode } from "../utils/httpCode"
import sendResponse from "../utils/response"
import expressAsyncHandler from "express-async-handler"
import Comment from "../model/comment.model"
import mongoose, { Schema, Types } from "mongoose"

class DiscussionController{
    post = expressAsyncHandler(async(req:Request,res:Response)=>{
        const {title,content} = req.body
        const {_id} = req.user
        if(!_id)
            throw new AppError("Dont found you in system",httpCode.UNAUTHORIZED,"error")
        if(!title && !content)
            throw new AppError("Discussion must have content or title",httpCode.BAD_REQUEST,"error")
        const discussion = await Discussion.create({title,content,author:_id})
        sendResponse(res,"success","Create successfully",httpCode.OK,"discussion")
    })

    getAll = expressAsyncHandler(async (req: Request, res: Response) => {
        const search = (req.query.search as string) || "";
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        console.log(search);
        
        
        const query = {
            $or: [
                { title: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } }
            ]
        };
    
        const total = await Discussion.countDocuments(query);
    
        const discussions = await Discussion.find(query)
            .populate("author", "-password") // populate nếu cần
            .sort({ createdAt: -1 }) // sắp xếp mới nhất trước
            .skip((page - 1) * limit)
            .limit(limit);

            const result = [];
            for (const discussion of discussions) {
                const comments = await Comment.find({ discussionId: discussion._id }).sort({ createdAt: -1 });
                result.push({
                    ...discussion.toObject(),
                    comments,
                });
            }
    
        sendResponse(res, "success", "Fetched successfully", httpCode.OK, {
            total,
            page,
            limit,
            result,
        });
    });
    

    edit = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { title, content } = req.body;
        const { _id } = req.user ;
    
        const discussion = await Discussion.findById(id);
        if (!discussion) {
            throw new AppError("Discussion not found", httpCode.NOT_FOUND, "error");
        }
    
        if (discussion.author.toString() !== _id) {
            throw new AppError("You are not allowed to edit this discussion", httpCode.FORBIDDEN, "error");
        }
    
        if (!title && !content) {
            throw new AppError("Title or content is required to update", httpCode.BAD_REQUEST, "error");
        }
    
        if (title) discussion.title = title;
        if (content) discussion.content = content;
    
        await discussion.save();
    
        sendResponse(res, "success", "Discussion updated successfully", httpCode.OK, discussion);
    });

    delete = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { _id } = req.user;
    
        const discussion = await Discussion.findById(id);
        if (!discussion) {
            throw new AppError("Discussion not found", httpCode.NOT_FOUND, "error");
        }
    
        if (discussion.author.toString() !== _id) {
            throw new AppError("You are not allowed to delete this discussion", httpCode.FORBIDDEN, "error");
        }
    
        await discussion.deleteOne(); 
    
        sendResponse(res, "success", "Discussion deleted successfully", httpCode.OK, null);
    });

    getMyDiscussions = expressAsyncHandler(async (req: Request, res: Response) => {
        const { _id } = req.user;
    
        const discussions = await Discussion.find({ author: _id })
            .sort({ createdAt: -1 });

            const result = [];

            for (const discussion of discussions) {
                const comments = await Comment.find({ discussionId: discussion._id }).countDocuments();
        
                result.push({
                    ...discussion.toObject(),
                    comments
                });
            }
    
        sendResponse(res, "success", "Fetched your discussions successfully", httpCode.OK, result);
    });

    toggleFavourite = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params; // ID của bài discussion
        const { _id } = req.user;
    
        const discussion = await Discussion.findById(id);
        if (!discussion) {
            throw new AppError("Discussion not found", httpCode.NOT_FOUND, "error");
        }
    
        const index = discussion.favourite.findIndex(userId => userId.toString() === _id);
    
        if (index !== -1) {
            // Đã tim => bỏ tim
            discussion.favourite.splice(index, 1);
        } else {
            // Chưa tim => thêm tim
            discussion.favourite.push(new Types.ObjectId(_id));
        }
    
        await discussion.save();
    
        sendResponse(
            res,
            "success",
            index !== -1 ? "Unliked successfully" : "Liked successfully",
            httpCode.OK,
            {
                favouriteCount: discussion.favourite.length,
                isFavourited: index === -1
            }
        );
    });
    
    
    comment = expressAsyncHandler(async (req: Request, res: Response) => {
        const { content, discussionId } = req.body;
        const { _id } = req.user;

        if (!content || !discussionId) {
            throw new AppError("Content and discussionId are required", httpCode.BAD_REQUEST, "error");
        }

        const discussion = await Discussion.findById(discussionId);
        if (!discussion) {
            throw new AppError("Discussion not found", httpCode.NOT_FOUND, "error");
        }

        const comment = await Comment.create({
            author: _id,
            content,
            discussionId,
        });

        sendResponse(res, "success", "Comment created successfully", httpCode.OK, comment);
    });
        
    getCommentByDiscussion = expressAsyncHandler(async (req: Request, res: Response) => {
        const { discussionId } = req.params;
    
        if (!discussionId) {
            throw new AppError("Discussion ID is required", httpCode.BAD_REQUEST, "error");
        }
    
        const discussion = await Discussion.findById(discussionId)
            .populate("author", "-password");
    
        if (!discussion) {
            throw new AppError("Discussion not found", httpCode.NOT_FOUND, "error");
        }
    
        const comments = await Comment.find({ discussionId })
            .populate("author", "-password")
            .sort({ createdAt: 1 });
    
        const discussionObj = discussion.toObject();
    
        const responseData = {
            discussion: {
                ...discussionObj,
                likeCount: discussion.favourite?.length || 0,
                commentCount: comments.length,
            },
            comments,
        };
    
        sendResponse(res, "success", "Fetched discussion details and comments successfully", httpCode.OK, responseData);
    });    
    
    editComment = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { content } = req.body;
        const { _id } = req.user;
    
        if (!content) {
            throw new AppError("Content is required", httpCode.BAD_REQUEST, "error");
        }
    
        const comment = await Comment.findById(id);
        if (!comment) {
            throw new AppError("Comment not found", httpCode.NOT_FOUND, "error");
        }

        console.log(_id,comment.author);
        
    
        if (comment.author.toString() !== _id) {
            throw new AppError("You are not allowed to edit this comment", httpCode.FORBIDDEN, "error");
        }
    
        comment.content = content;
        await comment.save();
    
        sendResponse(res, "success", "Comment updated successfully", httpCode.OK, comment);
    });
    

    deleteComment = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { _id } = req.user as { _id: string };
    
        const comment = await Comment.findById(id);
        if (!comment) {
            throw new AppError("Comment not found", httpCode.NOT_FOUND, "error");
        }
    
        // Chỉ author mới được xoá
        if (comment.author.toString() !== _id) {
            throw new AppError("You are not allowed to delete this comment", httpCode.FORBIDDEN, "error");
        }
    
        await comment.deleteOne();
    
        sendResponse(res, "success", "Comment deleted successfully", httpCode.OK, null);
    });
    
}

export default new DiscussionController()