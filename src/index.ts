import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import { PORT, TOKEN_KEY } from "./utils/secret";
import cors from "cors";
import path from "path";
import logger from "./utils/logger";
import connectDB from "./database";
import router from "./routes/index.routes";
import errorHandler from "./utils/errorHandler";
import http from "http";
import { Server } from "socket.io";
import socketApp from "./socket";
// import { createRanks } from './controller/rank.controller'
import { Socket } from "dgram";
import { ObjectId } from "mongoose";
import { AppError } from "./utils/AppError";
import { httpCode } from "./utils/httpCode";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import connection from "./database/database";
import problemModel from "./model/problem.model";

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

declare module "socket.io" {
  interface Socket {
    user?: any;
  }
}

socketApp(io);

app.use(morgan("dev"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
// routes

type User = {
  _id: string;
  username: string;
  role: string;
  exp?: number;
  iat?: number;
};

// Mở rộng interface của Socket

let index = 0;

declare global {
  namespace Express {
    interface Request {
      io?: Server;
    }
  }
}

app.use((req: Request, res: Response, next: NextFunction) => {
  req.io = io;
  next();
});

io.use((socket, next) => {
  let cookies: string[] = socket.request.headers.cookie?.split(";") as string[];
  if (!cookies) {
    throw new AppError("Unauthentication", httpCode.UNAUTHORIZED, "error");
  }
  const cookie = cookies.filter((item) => item.split("=")[0].includes("token"));
  const token = cookie[0].split("=")[1];
  const decoded = jwt.verify(token, TOKEN_KEY);
  console.log("hah");
  if (!decoded) {
    throw new AppError("token was expired", httpCode.UNAUTHORIZED, "error");
  }
  console.log(decoded);

  socket.user = decoded;
  index++;
  if (socket.user) next();
});


connectDB();
// (async () => {
//   try {
//     await connection();
//     app.listen(PORT, () => {
//       console.log(`http://localhost:${PORT}`);
//     });
//   } catch (error) {
//     console.log(">>> Error connect to DB: ", error);
//   }
// })();
router(app);

app.use(errorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`HTTP ${req.method} ${req.url}`);
  next();
});
server.listen(PORT, () => {
  console.log("listening on port: ", PORT);
  logger.info("listening on port: " + PORT);
});
