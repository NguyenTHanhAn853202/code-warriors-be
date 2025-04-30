import Discussion from "@/model/discussion.model"
import { AppError } from "@/utils/AppError"
import { httpCode } from "@/utils/httpCode"
import sendResponse from "@/utils/response"
import expressAsyncHandler from "express-async-handler"

class DiscussionController{
    post = expressAsyncHandler(async(req,res)=>{
        const {title,content} = req.body
        const {_id} = req.user
        if(!_id)
            throw new AppError("Dont found you in system",httpCode.UNAUTHORIZED,"error")
        if(!title && !content)
            throw new AppError("Discussion must have content or title",httpCode.BAD_REQUEST,"error")
        const discussion = Discussion.create({title,content,author:_id})
        sendResponse(res,"success","Create successfully",httpCode.OK,discussion)
    })
}

export default new DiscussionController()