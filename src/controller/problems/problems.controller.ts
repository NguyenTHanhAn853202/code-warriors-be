import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import problemModel from "../../model/problem.model";
import testcaseModel from "../../model/testcase.model";
import RankModel from "../../model/rank.model";
import mongoose from "mongoose";
import { AppError } from "../../utils/AppError";
import { httpCode } from "../../utils/httpCode";
import sendResponse from "../../utils/response";
import algorithmType from "../../model/algorithmType.model";

interface TestCaseInput {
  input: string;
  expectedOutput: string;
}

class Problems {
  CreateProblems = expressAsyncHandler(async (req: Request, res: Response) => {
    console.log(" CreateProblems function is running...");
    const {
      title,
      description,
      difficulty = [],
      algorithmTypes = [],
      author,
      testCases = [],
      timeout = 5000,
      startDate = new Date(),
      endDate,
      source_code,
    } = req.body;

    const requiredFields = ["title", "description", "author"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return sendResponse(
        res,
        "error",
        `Thiếu các trường bắt buộc: ${missingFields.join(", ")}`,
        httpCode.BAD_REQUEST,
        {}
      );
    }

    const validRankNames = ["Bronze", "Silver", "Gold", "Platinum"];
    const invalidRanks = difficulty.filter(
      (rank: string) => !validRankNames.includes(rank)
    );

    if (invalidRanks.length > 0) {
      return sendResponse(
        res,
        "error",
        `Các rank không hợp lệ: ${invalidRanks.join(
          ", "
        )}. Sử dụng một trong các rank: ${validRankNames.join(", ")}`,
        httpCode.BAD_REQUEST,
        {}
      );
    }

    const validRanks = await RankModel.find({ name: { $in: difficulty } });
    console.log("Difficulty nhận được:", difficulty);
    console.log("Ranks tìm thấy:", validRanks);

    if (validRanks.length !== difficulty.length) {
      return sendResponse(
        res,
        "error",
        "Không tìm thấy đủ các rank trong database. Vui lòng chạy API createRanks trước.",
        httpCode.BAD_REQUEST,
        {}
      );
    }

    const algorithmIds = await algorithmType
      .find({ name: { $in: algorithmTypes } }) // Lọc các thuật toán có sẵn
      .select("_id") // Chỉ lấy _id
      .then((algorithms) => algorithms.map((algo) => algo._id));

    if (algorithmIds.length !== algorithmTypes.length) {
      return sendResponse(
        res,
        "error",
        "Không tìm thấy thuật toán . Vui lòng kiểm tra lại.",
        httpCode.BAD_REQUEST,
        {}
      );
    }

    if (testCases.length > 0) {
      const invalidTestCases = testCases.filter(
        (testCase: TestCaseInput) => !testCase.input || !testCase.expectedOutput
      );

      if (invalidTestCases.length > 0) {
        res.status(400).json({
          message: "Invalid test cases",
          details: "Each test case must have both input and expectedOutput",
        });
      }
    }

    const newProblem = await problemModel.create({
      title,
      description,
      difficulty: validRanks.map((rank) => rank._id),
      algorithmTypes: algorithmIds,
      author,
      testCases: [],
      timeout,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : undefined,
      source_code,
    });

    const savedTestCases = await Promise.all(
      testCases.map((test: TestCaseInput) =>
        new testcaseModel({
          problem: newProblem._id,
          input: test.input,
          expectedOutput: test.expectedOutput,
        }).save()
      )
    );
    newProblem.testCases = savedTestCases.map((test) => test._id);
    await newProblem.save();
    const populatedProblem = await problemModel
      .findById(newProblem._id)
      .populate("difficulty", "name")
      .populate("author")
      .populate("testCases", "input")
      .populate("algorithmTypes", "name");

    sendResponse(res, "success", "Problem created successfully", httpCode.OK, {
      problem: populatedProblem,
    });
  });

  ViewAllProblems = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { page = 1, limit = 10, difficulty, title } = req.query;

        const filter: any = {};
        if (difficulty) filter.difficulty = difficulty;
        if (title) filter.title = { $regex: title as string, $options: "i" };

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        const problems = await problemModel
          .find(filter)
          .select("title description difficulty author createdAt")
          .populate("difficulty", "name")
          // .populate("difficulty")
          .populate("algorithmTypes", "name")
          .populate("author", "username")
          .skip((pageNumber - 1) * limitNumber)
          .limit(limitNumber)
          .sort({ createdAt: -1 });

        const total = await problemModel.countDocuments(filter);

        res.status(200).json({
          message: "Problems retrieved successfully",
          problems,
          pagination: {
            currentPage: pageNumber,
            totalPages: Math.ceil(total / limitNumber),
            totalProblems: total,
          },
        });
      } catch (error) {
        console.error("Error retrieving problems:", error);
        res.status(500).json({
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  UpdateProblem = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.status(400).json({ message: "Invalid problem ID" });
          return;
        }

        const { testCases, author, createdAt, ...allowedUpdates } = updateData;

        const updatedProblem = await problemModel
          .findByIdAndUpdate(id, allowedUpdates, {
            new: true,
            runValidators: true,
          })
          .populate("difficulty")
          .populate("algorithmTypes")
          .populate("author");

        if (!updatedProblem) {
          res.status(404).json({ message: "Problem not found" });
          return;
        }

        if (testCases && testCases.length > 0) {
          await testcaseModel.deleteMany({ problem: id });

          const savedTestCases = await Promise.all(
            testCases.map(async (test: TestCaseInput) => {
              const newTestCase = new testcaseModel({
                problem: id,
                input: test.input,
                expectedOutput: test.expectedOutput,
              });
              return await newTestCase.save();
            })
          );

          updatedProblem.testCases = savedTestCases.map((test) => test._id);
          await updatedProblem.save();
        }

        res.status(200).json({
          message: "Problem updated successfully",
          problem: updatedProblem,
        });
      } catch (error) {
        console.error("Error updating problem:", error);
        res.status(500).json({
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
  DeleteProblem = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
          res.status(400).json({ message: "Invalid problem ID" });
          return;
        }

        const deletedProblem = await problemModel
          .findByIdAndDelete(id)
          .populate("difficulty")
          .populate("author");

        if (!deletedProblem) {
          res.status(404).json({ message: "Problem not found" });
          return;
        }

        await testcaseModel.deleteMany({ problem: id });

        res.status(200).json({
          message: "Problem deleted successfully",
          problem: deletedProblem,
        });
      } catch (error) {
        console.error("Error deleting problem:", error);
        res.status(500).json({
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  get = expressAsyncHandler(async (req: Request, res: Response) => {
    const problemId = req.params.id;
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

export default new Problems();
