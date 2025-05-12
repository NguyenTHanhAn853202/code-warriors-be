import { Server, Socket } from "socket.io";
import RoomBattle from "../model/room.model";
import problemModel, { IProblem } from "../model/problem.model";
import mongoose, { Types } from "mongoose";
import testcaseModel from "@/model/testcase.model";
import submissionModel, { ISubmission } from "@/model/submission.model";
import runCode_Room from "@/utils/runCode_Room";

function handleRoomBattle(client: Socket, server: Server) {
  // Tham gia phòng
  client.on("join_room", async ({ roomId, username }) => {
    try {
      console.log("join_room", roomId, username);
      if (!roomId || !username) {
        client.emit("room_join_error", {
          message: "Thiếu thông tin phòng hoặc tên người chơi",
        });
        return;
      }

      const room = await RoomBattle.findOne({ roomId });

      if (!room) {
        client.emit("room_join_error", { message: "Phòng không tồn tại" });
        return;
      }

      if (!room.players.includes(username)) {
        room.players.push(username);
        await room.save();
      }

      client.join(roomId);
      client.emit("room_joined", room);
      server.to(roomId).emit("player_joined", { room, username });

      const updatedRoom = await RoomBattle.findOne({ roomId });
      server.to(roomId).emit("room_updated", updatedRoom);
    } catch (err) {
      console.error("Error in join_room:", err);
      client.emit("room_join_error", { message: "Lỗi khi tham gia phòng" });
    }
  });

  // Rời phòng
  client.on("leave_room", async ({ roomId, username }) => {
    try {
      const room = await RoomBattle.findOne({ roomId });
      if (!room) {
        client.emit("error", { message: "Phòng không tồn tại" });
        return;
      }

      client.leave(roomId);
      room.players = room.players.filter((player) => player !== username);

      if (room.players.length === 0 || room.createdBy === username) {
        await RoomBattle.deleteOne({ roomId });
        server.emit("room_deleted", roomId);
      } else {
        await room.save();
        server.to(roomId).emit("player_left", { room, username });
      }
    } catch (err) {
      console.error("Error in leave_room:", err);
      client.emit("error", { message: "Lỗi khi rời phòng" });
    }
  });

  // Bắt đầu trận đấu
  client.on("start_battle", async ({ roomId, username }) => {
    try {
      const room = await RoomBattle.findOne({ roomId });
      if (!room) {
        return client.emit("error", { message: "Phòng không tồn tại" });
      }
      if (room.createdBy !== username) {
        return client.emit("error", {
          message: "Không có quyền bắt đầu trận đấu",
        });
      }
      if (room.players.length < 2) {
        return client.emit("error", { message: "Cần ít nhất 2 người chơi" });
      }

      const count = await problemModel.countDocuments();
      if (count === 0) {
        return client.emit("error", { message: "Không có bài toán nào" });
      }

      const random = Math.floor(Math.random() * count);
      const randomProblem = await problemModel
        .findOne()
        .skip(random)
        .select("_id title description difficulty timeout startDate endDate");

      if (!randomProblem) {
        return client.emit("error", { message: "Không thể lấy bài toán" });
      }

      room.problems = randomProblem._id as Types.ObjectId;
      room.status = "ongoing";
      room.startedAt = new Date();
      await room.save();

      server.to(roomId).emit("battle_started", {
        room,
        problemId: randomProblem._id,
        battleUrl: `/battle?matchId=${roomId}&problemId=${randomProblem._id}`,
      });

      // Set timeout for the battle
      setTimeout(async () => {
        if (room.status === "ongoing") {
          room.status = "finished";
          await room.save();
          server.to(roomId).emit("battle_timeout", {
            message: "Hết thời gian",
            room,
          });
        }
      }, (randomProblem.timeout || 3600) * 1000);
    } catch (err) {
      console.error("Error in start_battle:", err);
      client.emit("error", { message: "Lỗi khi bắt đầu trận đấu" });
    }
  });

  // client.on(
  //   "submit_room",
  //   async ({ roomId, languageId, sourceCode, username }) => {
  //     try {
  //       // Validate inputs
  //       if (
  //         !roomId ||
  //         !languageId ||
  //         !sourceCode ||
  //         !username ||
  //         !client.user?._id
  //       ) {
  //         client.emit("error", {
  //           message: "Thiếu thông tin hoặc chưa xác thực",
  //         });
  //         return;
  //       }

  //       // Get room
  //       const room = await RoomBattle.findOne({ roomId }).populate(
  //         "submissions.submission"
  //       );
  //       if (!room || room.status !== "ongoing") {
  //         client.emit("error", {
  //           message: "Phòng không tồn tại hoặc đã kết thúc",
  //         });
  //         return;
  //       }

  //       // Check duplicate submission
  //       if (room.submissions.find((sub) => sub.username === username)) {
  //         client.emit("error", { message: "Bạn đã nộp bài rồi" });
  //         return;
  //       }

  //       // Get problem and testcases
  //       const problem = await problemModel.findById(room.problems);
  //       const testcases = await testcaseModel.find({ problem: room.problems });

  //       if (!problem) {
  //         client.emit("error", { message: "Không tìm thấy bài toán" });
  //         return;
  //       }

  //       // Create submission
  //       let submission;
  //       try {
  //         const evaluation = await runCode_Room(
  //           languageId,
  //           sourceCode,
  //           testcases,
  //           problem.timeout || 180
  //         );
  //         submission = await submissionModel.create({
  //           user: client.user._id,
  //           problem: room.problems,
  //           code: sourceCode,
  //           language: languageId,
  //           grade: evaluation.point,
  //           memoryUsage: evaluation.memory,
  //           executionTime: evaluation.time,
  //           status: "Accepted",
  //         });
  //       } catch (error) {
  //         submission = await submissionModel.create({
  //           user: client.user._id,
  //           problem: room.problems,
  //           code: sourceCode,
  //           language: languageId,
  //           grade: 0,
  //           memoryUsage: 0,
  //           executionTime: 0,
  //           status: "Wrong Answer",
  //         });
  //       }

  //       // Add submission to room
  //       room.submissions.push({
  //         username,
  //         submission: submission.id,
  //       });

  //       // Finish room if all submitted
  //       if (room.submissions.length === room.players.length) {
  //         room.status = "finished";
  //         room.endedAt = new Date();
  //         room.winner = username; // Set current user as winner if accepted

  //         server.to(roomId).emit("finish_room", { room });
  //       }

  //       await room.save();
  //       client.emit("submission_success", {
  //         message: "Nộp bài thành công",
  //         submissionId: submission.id,
  //       });
  //     } catch (err) {
  //       console.error("Error in submit_room:", err);
  //       client.emit("error", { message: "Lỗi khi nộp bài" });
  //     }
  //   }
  // );

  client.on("get_room_results", async ({ roomId }) => {
    try {
      const room = await RoomBattle.findOne({ roomId }).populate<{
        submissions: { username: string; submission: ISubmission }[];
      }>({
        path: "submissions.submission",
        model: "Submission",
      });

      if (!room) {
        client.emit("error", { message: "Phòng không tồn tại" });
        return;
      }

      const results = room.players.map((player) => {
        const submission = room.submissions.find(
          (sub) => sub.username === player
        );
        return {
          username: player,
          grade: submission?.submission?.grade || null,
          executionTime: submission?.submission?.executionTime || null,
          memoryUsage: submission?.submission?.memoryUsage || null,
          status: submission?.submission?.status || "Not Submitted",
        };
      });

      client.emit("room_results", {
        results,
        winner: room.winner,
        status: room.status,
        startedAt: room.startedAt,
        endedAt: room.endedAt,
      });
    } catch (err) {
      console.error("Error in get_room_results:", err);
      client.emit("error", { message: "Lỗi khi lấy kết quả phòng" });
    }
  });
}

export default handleRoomBattle;
