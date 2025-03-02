import mongoose from "mongoose";
import logger from "../utils/logger";

export default async function connectDB(){
    try {
        await mongoose.connect("mongodb://localhost:27017/codewarior")
    } catch (error:any) {
        logger.error("Error connecting database: " + error.message)
    }
}