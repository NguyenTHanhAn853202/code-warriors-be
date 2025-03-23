import { Server, Socket } from "socket.io";
import { SocketId } from "socket.io-adapter";
import {v4 as uuidv4} from "uuid"
import matchModel from "../model/match.model";
import getRankId from "../service/rank";
import rankModel from "../model/rank.model";
import userModel from "../model/user.model";
import { ObjectId } from "mongoose";
import problemModel from "../model/problem.model";

type TwaitingUsers = {
    socket:Socket,
    rank:number,
    userId:string | undefined
}

const rankDifferent = 1999

let waitingUsers:TwaitingUsers[] = []

function findMatch(socket:Socket,io:Server) {
   socket.on("find_match",async(data)=>{ 
      try{
        console.log(waitingUsers);
        
        const userId = socket.user?._id
        const rank = (await userModel.findById(userId))?.elo || 0
        
         if(waitingUsers.length>0){
             let indexCompetitor = -1
             for(let index=0;index<waitingUsers.length;index++){
                 const item = waitingUsers[index]
                 const diff = Math.abs(rank-item.rank)                
                 if(rankDifferent>diff && userId !== item.userId && userId){
                     indexCompetitor = index
                     break                
                 }
             }
             if(indexCompetitor !== -1){
                const rankId = await getRankId([rank,waitingUsers[indexCompetitor].rank].sort()[0])
                const problems = await problemModel.find({difficulty:rankId})
                const problem = problems[Math.floor(Math.random()*problems.length)]
                if(!problem){  
                    waitingUsers.push(
                        {
                            socket:socket,
                            rank:data.rank,
                            userId: userId 
                        }
                    )
                    return
                }
                 const competitor = waitingUsers.splice(indexCompetitor,1)[0]
                 const roomId = uuidv4()
                 const match = await matchModel.create({problems:problem._id})
                 
                 socket.join(roomId)
                 competitor.socket.join(roomId)
                 io.to(roomId).emit("found_competitor",{
                     roomId,
                     matchId:match._id
                 })
                
             }
         }
         else{
            
             waitingUsers.push(
                 {
                     socket:socket,
                     rank:rank,
                     userId: userId 
                 }
             )
         }
      }
      catch(e){
        console.log(e);
        
      }
   })
}

export const leaveWaiting = async(socket:Socket,io:Server)=>{
   socket.on("leave_waiting",()=>{
    try {

        const userId = socket.user?._id
        console.log(userId);
        waitingUsers = waitingUsers.filter((item)=>item.userId!==userId)
        console.log("leave succssefully");
        console.log(waitingUsers);
    } catch (error) {
        console.log(error);
    }
   })
}

export default findMatch;