import { Server, Socket } from "socket.io";
import { SocketId } from "socket.io-adapter";
import {v4 as uuidv4} from "uuid"
import matchModel from "../model/match.model";

type TwaitingUsers = {
    socket:Socket,
    rank:number
}

const rankDifferent = 200

let waitingUsers:TwaitingUsers[] = []

function findMatch(socket:Socket,io:Server) {
   socket.on("find_match",async(data)=>{
        if(waitingUsers.length>0){
            let indexCompetitor = -1
            const rank = data.rank ?? 0
            for(let index=0;index<waitingUsers.length;index++){
                const item = waitingUsers[index]
                const diff = Math.abs(rank-item.rank)
                if(rankDifferent>diff){
                    indexCompetitor = index
                    break                
                }
            }
            if(indexCompetitor !== -1){
                const competitor = waitingUsers.splice(indexCompetitor,1)[0]
                const roomId = uuidv4()
                const match = await matchModel.create({})
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
                    rank:data.rank
                }
            )
        }
   })
}

export default findMatch;