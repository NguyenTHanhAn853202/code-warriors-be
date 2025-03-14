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


class SubmissionController{
    evaluation = expressAsyncHandler(async (req: Request, res: Response)=>{
        const {languageId, sourceCode, problemId} = req.body
        const testcases = await testcaseModel.find({problem:problemId}).select("expectedOutput input problem")
        const problem = await problemModel.findById(problemId)

        if(!problem){
            throw new AppError("Not found problem",httpCode.BAD_REQUEST,"warning")
        }

        let evaluate = {
            point:0,
            time:0,
            memory:0
        } 
        
        for(let i=0; i<testcases.length; i++){
            const judge0 = await fetch(`${URL_JUDGE0}/submissions?base64_encoded=false&wait=true`,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language_id:languageId,
                    source_code: sourceCode,
                    stdin: testcases[i].input,
                    expected_output:testcases[i].expectedOutput
                })
            })
            const result  = await judge0.json()
            
            if(result.status?.id !== Judge0Status.Accepted){
                
                throw new AppError(result?.stderr || result?.status?.description || result?.error,httpCode.OK,"warning",{
                    testcase:testcases[i],
                    result:result
                })
            }
            if(result.time*1000 <= problem?.timeout){
                evaluate.point++;
            }
            evaluate.time += result.time*1000
            evaluate.memory += result.memory
            
        }
        const userId = req.user._id
        
        // const leaderboard = await Leaderboard.findOneAndUpdate({user:userId, problem:problemId},{$inc:{attempts:1},score:evaluate.point, time:evaluate.time, memory:evaluate.memory, oldSource:sourceCode,languageId:languageId},{new:true,upsert:true})

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

        let evaluate = {
            point:0,
            time:0,
            memory:0,
            score:0
        } 
        
        for(let i=0; i<testcases.length; i++){
            const judge0 = await fetch(`${URL_JUDGE0}/submissions?base64_encoded=false&wait=true`,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language_id:languageId,
                    source_code: sourceCode,
                    stdin: testcases[i].input,
                    expected_output:testcases[i].expectedOutput
                })
            })
            const result  = await judge0.json()
            
            if(result.status?.id !== Judge0Status.Accepted){
                
                throw new AppError(result?.stderr || result?.status?.description || result?.error,httpCode.OK,"warning",{
                    testcase:testcases[i],
                    result:result
                })
            }
            if(result.time*1000 <= problem?.timeout){
                evaluate.point++;
            }
            evaluate.time += result.time*1000
            evaluate.memory += result.memory
            
        }
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
