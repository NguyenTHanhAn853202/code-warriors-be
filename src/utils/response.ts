import { Response } from "express";
import { httpCode } from "./httpCode";

export type status = "success" | "error" | "warning"

interface IResponse{
    status: status;
    message: string;
    data?: any;
}

export default function sendResponse(res:Response,status:status, message:string,httpCode:httpCode,data?:any):void {
    const response: IResponse = { status, message, data };
    res.status(httpCode).json(response)
}