import { Server } from "socket.io";
import findMatch, { leaveWaiting } from "./findMatch";
import statusMatch from "./statusMatch";
import roomBattle from "./roomSocket";

function socketApp(io: Server) {
  io.on("connection", (socket) => {
    console.log("connect to " + socket.id);
    findMatch(socket, io);
    statusMatch(socket, io);
    leaveWaiting(socket, io);
    roomBattle(socket, io);
  });
}

export default socketApp;
