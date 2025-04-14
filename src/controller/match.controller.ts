import expressAsyncHandler from "express-async-handler";
import problemModel from "../model/problem.model";
import { AppError } from "../utils/AppError";
import { httpCode } from "../utils/httpCode";
import sendResponse from "../utils/response";
import { Request, Response } from "express";
import matchModel from "../model/match.model";
import testcaseModel from "../model/testcase.model";
import submissionModel from "../model/submission.model";
import mongoose from "mongoose";
import userModel from "../model/user.model";
import { Server, Socket } from "socket.io";

class MatchController{
    getProblem = expressAsyncHandler(async (req: Request, res: Response) => {
        const matchId = req.params.id;
        const match = await matchModel.findById(matchId).select("problems status")
        const problemId = match?.problems
        if (!problemId) {
          throw new AppError("Problem id is empty", httpCode.FORBIDDEN, "warning");
        }
        const problem = await problemModel
          .findById(problemId)
          .select("title description difficulty");
        if (!problem)
          throw new AppError(
            "Not found the problem",
            httpCode.FORBIDDEN,
            "warning"
          );
        
        let data:any = {...problem}
        data = data._doc
        data.matchStatus = match.status

        sendResponse(res, "success", "successfully", httpCode.OK, data);
      });

      getResult = expressAsyncHandler(async(req: Request, res: Response)=>{
        const matchId = req.params.matchId
        const match = await matchModel.findById(matchId).populate(["player1","player2","player1Submissions","player2Submissions"])
        console.log(match);
        
        sendResponse(res, "success", "successfully", httpCode.OK,match);
      })
      
    getProblemId = expressAsyncHandler(async(req:Request,res:Response)=>{
      const {matchId} = req.body
      const match = await matchModel.findById(matchId).select("problems")
      sendResponse(res,"success","success",httpCode.OK,
        match?.problems
      )
    })

}

export default new MatchController()
