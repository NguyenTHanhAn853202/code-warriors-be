import { Request, Response } from "express";
import testcaseModel from "../model/testcase.model";
import sendResponse from "../utils/response";
import { httpCode } from "../utils/httpCode";
import { URL_JUDGE0 } from "../utils/secret";
import expressAsyncHandler from "express-async-handler";
import { Judge0Status } from "../utils/judge0Status";
import problemModel from "../model/problem.model";
import { AppError } from "../utils/AppError";
import Leaderboard from "../model/leaderboard.model";
import userModel from "../model/user.model";
import runCode from "../utils/runCode";


class SubmissionController{
    evaluation = expressAsyncHandler(async (req: Request, res: Response)=>{
        const {languageId, sourceCode, problemId} = req.body
        const testcases = await testcaseModel.find({problem:problemId}).select("expectedOutput input problem")
        const problem = await problemModel.findById(problemId)

        if(!problem){
            throw new AppError("Not found problem",httpCode.BAD_REQUEST,"warning")
        }

        
        const userId = req.user._id
        
        // const leaderboard = await Leaderboard.findOneAndUpdate({user:userId, problem:problemId},{$inc:{attempts:1},score:evaluate.point, time:evaluate.time, memory:evaluate.memory, oldSource:sourceCode,languageId:languageId},{new:true,upsert:true})

        const evaluate = await runCode(languageId,sourceCode,testcases,problem.timeout)

        const leaderboard = await Leaderboard.create({
            user:userId, 
            problem:problemId,
            score:evaluate.point, 
            time:evaluate.time, 
            memory:evaluate.memory, 
            oldSource:sourceCode,
            languageId:languageId
        })

        await userModel.updateOne({_id:userId},{$inc:{xp:1}})

        sendResponse(res,"success","check ", httpCode.OK, leaderboard)
    })


    run = expressAsyncHandler(async(req:Request,res:Response)=>{
        const {sourceCode=null,languageId=null,problemId=null} = req.body
        if(!sourceCode || !languageId || !problemId)
            throw new AppError("Miss information",httpCode.BAD_REQUEST,"warning")

        const testcases = await testcaseModel.find({problem:problemId}).select("expectedOutput input problem")
        const problem = await problemModel.findById(problemId)

        if(!problem){
            throw new AppError("Not found problem",httpCode.BAD_REQUEST,"warning")
        }

        const evaluate:any = await runCode(languageId,sourceCode,testcases,problem.timeout)
        
        evaluate.score = evaluate.point
        sendResponse(res,"success","done",httpCode.OK,evaluate)
    })


    historySubmit = expressAsyncHandler(async(req:Request,res:Response)=>{
        const userId = req.user._id
        const problemId = req.params.problemId

        if(!problemId)
            throw new AppError("Miss problemId",httpCode.FORBIDDEN,"warning")

        const histories = await Leaderboard.find({user:userId,problem:problemId})
        sendResponse(res,"success","done",httpCode.OK,histories)
    })

}

export default new SubmissionController();
