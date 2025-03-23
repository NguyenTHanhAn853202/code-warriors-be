import expressAsyncHandler from "express-async-handler";
import userModel from "../model/user.model";

export const registerService = async(username:string,password:string)=>{
    const user = await userModel.create({
        username:username,
        password:password
    })
    const token = user.generateToken()
    return token
}