import { Server } from "socket.io";
import findMatch, { leaveWaiting } from "./findMatch";
import statusMatch from "./statusMatch";
import matching from "./matching";
import chatInMatch from "./chatInMatch";
import handleRoomBattle from "./room-battle.handler";

function socketApp(io: Server) {
  io.on("connection", (socket) => {
    console.log("connect to " + socket.id);
    findMatch(socket, io);
    statusMatch(socket, io);
    leaveWaiting(socket, io);
    handleRoomBattle(socket, io);
    matching(socket, io);
    chatInMatch(socket, io);
  });
}

export default socketApp;
