import { httpCode } from "../utils/httpCode";
import sendResponse from "../utils/response";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";

const chatbot = expressAsyncHandler(async(req:Request,res:Response)=>{
    const genAI = new GoogleGenerativeAI("AIzaSyD-bHjcnrLhJ-2aQIUFYROuoG43M2fUwHk");
    const text = req.body.text
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let result = await model.generateContent([text]);
    sendResponse(res,"success",'take success', httpCode.OK,result)
})
    

export {chatbot}