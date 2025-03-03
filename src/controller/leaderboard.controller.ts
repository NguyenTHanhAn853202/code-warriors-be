import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import Leaderboard from "../model/leaderboard.model";
import sendResponse from "../utils/response";
import { httpCode } from "../utils/httpCode";

class LeaderboardSController{
    get = expressAsyncHandler(async(req: Request,res:Response)=>{
        const {problemId} = req.params
        const leaderboard = await Leaderboard.find({problem:problemId}).sort({ score: -1, time: 1, memory: 1, attempts: 1 }).populate("user")
        sendResponse(res,"success","Get leaderboard successfully",httpCode.OK,leaderboard)
    })
}

export default new LeaderboardSController();