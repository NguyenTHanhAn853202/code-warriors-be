import { Server, Socket } from "socket.io";
import matchModel, { IMatch } from "../model/match.model";
import problemModel from "../model/problem.model";
import runCode from "../utils/runCode";
import testcaseModel from "../model/testcase.model";
import submissionModel, { ISubmission } from "../model/submission.model";
import mongoose from "mongoose";
import userModel from "../model/user.model";
import { AppError } from "../utils/AppError";

const matches = new Map<string, NodeJS.Timeout>();
type IMatchSubmission = {
  matchId: string;
  languageId: number;
  sourceCode: string;
};
const matchSumission = new Map<String, IMatchSubmission>();

const submission = async (
  matchId: string,
  languageId: number,
  sourceCode: string,
  socket: Socket,
  io: Server
) => {
  matchSumission.set(matchId, {
    matchId,
    languageId,
    sourceCode,
  });

  const match = await matchModel.findById(matchId);

  if (!match) return;

  const problemId = match?.problems;
  const testcases = await testcaseModel.find({ problem: problemId });
  const problem = await problemModel.findById(problemId);
  console.log("submission");
  let evaluation;
  let submission;
  try {
    evaluation = await runCode(
      languageId,
      sourceCode,
      testcases,
      problem?.timeout || 3 * 60
    );
    submission = await submissionModel.create({
      user: socket.user._id,
      problem: problemId,
      code: sourceCode,
      match: matchId,
      language: languageId,
      grade: evaluation.point,
      memoryUsage: evaluation.memory,
      executionTime: evaluation.time,
      timeSubmission: Math.floor(
        (new Date(match.endedAt || "").getTime() - Date.now()) / 1000
      ),
      status: "Accepted",
    });
  } catch (error: any) {
    console.log(error.message, error);
    submission = await submissionModel.create({
      user: socket.user._id,
      problem: problemId,
      code: sourceCode,
      match: matchId,
      language: languageId,
      grade: 0,
      memoryUsage: 0,
      executionTime: 0,
      timeSubmission: Math.floor(
        (new Date(match.endedAt || "").getTime() - Date.now()) / 1000
      ),
      status: "Wrong Answer",
    });
  }
  if (match.player1.toString() === socket.user._id) {
    match.player1Submissions = submission._id as mongoose.Types.ObjectId;
  }
  if (match.player2.toString() === socket.user._id) {
    match.player2Submissions = submission._id as mongoose.Types.ObjectId;
  }
  if (match.player2Submissions && match.player1Submissions) {
    const submissions = await submissionModel
      .find({ match: matchId })
      .sort({ grade: -1, executionTime: 1, memoryUsage: 1, timeSubmission: 1 });
    const s1 = submissions[0];
    const s2 = submissions[1];
    let winner, loser;
    if (s1.status !== "Accepted" && s2.status !== "Accepted") {
      // hoa
      winner = null;
      loser = null;
    } else if (s1.status === "Accepted" && s2.status !== "Accepted") {
      winner = s1.user;
      loser = s2.user;
    } else if (s1.status !== "Accepted" && s2.status === "Accepted") {
      winner = s2.user;
      loser = s1.user;
    } else {
      winner = s1.user;
      loser = s2.user;
    }

    match.winner = winner;
    await userModel.updateOne({ _id: winner }, { $inc: { elo: 100 } });
    const loserDetail = await userModel.findById(loser);
    if (loserDetail) {
      if (loserDetail?.elo > 100) {
        loserDetail.elo = loserDetail.elo - 100;
      } else {
        loserDetail.elo = 0;
      }
      await loserDetail.save();
    }
    match.status = "Completed";
    io.to(matchId).emit("finish_match", {
      matchId: matchId,
    });
  } else {
    console.log("competitor_submission");
    socket.to(matchId).emit("competitor_submission", submission);
  }
  await match.save();
  matchSumission.delete(matchId);
  // let evaluation = {
  //     point: Math.floor(Math.random() * 101), // Random từ 0 đến 100
  //     time: Math.random() * 10, // Random từ 0 đến 10 giây
  //     memory: Math.random() * 1024 // Random từ 0 đến 1024 MB
  // };

  // if (matches.has(matchId)) {
  //     clearTimeout(matches.get(matchId));
  //     matches.delete(matchId);
  // }
  // io.to(matchId).emit("result_match",{
  //     winner: "winner",
  //     result:submissions
  // })
};

function statusMatch(socket: Socket, io: Server) {
  socket.on("accept_match", async (data) => {
    const userId = socket.user._id;
    const { matchId, roomId } = data;
    const match = await matchModel.findById(matchId);
    if (match === null) {
      socket.send({ sucess: false, message: "Dont find the match" });
      return;
    }
    if (match.player1 === null) {
      match.player1 = userId;
    } else {
      const period = 10 * 60 * 1000;
      const endTime = new Date(Date.now() + period);
      match.player2 = userId;
      match.endedAt = endTime;
      console.log("debug1");

      io.to(roomId).emit("start_match", {
        matchId,
        roomId,
        success: true,
        endTime: endTime,
      });
      console.log("debug2");

      const timer = setTimeout(() => {
        console.log("calll  me");

        io.to(matchId).emit("match_ended", { matchId });
        matches.delete(matchId);
      }, period);
      matches.set(matchId, timer);
    }
    await match.save();
  });
  socket.on("cancelMatch", (matchId) => {
    if (matches.has(matchId)) {
      clearTimeout(matches.get(matchId));
      matches.delete(matchId);
    }
  });
  socket.on("reject_match", async (data) => {
    const userId = socket.user._id;
    const { matchId, roomId } = data;
    const isDeleted = await matchModel.deleteOne({ _id: matchId });
    if (isDeleted.deletedCount > 0 && isDeleted.acknowledged) {
      io.to(roomId).emit("reject_match", {
        success: true,
        userId,
        matchId,
        roomId,
      });
    }
  });

  socket.on("submit_match", async (data) => {
    try {
      const { matchId, languageId, sourceCode } = data;
      if (!matchSumission.get(matchId)) {
        await submission(matchId, languageId, sourceCode, socket, io);
      } else {
        let id = setInterval(() => {
          //   console.log(matchId, socket.user);

          (async () => {
            // console.log(matchSumission.get(matchId));

            if (!matchSumission.get(matchId)) {
              await submission(matchId, languageId, sourceCode, socket, io);
              clearInterval(id);
            }
          })();
        }, 100);
      }
    } catch (error) {
      console.log(error);
    } finally {
    }
  });
}

export default statusMatch;
