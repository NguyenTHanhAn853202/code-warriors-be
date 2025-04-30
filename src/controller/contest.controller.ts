import mongoose from "mongoose";
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
                    problem: newContest._id,
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
            .select("title description difficulty startDate endDate source_code")
            .populate("difficulty", "name")
            .populate({
                path: "author",
                select: "username role",
                match: { role: "user" }
            })
            .populate("testCases", "input expectedOutput");
        const userContests = contests.filter(contest => contest.author !== null);
    
        sendResponse(res, "success", "Contests retrieved successfully", httpCode.OK, { contests: userContests });
    });
    viewAllMyContests = expressAsyncHandler(async (req: Request, res: Response) => {
        const userId = req.user._id;
        const contests = await contestModel
            .find({ author: userId })
            .sort({ createdAt: 1 })
            .select("title description difficulty startDate endDate source_code")
            .populate("difficulty", "name")
            .populate("testCases", "input expectedOutput");
    
        sendResponse(res, "success", "Contests của bạn đã được truy xuất thành công", httpCode.OK, { contests });
    });

    GetLatestContests = expressAsyncHandler(async (req: Request, res: Response) => {
        const allContests = await contestModel
            .find({})
            .sort({ createdAt: -1 })
            .populate("difficulty", "name")
            .populate({
                path: "author",
                select: "username role",
                match: { role: "user" }
            });
        const userContests = allContests.filter(contest => contest.author !== null);

        const latestContests = userContests.slice(0, 3);
    
        sendResponse(res, "success", "Latest contests retrieved successfully", httpCode.OK, {
            contests: latestContests,
        });
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
        const { title, description, difficulty, startDate, endDate, source_code, testCases } = req.body;
        const contest = await contestModel.findById(id);
        if (!contest) {
            throw new AppError("Contest not found", httpCode.NOT_FOUND, "error");
        }

        let finalDifficulty = difficulty;
        if (difficulty && difficulty.length > 0) {
            const rankDocs = await rankModel.find({ name: { $in: difficulty } }).select("_id");
            finalDifficulty = rankDocs.length > 0 ? rankDocs.map(rank => rank._id) : contest.difficulty;
        }
        let formattedTestCases = contest.testCases;
        if (Array.isArray(testCases) && testCases.length > 0) {
            formattedTestCases = await Promise.all(
                testCases.map(async (tc) => {
                    if (mongoose.Types.ObjectId.isValid(tc)) return tc;
                    const newTestCase = await testcaseModel.create({
                        problem: id,
                        input: tc.input?.trim() || "",
                        expectedOutput: tc.expectedOutput?.trim() || "",
                    });
                    return newTestCase._id;
                })
            );
        }

        const updates = {
            title: title || contest.title,
            description: description || contest.description,
            difficulty: finalDifficulty,
            startDate: startDate || contest.startDate,
            endDate: endDate || contest.endDate,
            source_code: source_code || contest.source_code,
            testCases: formattedTestCases,
        };
    
        const updatedContest = await contestModel
            .findByIdAndUpdate(id, updates, { new: true, runValidators: true })
            .populate("difficulty", "name")
            .populate("testCases");
    
        sendResponse(res, "success", "Contest updated successfully", httpCode.OK, { contest: updatedContest });
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
