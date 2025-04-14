import expressAsyncHandler from "express-async-handler";
import { NextFunction, Request, Response } from "express";
import { ObjectId } from "mongoose";


type User = {
  _id:string,
  username: string,
  role:string,
  exp?:string
}

declare module 'express-serve-static-core' {
  interface Request {
      user: User; 
  }
}

export const auth = expressAsyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
    const user = {
        _id:"67ea6414a85677ccfd64c1b1",
        username:"",
        role:''
    }
    req.user = user
    next()
})

export const authSocket = expressAsyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
  
})