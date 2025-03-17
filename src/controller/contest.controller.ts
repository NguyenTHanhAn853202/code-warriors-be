import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import contestModel from "../model/problem.model";
import testcaseModel from "../model/testcase.model";
import rankModel from "../model/rank.model";
import { httpCode } from "../utils/httpCode";
import { AppError } from "../utils/AppError";
import sendResponse from "../utils/response";

class ContestController {
    createContest = expressAsyncHandler(async (req: Request, res: Response) => {
        const { title, description, difficulty = [], testCases = [], startDate, endDate, source_code } = req.body;
        const author = req.user._id;

        if (!title || !description) {
            throw new AppError("Missing required fields", httpCode.BAD_REQUEST, "error");
        }

        let finalDifficulty = difficulty;
        if (difficulty.length > 0) {
            const rankDocs = await rankModel.find({ name: { $in: difficulty } }).select("_id");
            finalDifficulty = rankDocs.map((rank) => rank._id);
        } else {
            const goldRank = await rankModel.findOne({ name: "Brozen" }).select("_id");
            if (goldRank) {
                finalDifficulty = [goldRank._id];
            }
        }

        const newContest = await contestModel.create({
            title,
            description,
            difficulty: finalDifficulty,
            author,
            startDate,
            endDate,
            source_code,
            testCases: [],
        });

        const savedTestCases = await Promise.all(
            testCases.map(async (test: { input: string; expectedOutput: string }) => {
                const newTestCase = await testcaseModel.create({
                    problem: author,
                    input: test.input,
                    expectedOutput: test.expectedOutput,
                });
                return newTestCase._id;
            })
        );

        newContest.testCases = savedTestCases;
        await newContest.save();

        sendResponse(res, "success", "Contest created successfully", httpCode.OK, { contest: newContest });
    });

    viewAllContests = expressAsyncHandler(async (req: Request, res: Response) => {
        const contests = await contestModel
            .find({})
            .sort({ createdAt: 1 })
            .select("title difficulty startDate endDate")
            .populate("difficulty", "name");

        sendResponse(res, "success", "Contests retrieved successfully", httpCode.OK, { contests });
    });

    GetLatestContests = expressAsyncHandler(async (req: Request, res: Response) => {
        const latestContests = await contestModel
            .find({})
            .sort({ createdAt: -1 })
            .limit(3)
            .populate("difficulty", "name")
            .populate("author", "username");
    
        sendResponse(res, "success", "Latest contests retrieved successfully", httpCode.OK, { contests: latestContests });
    });
    
    viewContestDetail = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const contest = await contestModel
            .findById(id)
            .populate("difficulty", "name")
            .populate("author", "username")
            .populate("testCases", "input expectedOutput");

        if (!contest) {
            throw new AppError("Contest not found", httpCode.NOT_FOUND, "error");
        }

        sendResponse(res, "success", "Contest details retrieved", httpCode.OK, { contest });
    });

    updateContest = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const updates = req.body;

        const contest = await contestModel.findByIdAndUpdate(id, updates, { new: true }).populate("difficulty", "name");

        if (!contest) {
            throw new AppError("Contest not found", httpCode.NOT_FOUND, "error");
        }

        sendResponse(res, "success", "Contest updated successfully", httpCode.OK, { contest });
    });

    deleteContest = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const contest = await contestModel.findByIdAndDelete(id);

        if (!contest) {
            throw new AppError("Contest not found", httpCode.NOT_FOUND, "error");
        }

        sendResponse(res, "success", "Contest deleted successfully", httpCode.OK, {});
    });
}

export default new ContestController();
