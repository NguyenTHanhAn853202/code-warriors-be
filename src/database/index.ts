import mongoose from "mongoose";
import logger from "../utils/logger";
import { URL_DATABASE } from "../utils/secret";

export default async function connectDB(){
    try {
        await mongoose.connect(URL_DATABASE)
        console.log("Connect Database Success ✅");       
    } catch (error:any) {
        logger.error("Error connecting database: " + error.message)
    }
}