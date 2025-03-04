import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";



class Problems {
    Hello = expressAsyncHandler(async(req:Request,res:Response)=>{
        res.send("Hello World")
    })
    Hello1 = expressAsyncHandler(async(req:Request,res:Response)=>{
      res.send("Hello World1")
  })
}

export default new Problems();
