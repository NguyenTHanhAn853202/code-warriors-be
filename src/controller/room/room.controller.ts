import { Request, Response, NextFunction } from "express";
import expressAsyncHandler from "express-async-handler";
import RoomBattleModel from "../../model/room.model";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../../utils/AppError";
import { httpCode } from "../../utils/httpCode";
import { comparePassword, hashPassword } from "../../utils/hashPassword";
import sendResponse, { status } from "../../utils/response";
import testcaseModel from "../../model/testcase.model";
import problemModel from "../../model/problem.model";
import runCode from "../../utils/runCode";
import submissionModel, { ISubmission } from "../../model/submission.model";
import roomModel from "../../model/room.model";
import mongoose, { ObjectId } from "mongoose";

class RoomBattleController {
  getRooms = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const rooms = await RoomBattleModel.find({ status: "waiting" });

      res.json({
        status: "success",
        data: rooms,
      });
    }
  );

  // Tạo phòng mới
  createRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { maxPlayers, isPrivate, password } = req.body;
      // const username = req.user.username;
      const username = req.body.username;

      const hashedPassword = password
        ? await hashPassword(password)
        : undefined;
      const generateRoomId = () => {
        return Math.floor(10000 + Math.random() * 90000).toString();
      };
      const newRoom = await RoomBattleModel.create({
        roomId: generateRoomId(),
        players: [username],
        maxPlayers: maxPlayers || 4,
        createdBy: username,
        isPrivate,
        password: hashedPassword,
        status: "waiting",
      });
      console.log("infor room", newRoom);

      res.status(httpCode.OK).json({
        status: "success",
        data: newRoom,
      });
    }
  );

  joinRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId, password } = req.body;
      // const username = req.user.username;
      const username = req.body.username;
      if (!username) {
        throw new AppError(
          "Username is required",
          httpCode.UNAUTHORIZED,
          "error"
        );
      }
      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Room not found", httpCode.NOT_FOUND, "error");
      }

      if (room.status !== "waiting") {
        throw new AppError(
          "Room is not available",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      if (room.players.length >= room.maxPlayers) {
        throw new AppError("Room is full", httpCode.BAD_REQUEST, "error");
      }

      if (room.players.includes(username)) {
        throw new AppError("Already in room", httpCode.BAD_REQUEST, "error");
      }

      if (room.isPrivate && password !== room.password) {
        throw new AppError("Invalid password", httpCode.UNAUTHORIZED, "error");
      }
      if (room.isPrivate) {
        const isMatch = await comparePassword(password, room.password);
        if (!isMatch) {
          throw new AppError(
            "Invalid password",
            httpCode.UNAUTHORIZED,
            "error"
          );
        }
      }

      room.players.push(username);
      await room.save();

      res.json({
        status: "success",
        data: room,
      });
    }
  );

  leaveRoom = expressAsyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { roomId } = req.body;
      // const username = req.user.username;
      const username = req.body.username;

      const room = await RoomBattleModel.findOne({ roomId });

      if (!room) {
        throw new AppError("Room not found", httpCode.NOT_FOUND, "error");
      }

      if (!room.players.includes(username)) {
        throw new AppError("Not in room", httpCode.BAD_REQUEST, "error");
      }
      if (room.createdBy === username) {
        await RoomBattleModel.deleteOne({ roomId });
        res.json({
          status: "success",
          message: "Room deleted as creator left",
        });
      }
      if (room.status !== "waiting") {
        throw new AppError(
          "Cannot leave after game started",
          httpCode.BAD_REQUEST,
          "error"
        );
      }

      room.players = room.players.filter((player) => player !== username);
      await room.save();

      res.json({
        status: "success",
        data: room,
      });
    }
  );

getRoomById = expressAsyncHandler(async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    // Tìm phòng và populate submissions
    const room = await RoomBattleModel.findOne({ roomId }).populate({
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


  submit = expressAsyncHandler(async (req: Request, res: Response) => {
    const { languageId, sourceCode, problemId, roomId, roomMatch } = req.body;
    const testcases = await testcaseModel
      .find({ problem: problemId })
      .select("expectedOutput input problem");
    const problem = await problemModel.findById(problemId);

    if (!problem) {
      throw new AppError("Not found problem", httpCode.BAD_REQUEST, "warning");
    }

    const userId = req.user._id;

    // const leaderboard = await Leaderboard.findOneAndUpdate({user:userId, problem:problemId},{$inc:{attempts:1},score:evaluate.point, time:evaluate.time, memory:evaluate.memory, oldSource:sourceCode,languageId:languageId},{new:true,upsert:true})

    let evaluation;
    let submission: ISubmission;

    try {
      evaluation = await runCode(
        languageId,
        sourceCode,
        testcases,
        problem?.timeout || 3 * 60
      );
      submission = await submissionModel.create({
        user: userId,
        problem: problemId,
        code: sourceCode,
        language: languageId,
        grade: evaluation.point,
        memoryUsage: evaluation.memory,
        executionTime: evaluation.time,
      });
    } catch (error: any) {
      console.log(error.message, error);
      submission = await submissionModel.create({
        user: userId,
        problem: problemId,
        code: sourceCode,
        language: languageId,
        grade: 0,
        memoryUsage: 0,
        executionTime: 0,
        status: "Wrong Answer",
      });
    }
    if (!submission) throw new AppError("error", httpCode.BAD_REQUEST, "error");
    const room = await roomModel.findById(roomId);
    if (!room) throw new AppError("error", httpCode.BAD_REQUEST, "error");
    room?.submissions.push({
      username: req.user.username,
      submission: submission._id as mongoose.Types.ObjectId,
    });

    if (room?.submissions.length === room?.players.length) {
      const arr = [];
      for (let i = 0; i < room?.submissions.length; i++) {
        let item = room?.submissions[i];
        const s = await submissionModel.findById(item.submission);
        if (!s) throw new AppError("error", httpCode.BAD_REQUEST, "error");
        arr.push({
          username: item.username,
          grade: s?.grade,
          time: s?.executionTime,
          memory: s?.memoryUsage,
        });
      }
      arr.sort((a, b) => {
        if (b.grade !== a.grade) return b.grade - a.grade; // grade giảm dần
        if (a.time !== b.time) return a.time - b.time; // time tăng dần
        return a.memory - b.memory; // memory tăng dần
      });
      room.winner = arr[0].username;
      req.io?.to(roomMatch).emit("finish_room", {
        room: room,
      });
    }
    await room.save();
    sendResponse(res, "success", "success", httpCode.OK, room);
  });
}

export default new RoomBattleController();
