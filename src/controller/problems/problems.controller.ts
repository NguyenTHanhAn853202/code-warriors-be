import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import problemModel from "../../model/problem.model";
import testcaseModel from "../../model/testcase.model";
import RankModel from "../../model/rank.model";
import mongoose from "mongoose";

interface TestCaseInput {
  input: string;
  expectedOutput: string;
}

class Problems {
  CreateProblems = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        title,
        description,
        difficulty = [],
        author,
        testCases = [],
        timeout = 5000,
        startDate = new Date(),
        endDate,
        source_code,
      } = req.body;

      let finalDifficulty = difficulty;
      if (difficulty.length === 0) {
        const defaultRank = await RankModel.findOne({})
          .sort({ minElo: 1 })
          .select("_id");
        if (defaultRank) {
          finalDifficulty = [defaultRank._id];
        }
      }

      const requiredFields = ["title", "description", "author"];
      const missingFields = requiredFields.filter((field) => !req.body[field]);

      if (missingFields.length > 0) {
        res.status(400).json({
          message: "Missing required fields",
          missingFields,
        });
      }

      if (testCases.length > 0) {
        const invalidTestCases = testCases.filter(
          (testCase: TestCaseInput) =>
            !testCase.input || !testCase.expectedOutput
        );

        if (invalidTestCases.length > 0) {
          res.status(400).json({
            message: "Invalid test cases",
            details: "Each test case must have both input and expectedOutput",
          });
        }
      }

      try {
        const newProblem = new problemModel({
          title,
          description,
          difficulty: finalDifficulty,
          author,
          testCases: [],
          timeout,
          startDate,
          endDate,
          source_code,
        });

        await newProblem.save();

        const savedTestCases = await Promise.all(
          testCases.map(async (test: TestCaseInput) => {
            const newTestCase = new testcaseModel({
              problem: newProblem._id,
              input: test.input,
              expectedOutput: test.expectedOutput,
            });
            return await newTestCase.save();
          })
        );

        newProblem.testCases = savedTestCases.map((test) => test._id);
        await newProblem.save();

        const populatedProblem = await problemModel
          .findById(newProblem._id)
          .populate("difficulty")
          .populate("author")
          .populate("testCases");

        res.status(201).json({
          message: "Problem created successfully",
          problem: populatedProblem,
        });
      } catch (error) {
        console.error("Problem creation error:", error);
        res.status(500).json({
          message: "Internal server error",
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred during problem creation",
        });
      }
    }
  );

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
}

export default new Problems();
