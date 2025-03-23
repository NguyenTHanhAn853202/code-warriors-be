import { Server } from "socket.io";
import findMatch from "./findMatch";
import statusMatch from "./statusMatch";
import roomBattle from "./roomSocket";

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
}

export default socketApp;
