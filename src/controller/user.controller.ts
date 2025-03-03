import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import sendResponse from "../utils/response";
import { httpCode } from "../utils/httpCode";
import { AppError } from "../utils/AppError";
import userModel from "../model/user.model";
import problemModel from "../model/problem.model";
import testcaseModel from "../model/testcase.model";


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