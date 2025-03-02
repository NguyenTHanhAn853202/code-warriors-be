import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import sendResponse from "../utils/response";
import { httpCode } from "../utils/httpCode";
import { AppError } from "../utils/AppError";
import userModel from "../model/user.model";


export const getUser = expressAsyncHandler(async(req:Request,res:Response)=>{
    throw new AppError("error test",httpCode.BAD_REQUEST,"warning")
    sendResponse(res,"warning","hello world",httpCode.OK,null)
})