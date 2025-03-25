import { Server } from "socket.io";
import findMatch, { leaveWaiting } from "./findMatch";
import statusMatch from "./statusMatch";
import matching from "./matching";

function socketApp(io:Server) {
    io.on("connection",(socket)=>{
        console.log("connect to " + socket.id);
        findMatch(socket,io)
        statusMatch(socket,io)
        leaveWaiting(socket,io)
        matching(socket,io)
    })
   
}

export default socketApp;