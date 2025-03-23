import express, { NextFunction, Request, Response } from 'express'
import morgan from 'morgan'
import bodyParser from 'body-parser'
import { PORT, TOKEN_KEY } from './utils/secret'
import cors from 'cors'
import path from 'path'
import logger from './utils/logger'
import connectDB from './database'
import router from './routes/index.routes'
import errorHandler from './utils/errorHandler'
import http from 'http';
import { Server } from 'socket.io';
import socketApp from './socket'
// import { createRanks } from './controller/rank.controller'
import { Socket } from 'dgram'
import { ObjectId } from 'mongoose'
import { AppError } from './utils/AppError'
import { httpCode } from './utils/httpCode'
import jwt from "jsonwebtoken";



const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: true,
  },
});

socketApp(io);

app.locals.io = io;

app.use(morgan("dev"));

app.use(cors());

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// routes
router(app);

type User = {
  _id: string;
  username: string;
  role: string;
  exp?: number;
  iat?:number
};

// Mở rộng interface của Socket
declare module "socket.io" {
  interface Socket {
    user?: any;
  }
}

let index = 0

io.use((socket,next)=>{
  let cookies:string[] = socket.request.headers.cookie?.split(";") as string[]
  if(!cookies){
    throw new AppError("Unauthentication",httpCode.UNAUTHORIZED,"error")
  }
  const cookie = cookies.filter((item)=> item.split("=")[0].includes('token'))
  const token = cookie[0].split("=")[1]
  const decoded = jwt.verify(token,TOKEN_KEY)
  if(!decoded){
    throw new AppError("token was expired",httpCode.UNAUTHORIZED,"error")
  }
  console.log(decoded);
  
  socket.user = decoded
  index++
  if(socket.user)
    next()
})
// createRanks()

// connectDB
connectDB();

app.use(errorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`HTTP ${req.method} ${req.url}`);
  next();
});

server.listen(PORT, () => {
  console.log("listening on port: ", PORT);
  logger.info("listening on port: " + PORT);
});
