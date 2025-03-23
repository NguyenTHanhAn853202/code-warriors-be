import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import sendResponse from "../utils/response";
import { httpCode } from "../utils/httpCode";
import { AppError } from "../utils/AppError";
import userModel from "../model/user.model";
import problemModel from "../model/problem.model";
import testcaseModel from "../model/testcase.model";
import { registerService } from "../service/user.service";


export const getUser = expressAsyncHandler(async(req:Request,res:Response)=>{
    const user = await userModel.create({
        username: "admin",
        password: "testpass",
        role: "admin",
    })
    const data = await problemModel.create({
        title: "test problem",
        description: "test problem description",
        author: user._id,
    })

    const testcase = await testcaseModel.create({
        problem:data._id,
        input: "test input",
        expectedOutput: "test output",
    })
    sendResponse(res,"success","get user success",httpCode.OK,{data,testcase})
})

export const register = expressAsyncHandler(async(req:Request,res:Response)=>{
    const {username,password,repeatPassword} = req.body
    // handle logic

    // 
    const token = await registerService(username,password)
    // kiem tra token null khong va bao loi

    // 
    res.cookie("token",token,{
        secure:true,
        httpOnly:true
    })
    sendResponse(res,"success","Register successfully",httpCode.OK)
})