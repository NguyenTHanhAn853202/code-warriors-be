import { Server, Socket } from "socket.io";
import matchModel, { IMatch } from "../model/match.model";
import problemModel from "../model/problem.model";
import runCode from "../utils/runCode";
import testcaseModel from "../model/testcase.model";
import submissionModel, { ISubmission } from "../model/submission.model";
import mongoose from "mongoose";
import userModel from "../model/user.model";

const matches = new Map<string, NodeJS.Timeout>();

function statusMatch(socket:Socket,io:Server) {
    socket.on("accept_match",async(data)=>{ 
        const userId = socket.user._id
        const {matchId,roomId} = data
        const match = await matchModel.findById(matchId)
        if(match === null){
            socket.send({sucess:false,message:"Dont find the match"})
            return
        }
        if(match.player1 === null){
            match.player1 = userId
        }
        else{
            const endTime = new Date(Date.now() + 10 * 60 * 1000)
            match.player2 = userId
            match.endedAt = endTime
            console.log("debug1");
            
            io.to(roomId).emit("start_match",{
                matchId,
                roomId,
                success:true,
                endTime:endTime
            })
            console.log("debug2");

            const timer = setTimeout(() => {
                io.to(matchId).emit("match_ended", { matchId });
                matches.delete(matchId);
            }, 600000);
            matches.set(matchId, timer);
        }
        await match.save()

    })
    socket.on("cancelMatch", (matchId) => {
        if (matches.has(matchId)) {
            clearTimeout(matches.get(matchId));
            matches.delete(matchId);
        }
    });
    socket.on("reject_match",async(data)=>{
        const userId = socket.user._id
        const { matchId,roomId} = data
        const isDeleted = await matchModel.deleteOne({_id:matchId}) 
        if(isDeleted.deletedCount>0 && isDeleted.acknowledged){
            io.to(roomId).emit("reject_match",{
                success:true,
                userId, matchId,roomId
            })
        }
    })

    socket.on("submit_match",async(data)=>{
        try {
            const {matchId,languageId, sourceCode} = data
        const match = await matchModel.findById(matchId)
        if(!match)
            return
        const problemId = match?.problems
        const testcases = await testcaseModel.find({problem:problemId})
        const problem = await problemModel.findById(problemId)
        console.log("submission");
        
        // const evaluation = await runCode(languageId,sourceCode,testcases,problem?.timeout||3*60) 
        let evaluation = {
            point: Math.floor(Math.random() * 101), // Random từ 0 đến 100
            time: Math.random() * 10, // Random từ 0 đến 10 giây
            memory: Math.random() * 1024 // Random từ 0 đến 1024 MB
        };
        const submission = await submissionModel.create({
            user:socket.user._id,
            problem:problemId,
            code:sourceCode,
            match:matchId,
            language:languageId,
            grade:evaluation.point,
            memoryUsage:evaluation.memory,
            executionTime:evaluation.time,
            timeSubmission: Math.floor((new Date(match.endedAt || "").getTime() - Date.now()) / 1000)
        })

        console.log(match.player1.toString(),socket.user._id);
        

        if(match.player1.toString() === socket.user._id){
            match.player1Submissions = submission._id as mongoose.Types.ObjectId
        }
        if(match.player2.toString() === socket.user._id){
            match.player2Submissions = submission._id as mongoose.Types.ObjectId
        }
        if(match.player2Submissions && match.player1Submissions){
            const submissions = await submissionModel.find({match:matchId}).sort({ grade: -1, executionTime: 1, memoryUsage: 1,timeSubmission:1 });
            let winner = submissions[0].user
            match.winner = winner
            await userModel.updateOne({_id:winner},{$inc:{elo:100}})
            const loser = await userModel.findById(submissions[1].user)
            if(loser){
                if(loser?.elo>100){
                    loser.elo = loser.elo - 100
                }
                else{
                    loser.elo = 0
                }
                await loser.save()
            }
            // if (matches.has(matchId)) {
            //     clearTimeout(matches.get(matchId));
            //     matches.delete(matchId);
            // }
            // io.to(matchId).emit("result_match",{
            //     winner: "winner",
            //     result:submissions
            // })
            io.to(matchId).emit("finish_match",{
                matchId:matchId
            })
        }
        else{
            console.log("competitor_submission");
            
            socket.to(matchId).emit("competitor_submission",submission)
        }
        await match.save()
        } catch (error) {
            console.log(error);
            
        }
        finally{
        }
    })
}


export default statusMatch;