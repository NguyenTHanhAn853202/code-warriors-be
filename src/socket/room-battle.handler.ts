import { Server, Socket } from "socket.io";
import RoomBattle from "../model/room.model";
import problemModel, { IProblem } from "../model/problem.model";
import mongoose, { Types } from "mongoose";
import testcaseModel from "../model/testcase.model";
import submissionModel, { ISubmission } from "../model/submission.model";
import runCode_Room from "../utils/runCode_Room";
import runCode from "../utils/runCode";
import { time } from "console";

interface IProblemPopulated {
  _id: Types.ObjectId;
  timeout?: number;
  title?: string;
  description?: string;
}

function calculateRankings(submissions: any[], startedAt: Date) {
  return submissions
    .map((sub) => ({
      ...sub,
      duration:
        new Date(sub.submittedAt).getTime() - new Date(startedAt).getTime(),
    }))
    .sort((a, b) => {
      if (b.grade !== a.grade) return b.grade - a.grade;
      if (a.duration !== b.duration) return a.duration - b.duration;
      if (a.executionTime !== b.executionTime)
        return a.executionTime - b.executionTime;
      return a.memoryUsage - b.memoryUsage;
    })
    .map((sub, index) => ({
      ...sub,
      rank: index + 1,
    }));
}

function handleRoomBattle(client: Socket, server: Server) {
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

  client.on(
    "submit_code",
    async ({ roomId, username, sourceCode, languageId }) => {
      try {
        if (!roomId || !username || !sourceCode || !languageId) {
          return client.emit("submission_error", {
            message: "Thiếu thông tin",
          });
        }

        const room = await RoomBattle.findOne({ roomId }).populate<{
          problems: IProblemPopulated;
        }>({
          path: "problems",
          select: "timeout",
        });
        if (!room) {
          return client.emit("submission_error", {
            message: "Phòng không tồn tại",
          });
        }

        if (room.status !== "ongoing") {
          return client.emit("submission_error", {
            message: "Phòng đã kết thúc",
          });
        }

        if (room.submissions.some((sub) => sub.username === username)) {
          return client.emit("submission_error", {
            message: "Bạn đã nộp bài rồi",
          });
        }

        try {
          const testcases = await testcaseModel
            .find({ problem: room.problems._id })
            .select("input expectedOutput");

          if (!testcases.length) {
            throw new Error("Không có testcase nào");
          }
          const evaluation = await runCode(
            languageId,
            sourceCode,
            testcases,
            room.problems?.timeout || 180000
          );

          const submittedAt = new Date();
          if (!room.startedAt) {
            throw new Error("Thời gian bắt đầu không hợp lệ");
          }
          const timeSubmission =
            submittedAt.getTime() - room.startedAt.getTime();

          const submission = await submissionModel.create({
            user: client.data?.userId || null,
            username,
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
            timeSubmission,
          });
          const updatedRoom = await RoomBattle.findOneAndUpdate(
            { _id: room._id, status: "ongoing" },
            {
              $push: {
                submissions: {
                  username,
                  submission: submission._id,
                  submittedAt,
                },
              },
              ...(room.submissions.length + 1 === room.players.length
                ? {
                    $set: {
                      status: "finished",
                      endedAt: submittedAt,
                      winner: username,
                    },
                  }
                : {}),
            },
            { new: true }
          );

          if (!updatedRoom) {
            await submissionModel.findByIdAndDelete(submission._id);
            throw new Error("Không thể cập nhật phòng");
          }
          const submissionResult = {
            username,
            grade: evaluation.point,
            total: testcases.length,
            executionTime: evaluation.time,
            memoryUsage: evaluation.memory,
            status:
              evaluation.point === testcases.length
                ? "Accepted"
                : "Wrong Answer",
            timeSubmission,
          };

          server.to(roomId).emit("submission_update", {
            submission: submissionResult,
            isComplete: updatedRoom.status === "finished",
          });

          client.emit("submission_success", submissionResult);

          if (updatedRoom.status === "finished") {
            const allSubmissions = await submissionModel
              .find({ room: room._id })
              .select(
                "username grade executionTime memoryUsage status timeSubmission"
              )
              .lean();

            const rankings = calculateRankings(allSubmissions, room.startedAt);
            const winner = rankings[0];

            await RoomBattle.findByIdAndUpdate(room._id, {
              winner: winner.username,
              rankings: rankings.map((r) => ({
                username: r.username,
                points: r.grade,
                executionTime: r.executionTime,
                memoryUsage: r.memoryUsage,
                status: r.status,
                duration: r.timeSubmission,
                rank: r.rank,
              })),
            });

            server.to(roomId).emit("battle_finished", {
              message: "Trận đấu đã kết thúc",
              redirectUrl: `/battle-result/${roomId}`,
            });

            server.in(roomId).socketsLeave(roomId);
          }
        } catch (error: any) {
          client.emit("submission_error", {
            message: error.message || "Lỗi khi xử lý bài nộp",
          });
        }
      } catch (err) {
        console.error("Error in submit_code:", err);
        client.emit("submission_error", { message: "Lỗi server" });
      }
    }
  );
}

export default handleRoomBattle;
