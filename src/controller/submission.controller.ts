import { Request, Response } from "express";
import testcaseModel from "../model/testcase.model";
import sendResponse from "../utils/response";
import { httpCode } from "../utils/httpCode";
import { URL_JUDGE0 } from "../utils/secret";
import expressAsyncHandler from "express-async-handler";
import { Judge0Status } from "../utils/judge0Status";
import problemModel from "../model/problem.model";
import { AppError } from "../utils/AppError";
import Leaderboard from "../model/leaderboard.model";
import userModel from "../model/user.model";
import runCode from "../utils/runCode";
import mongoose from "mongoose";
import RoomBattle, { IRoomBattle } from "../model/room.model";
import submissionModel from "../model/submission.model";
import { time } from "console";

// Add these interfaces at the top of the file after imports
interface IPopulatedProblem {
  _id: mongoose.Types.ObjectId;
  timeout: number;
  title: string;
  description: string;
}

interface IPopulatedRoom extends Omit<IRoomBattle, "problems"> {
  problems: IPopulatedProblem;
}

interface IRanking {
  username: string;
  points: number;
  executionTime: number;
  memoryUsage: number;
  status: string;
  duration: number;
  submittedAt?: Date;
  rank: number;
}

class SubmissionController {
  evaluation = expressAsyncHandler(async (req: Request, res: Response) => {
    const { languageId, sourceCode, problemId } = req.body;
    const testcases = await testcaseModel
      .find({ problem: problemId })
      .select("expectedOutput input problem");
    const problem = await problemModel.findById(problemId);

    if (!problem) {
      throw new AppError("Not found problem", httpCode.BAD_REQUEST, "warning");
    }

    const userId = req.user._id;

    const evaluate = await runCode(
      languageId,
      sourceCode,
      testcases,
      problem.timeout
    );

    const leaderboard = await Leaderboard.create({
      user: userId,
      problem: problemId,
      score: evaluate.point,
      time: evaluate.time,
      memory: evaluate.memory,
      oldSource: sourceCode,
      languageId: languageId,
    });

    await userModel.updateOne({ _id: userId }, { $inc: { xp: 1 } });

    sendResponse(res, "success", "check ", httpCode.OK, leaderboard);
  });

  run = expressAsyncHandler(async (req: Request, res: Response) => {
    const { sourceCode = null, languageId = null, problemId = null } = req.body;
    if (!sourceCode || !languageId || !problemId)
      throw new AppError("Miss information", httpCode.BAD_REQUEST, "warning");

    const testcases = await testcaseModel
      .find({ problem: problemId })
      .select("expectedOutput input problem");
    const problem = await problemModel.findById(problemId);

    if (!problem) {
      throw new AppError("Not found problem", httpCode.BAD_REQUEST, "warning");
    }

    const evaluate: any = await runCode(
      languageId,
      sourceCode,
      testcases,
      problem.timeout
    );

    evaluate.score = evaluate.point;
    sendResponse(res, "success", "done", httpCode.OK, evaluate);
  });

  historySubmit = expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = req.user._id;
    const problemId = req.params.problemId;

    if (!problemId)
      throw new AppError("Miss problemId", httpCode.FORBIDDEN, "warning");

    const histories = await Leaderboard.find({
      user: userId,
      problem: problemId,
    });
    sendResponse(res, "success", "done", httpCode.OK, histories);
  });

  getTop3Leaderboard = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const { problemId } = req.params;

      const problem = await problemModel.findById(problemId);
      if (!problem) {
        throw new AppError(
          "Problem not found",
          httpCode.BAD_REQUEST,
          "warning"
        );
      }

      const top3 = await Leaderboard.aggregate([
        { $match: { problem: new mongoose.Types.ObjectId(problemId) } },
        { $sort: { score: -1, time: 1, memory: 1, timeSubmission: 1 } },
        {
          $group: {
            _id: "$user",
            doc: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$doc" } },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            user: { username: 1, email: 1 },
            score: 1,
            time: 1,
            memory: 1,
            timeSubmission: 1,
            attempts: 1,
          },
        },
        { $sort: { score: -1, time: 1, memory: 1, timeSubmission: 1 } },
        { $limit: 3 },
      ]);

      sendResponse(res, "success", "Top 3 leaderboard", httpCode.OK, top3);
    }
  );

  submitRoomBattle = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { sourceCode, languageId, roomId } = req.body;

        // Validate user
        if (!req.user?._id || !req.user?.username) {
          throw new AppError("Unauthorized", httpCode.UNAUTHORIZED, "warning");
        }
        const userId = req.user._id;
        const username = req.user.username;

        // Validate input
        if (!sourceCode || !languageId || !roomId) {
          throw new AppError(
            "Thiếu thông tin",
            httpCode.BAD_REQUEST,
            "warning"
          );
        }

        // First get room to check state
        const room = await RoomBattle.findOne({ roomId }).populate<{
          problems: IPopulatedProblem;
        }>({
          path: "problems",
          select: "timeout title description",
        });

        if (!room) {
          throw new AppError(
            "Phòng không tồn tại",
            httpCode.NOT_FOUND,
            "warning"
          );
        }

        // Validate room state
        if (room.status !== "ongoing") {
          throw new AppError(
            "Phòng đã kết thúc",
            httpCode.BAD_REQUEST,
            "warning"
          );
        }

        if (room.submissions.some((sub) => sub.username === username)) {
          throw new AppError(
            "Bạn đã nộp bài rồi",
            httpCode.BAD_REQUEST,
            "warning"
          );
        }

        // Lock room for submission
        const lockedRoom = await RoomBattle.findOneAndUpdate(
          {
            _id: room._id,
            status: "ongoing",
            "submissions.username": { $ne: username },
            submitting: { $ne: username },
          },
          { $addToSet: { submitting: username } },
          { new: true }
        );

        if (!lockedRoom) {
          throw new AppError(
            "Không thể nộp bài lúc này",
            httpCode.BAD_REQUEST,
            "warning"
          );
        }

        try {
          // Get testcases
          const testcases = await testcaseModel
            .find({ problem: room.problems._id })
            .select("input expectedOutput");

          if (!testcases.length) {
            throw new AppError(
              "Không có testcase nào",
              httpCode.BAD_REQUEST,
              "warning"
            );
          }

          // Run code evaluation
          const evaluation = await runCode(
            languageId,
            sourceCode,
            testcases,
            room.problems.timeout || 180000
          );

          // Create submission
          const submission = await submissionModel.create({
            user: userId,
            problem: room.problems._id,
            room: room._id,
            code: sourceCode,
            language: languageId,
            grade: evaluation.point,
            memoryUsage: evaluation.memory,
            executionTime: evaluation.time,
            status:
              evaluation.point === testcases.length
                ? "Accepted"
                : "Wrong Answer",
            username: username,
          });

          // Update room with submission
          const updatedRoom = await RoomBattle.findOneAndUpdate(
            {
              _id: room._id,
              status: "ongoing",
              submitting: username,
            },
            {
              $push: {
                submissions: {
                  username,
                  submission: submission._id,
                  submittedAt: new Date(),
                },
              },
              $pull: { submitting: username },
              ...(room.submissions.length + 1 === room.players.length
                ? {
                    $set: {
                      status: "finished",
                      endedAt: new Date(),
                      winner: username, // Set winner if this is the last submission
                    },
                  }
                : {}),
            },
            { new: true }
          );

          if (!updatedRoom) {
            // Cleanup if update fails
            await submissionModel.findByIdAndDelete(submission._id);
            throw new AppError(
              "Không thể thêm bài nộp",
              httpCode.BAD_REQUEST,
              "warning"
            );
          }

          // If room is complete, create leaderboard entries
          if (updatedRoom.status === "finished") {
            await Promise.all(
              updatedRoom.submissions.map((sub) =>
                Leaderboard.create({
                  user: userId,
                  problem: room.problems._id,
                  score: evaluation.point,
                  time: evaluation.time,
                  memory: evaluation.memory,
                  timeSubmission: new Date(),
                })
              )
            );
          }

          return sendResponse(
            res,
            "success",
            "Nộp bài thành công",
            httpCode.OK,
            {
              isComplete: updatedRoom.status === "finished",
              submission: {
                grade: evaluation.point,
                total: testcases.length,
                executionTime: evaluation.time,
                memoryUsage: evaluation.memory,
                status:
                  evaluation.point === testcases.length
                    ? "Accepted"
                    : "Wrong Answer",
              },
              ...(updatedRoom.status === "finished"
                ? {
                    redirect: `/battleOngoing/matchResult/${roomId}`,
                  }
                : {}),
            }
          );
        } catch (error) {
          throw error;
        } finally {
          // Always cleanup submitting status
          await RoomBattle.updateOne(
            { _id: room._id },
            { $pull: { submitting: username } }
          );
        }
      } catch (error) {
        if (error instanceof AppError) {
          return sendResponse(res, "error", error.message, error.statusCode);
        }
        console.error("Submission error:", error);
        return sendResponse(
          res,
          "error",
          "Lỗi server",
          httpCode.INTERNAL_SERVER_ERROR
        );
      }
    }
  );

  getBattleResult = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params;

      // Lấy thông tin phòng với submissions và problem
      const room = await RoomBattle.findOne({ roomId })
        .populate({
          path: "problems",
          select: "title description",
        })
        .populate({
          path: "submissions.submission",
          select: "grade executionTime memoryUsage status timeSubmission",
        })
        .select(
          "roomId players status rankings winner startedAt endedAt submissions"
        );

      if (!room) {
        return sendResponse(
          res,
          "error",
          "Không tìm thấy thông tin trận đấu",
          httpCode.NOT_FOUND
        );
      }

      // Add type assertion for room.rankings
      const formattedRankings: IRanking[] = (room.rankings || []).map(
        (rank) => {
          const submission = room.submissions.find(
            (sub) => sub.username === rank.username
          );

          return {
            username: rank.username,
            points: rank.points,
            executionTime: rank.executionTime,
            memoryUsage: rank.memoryUsage,
            status: rank.status,
            duration: rank.duration,
            submittedAt: submission?.submittedAt,
            rank: rank.rank,
          };
        }
      );

      // Sắp xếp rankings theo thứ hạng
      const sortedRankings = formattedRankings.sort((a, b) => {
        // Sort by points desc
        if (b.points !== a.points) return b.points - a.points;
        // Then by execution time asc
        if (a.executionTime !== b.executionTime)
          return a.executionTime - b.executionTime;
        // Then by memory usage asc
        return a.memoryUsage - b.memoryUsage;
      });

      return sendResponse(
        res,
        "success",
        "Lấy thông tin trận đấu thành công",
        httpCode.OK,
        {
          roomId: room.roomId,
          players: room.players,
          status: room.status,
          winner: room.winner,
          startedAt: room.startedAt,
          endedAt: room.endedAt,
          rankings: sortedRankings.map((r, index) => ({
            ...r,
            rank: index + 1, // Update rank based on sort order
          })),
        }
      );
    } catch (error) {
      console.error("Get battle result error:", error);
      return sendResponse(
        res,
        "error",
        "Lỗi server",
        httpCode.INTERNAL_SERVER_ERROR
      );
    }
  });
}

export default new SubmissionController();
