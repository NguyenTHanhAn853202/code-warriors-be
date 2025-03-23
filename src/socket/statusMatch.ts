import { Server, Socket } from "socket.io";
import matchModel, { IMatch } from "../model/match.model";

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
            match.player2 = userId
            io.to(roomId).emit("start_match",{
                matchId,
                roomId,
                success:true
            })
        }
        await match.save()

    })
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
}

export default statusMatch;