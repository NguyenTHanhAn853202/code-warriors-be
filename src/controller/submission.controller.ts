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
                throw new AppError(result?.stderr || result.status.description,httpCode.OK,"warning",{
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
        const userId = "67c515ad7893bdb73c6a1370"
        
        const leaderboard = await Leaderboard.findOneAndUpdate({user:userId, problem:problemId},{$inc:{attempts:1},score:evaluate.point, time:evaluate.time, memory:evaluate.memory, oldSource:sourceCode,languageId:languageId},{new:true,upsert:true})

        sendResponse(res,"success","check ", httpCode.OK, {leaderboard})
    })

}

export default new SubmissionController();
