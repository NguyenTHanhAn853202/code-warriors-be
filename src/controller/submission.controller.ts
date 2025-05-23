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
import runCode_Room from "../utils/runCode_Room";

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
  run1 = expressAsyncHandler(async (req: Request, res: Response) => {
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

    const evaluate: any = await runCode_Room(
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

  getBattleResult = expressAsyncHandler(async (req: Request, res: Response) => {
     try {
        const { roomId } = req.params;
    
        // Tìm phòng và populate submissions
        const room = await RoomBattle.findOne({ roomId }).populate({
          path: "submissions.submission",
          select: "grade executionTime memoryUsage status timeSubmission",
        });
    
        if (!room) {
          return sendResponse(
            res,
            "error",
            "Phòng không tồn tại",
            httpCode.NOT_FOUND
          );
        }
    
        // Lấy tất cả submissions thuộc phòng này
        const submissions = await submissionModel.find({ room: room._id }).select(
          "username grade executionTime memoryUsage status timeSubmission"
        ).lean();
    
        // Tính điểm và xếp hạng
        const rankings = submissions.sort((a, b) => {
          if (b.grade !== a.grade) return b.grade - a.grade;
          if (a.executionTime !== b.executionTime)
            return a.executionTime - b.executionTime;
          return a.memoryUsage - b.memoryUsage;
        });
    
        const submissionsWithRank = rankings.map((sub, index) => ({
          ...sub,
          rank: index + 1,
        }));
    
        // Trả về dữ liệu
        return sendResponse(
          res,
          "success",
          "Lấy thông tin phòng thành công",
          httpCode.OK,
          {
            ...room.toObject(),
            submissions: submissionsWithRank,
          }
        );
      } catch (error) {
        console.error("Get room error:", error);
        return sendResponse(
          res,
          "error",
          "Lỗi server",
          httpCode.INTERNAL_SERVER_ERROR
        );
      }
  });

  submitRoomBattle = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { sourceCode, languageId, roomId } = req.body;

        if (!req.user?._id || !req.user?.username) {
          throw new AppError("Unauthorized", httpCode.UNAUTHORIZED, "warning");
        }
        const userId = req.user._id;
        const username = req.user.username;

        if (!sourceCode || !languageId || !roomId) {
          throw new AppError(
            "Thiếu thông tin",
            httpCode.BAD_REQUEST,
            "warning"
          );
        }

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

        // Khóa phòng để nộp bài
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
            "Không thể khóa phòng để nộp bài",
            httpCode.BAD_REQUEST,
            "warning"
          );
        }

        try {
          // Lấy testcase
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

          // Thực thi mã
          const evaluation = await runCode_Room(
            languageId,
            sourceCode,
            testcases,
            room.problems.timeout || 180000
          );

          const isAccepted = evaluation.point === testcases.length;

          const submissionData = {
            user: userId,
            problem: room.problems._id,
            room: room._id,
            code: sourceCode,
            language: languageId,
            grade: isAccepted ? evaluation.point : 0,
            memoryUsage: isAccepted ? evaluation.memory : 0,
            executionTime: isAccepted ? evaluation.time : 0,
            status: isAccepted ? "Accepted" : "Wrong Answer",
            username: username,
            timeSubmission: Date.now(),
          };

          // Lưu bài nộp
          const submission = await submissionModel.create(submissionData);

          // Tạo danh sách submission mới có bài nộp này
          const allSubmissions = [...room.submissions];
          allSubmissions.push({
            username,
            submission: submission.id,
            submittedAt: new Date(),
          });

          let updateData: any = {
            $push: {
              submissions: {
                username,
                submission: submission._id,
                submittedAt: new Date(),
              },
            },
            $pull: { submitting: username },
          };

          let newStatus = room.status;
          let winnerUsername = null;
          let rankings: any[] = [];

          if (allSubmissions.length === room.players.length) {
            // Phòng kết thúc, tính rankings

            // Lấy chi tiết bài nộp để tính điểm
            const userResults = await Promise.all(
              allSubmissions.map(async (sub) => {
                const subDetail = await submissionModel
                  .findById(sub.submission)
                  .select(
                    "grade executionTime memoryUsage status timeSubmission"
                  );
                return {
                  username: sub.username,
                  points: subDetail?.grade || 0,
                  executionTime: subDetail?.executionTime || 0,
                  memoryUsage: subDetail?.memoryUsage || 0,
                  status: subDetail?.status || "Not Submitted",
                  submittedAt: sub.submittedAt,
                };
              })
            );

            // Sắp xếp theo điểm giảm dần, thời gian tăng dần, bộ nhớ tăng dần
            userResults.sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              if (a.executionTime !== b.executionTime)
                return a.executionTime - b.executionTime;
              return a.memoryUsage - b.memoryUsage;
            });

            // Gán thứ hạng
            rankings = userResults.map((r, idx) => ({ ...r, rank: idx + 1 }));

            let newStatus: "waiting" | "ongoing" | "finished";
            newStatus = "finished"; // OK
            winnerUsername = isAccepted ? username : null;

            updateData = {
              ...updateData,
              status: newStatus,
              endedAt: new Date(),
              winner: winnerUsername,
              rankings,
            };
          }

          const updatedRoom = await RoomBattle.findOneAndUpdate(
            { _id: room._id, status: room.status },
            updateData,
            { new: true }
          );

          if (!updatedRoom) {
            throw new AppError(
              "Không thể cập nhật phòng, nhưng bài nộp đã được lưu",
              httpCode.BAD_REQUEST,
              "warning"
            );
          }

          // Cập nhật leaderboard nếu phòng kết thúc và bài nộp đúng
          if (updatedRoom.status === "finished" && isAccepted) {
            await Promise.all(
              updatedRoom.submissions.map((sub) =>
                Leaderboard.create({
                  user: userId,
                  problem: room.problems._id,
                  score: evaluation.point,
                  time: evaluation.time,
                  memory: evaluation.memory,
                  timeSubmission: Date.now(),
                })
              )
            );
          }

          // Trả về phản hồi
          return sendResponse(
            res,
            "success",
            "Nộp bài thành công",
            httpCode.OK,
            {
              isComplete: updatedRoom.status === "finished",
              submission: {
                grade: submissionData.grade,
                total: testcases.length,
                executionTime: submissionData.executionTime,
                memoryUsage: submissionData.memoryUsage,
                status: submissionData.status,
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
          // Đảm bảo xóa username khỏi submitting dù lỗi hay thành công
          await RoomBattle.updateOne(
            { _id: room._id },
            { $pull: { submitting: username } }
          );
        }
      } catch (error) {
        if (error instanceof AppError) {
          return sendResponse(res, "error", error.message, error.statusCode);
        }
        console.error("Lỗi nộp bài:", error);
        return sendResponse(
          res,
          "error",
          "Lỗi server",
          httpCode.INTERNAL_SERVER_ERROR
        );
      }
    }
  );
}

export default new SubmissionController();
