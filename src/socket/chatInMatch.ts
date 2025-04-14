import { Server, Socket } from "socket.io";



function chatInMatch(socket:Socket,io:Server) {
   socket.on("send_message_match",(data)=>{
    const {message,matchId} = data
    console.log(message,matchId);
    
    const username = socket.user.username
    console.log(message);
    
    socket.to(matchId).emit("receive_message_match",{
        matchId,
        message,
        username
    })
   })
}


export default chatInMatch;