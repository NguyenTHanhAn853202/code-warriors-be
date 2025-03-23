import { Server } from "socket.io";
import findMatch, { leaveWaiting } from "./findMatch";
import statusMatch from "./statusMatch";
import roomBattle from "./roomSocket";

<<<<<<< HEAD
function socketApp(io: Server) {
    
  io.on("connection", (socket) => {
    console.log("connect to " + socket.id);
    findMatch(socket, io);
    statusMatch(socket, io);
    roomBattle(socket, io);
  });

  io.on("disconection", (socket) => {
    console.log("disconnect to " + socket.id);
  });
=======
function socketApp(io:Server) {
    io.on("connection",(socket)=>{
        console.log("connect to " + socket.id);
        findMatch(socket,io)
        statusMatch(socket,io)
        leaveWaiting(socket,io)
    })
   
>>>>>>> afb9111add627eda4558de15382e26b1111bc11b
}

export default socketApp;
