import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import contestModel from "../../model/problem.model";
import testcaseModel from "../../model/testcase.model";
import RankModel from "../../model/rank.model";
import mongoose from "mongoose";

interface TestCaseInput {
    input: string;
    expectedOutput: string;
}

class Contests {
    CreateContest = expressAsyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const {
            title,
            description,
            difficulty = [],
            author,
            testCases = [],
            startDate = new Date(),
            endDate,
        } = req.body;

        let finalDifficulty = difficulty;
        if (difficulty.length === 0) {
            const defaultRank = await RankModel.findOne({}).sort({ minElo: 1 }).select("_id");
            if (defaultRank) {
                finalDifficulty = [defaultRank._id];
            }
        }

        if (!title || !description || !author) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }

        try {
            const newContest = new contestModel({
                title,
                description,
                difficulty: finalDifficulty,
                author,
                testCases: [],
                startDate,
                endDate,
            });

            await newContest.save();

            const savedTestCases = await Promise.all(
                testCases.map(async (test: TestCaseInput) => {
                    const newTestCase = new testcaseModel({
                        contest: newContest._id,
                        input: test.input,
                        expectedOutput: test.expectedOutput,
                    });
                    return await newTestCase.save();
                })
            );

            newContest.testCases = savedTestCases.map((test) => test._id);
            await newContest.save();

            res.status(201).json({ message: "Contest created successfully", contest: newContest });
        } catch (error) {
            console.error("Contest creation error:", error);
            res.status(500).json({
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error occurred during contest creation",
            });
        }
    });

    ViewAllContests = expressAsyncHandler(async (req: Request, res: Response) => {
        try {
            const { page = 1, limit = 10, difficulty, title } = req.query;
            const filter: any = {};
            if (difficulty) filter.difficulty = difficulty;
            if (title) filter.title = { $regex: title as string, $options: "i" };

            const contests = await contestModel
                .find(filter)
                .populate("difficulty", "name")
                .populate("author", "username")
                .skip((+page - 1) * +limit)
                .limit(+limit)
                .sort({ createdAt: -1 });

            const total = await contestModel.countDocuments(filter);

            res.status(200).json({
                message: "Contests retrieved successfully",
                contests,
                pagination: { currentPage: +page, totalPages: Math.ceil(total / +limit), totalContests: total },
            });
        } catch (error) {
            console.error("Error deleting view:", error);
            res.status(500).json({
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    UpdateContest = expressAsyncHandler(async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid contest ID" });
                return;
            }

            const { testCases, ...allowedUpdates } = updateData;
            const updatedContest = await contestModel.findByIdAndUpdate(id, allowedUpdates, {
                new: true,
                runValidators: true,
            });
            if (!updatedContest) {
                res.status(404).json({ message: "Contest not found" });
                return;
            }

            if (testCases) {
                await testcaseModel.deleteMany({ contest: id });
                const savedTestCases = await Promise.all(
                    testCases.map(async (test: TestCaseInput) => {
                        const newTestCase = new testcaseModel({
                            contest: id,
                            input: test.input,
                            expectedOutput: test.expectedOutput,
                        });
                        return await newTestCase.save();
                    })
                );
                updatedContest.testCases = savedTestCases.map((test) => test._id);
                await updatedContest.save();
            }

            res.status(200).json({ message: "Contest updated successfully", contest: updatedContest });
        } catch (error) {
            console.error("Error deleting updated:", error);
            res.status(500).json({
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    DeleteContest = expressAsyncHandler(async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "Invalid contest ID" });
                return;
            }
            const deletedContest = await contestModel.findByIdAndDelete(id);
            if (!deletedContest) {
                res.status(404).json({ message: "Contest not found" });
                return;
            }
            await testcaseModel.deleteMany({ contest: id });
            res.status(200).json({ message: "Contest deleted successfully", contest: deletedContest });
        } catch (error) {
            console.error("Error deleting contest:", error);
            res.status(500).json({
                message: "Internal server error",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
}

export default new Contests();
