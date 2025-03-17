import { Server } from "socket.io";
import findMatch from "./findMatch";
import statusMatch from "./statusMatch";

function socketApp(io:Server) {
    io.on("connection",(socket)=>{
        console.log("connect to " + socket.id);
        findMatch(socket,io)
        statusMatch(socket,io)
    })
   
}

export default socketApp;