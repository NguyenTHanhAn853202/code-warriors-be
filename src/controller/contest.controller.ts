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
//////////////////////////////////////////////////////////////thinh chua sua
    ViewAllContests = expressAsyncHandler(async (req: Request, res: Response) => {
        try {
            const { difficulty, title } = req.query;
            const filter: any = {};
    
            if (difficulty) filter.difficulty = difficulty;
            if (title) filter.title = { $regex: title as string, $options: "i" };
    
            const contests = await contestModel
                .find(filter)
                .populate("difficulty", "name")
                .populate("author", "username")
                .sort({ createdAt: 1 });
    
            res.status(200).json({
                message: "Contests retrieved successfully",
                contests,
                totalContests: contests.length
            });
        } catch (error) {
            console.error("Error retrieving contests:", error);
            res.status(500).json({
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    GetLatestContests = expressAsyncHandler(async (req: Request, res: Response) => {
        try {
            const latestContests = await contestModel
                .find({})
                .sort({ createdAt: -1 })
                .limit(3) 
                .populate("difficulty", "name")
                .populate("author", "username");
    
            res.status(200).json({
                message: "Latest contests retrieved successfully",
                contests: latestContests,
            });
        } catch (error) {
            console.error("Error fetching latest contests:", error);
            res.status(500).json({
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });    
    getMyContests = expressAsyncHandler(async (req: Request, res: Response) => {
        const userId = req.user?._id; 
        if (!userId) {
            throw new AppError("Unauthorized", 401, "error");
        }
    
        const { difficulty, title } = req.query;
        const filter: any = { author: userId };
    
        if (difficulty) filter.difficulty = difficulty;
        if (title) filter.title = { $regex: title as string, $options: "i" };
    
        const contests = await contestModel
            .find(filter)
            .populate("difficulty", "name")
            .populate("author", "username")
            .sort({ createdAt: -1 });
    
        sendResponse(res, "success", "My contests retrieved successfully", 200, {
            contests,
            totalContests: contests.length,
        });
    });
////////////////////////////////////////////////////////////////////thinh chưa sửa đc
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
