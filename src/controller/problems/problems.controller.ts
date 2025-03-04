import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import problemModel from "../../model/problem.model";
import testcaseModel from "../../model/testcase.model";
import RankModel from "../../model/rank.model";

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

      // Validate test cases if provided
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
}

export default new Problems();
