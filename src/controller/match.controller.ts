import expressAsyncHandler from "express-async-handler";
import problemModel from "../model/problem.model";
import { AppError } from "../utils/AppError";
import { httpCode } from "../utils/httpCode";
import sendResponse from "../utils/response";
import { Request, Response } from "express";
import matchModel from "../model/match.model";

class MatchController{
    getProblem = expressAsyncHandler(async (req: Request, res: Response) => {
        const matchId = req.params.id;
        const match = await matchModel.findById(matchId).select("problems")
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
        sendResponse(res, "success", "successfully", httpCode.OK, problem);
      });
}

export default new MatchController()
