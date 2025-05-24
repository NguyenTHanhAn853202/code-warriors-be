import expressAsyncHandler from "express-async-handler";
import { NextFunction, Request, Response } from "express";
import { ObjectId, Schema } from "mongoose";
import jwt from 'jsonwebtoken'
import { TOKEN_KEY } from "../utils/secret";
import { AppError } from "../utils/AppError";
import { httpCode } from "../utils/httpCode";
import userModel from "../model/user.model";


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
    const token = req.cookies["token"]
    console.log("Token:", req.cookies);
    const decoded = jwt.verify(token,TOKEN_KEY)
    //console.log("Decoded:", decoded);
    if(!decoded)
      throw new AppError("token was expired",httpCode.UNAUTHORIZED,"error")
    req.user = decoded as User
    next()
})


/*
  use after authen, admin and auth function are always go together
  example: router.post('/abc,auth,admin,callback function)
*/
export const admin = expressAsyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
  const userId = req.user._id
  const user = await userModel.findById(userId)
  if(!user)
    throw new AppError("Dont find this user",httpCode.UNAUTHORIZED,"error")
  if(user.role !== 'admin')
    throw new AppError("You are not admin",httpCode.UNAUTHORIZED,"error")
  next()
})

export const authSocket = expressAsyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
  
})