import { NextFunction, Request, Response } from "express";
import { AppError } from "./AppError";
import sendResponse from "./response";
import { httpCode } from "./httpCode";

function errorHandler(err:Error,req:Request,res:Response,next:NextFunction):void {
    if( err instanceof AppError){
        return sendResponse(res,err.status,err.message,err.statusCode,err.data)
    }
    sendResponse(res,"error",err.message,httpCode.INTERNAL_SERVER_ERROR)
}

export default errorHandler;