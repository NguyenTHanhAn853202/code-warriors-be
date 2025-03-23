import { ObjectId } from "mongoose";
import rankModel from "../model/rank.model";

async function getRankId(elo:number):Promise<ObjectId | null> {
    const rank = await rankModel.findOne({
        minElo:{
            $lte:elo,
        },
        maxElo:{
            $gte:elo
        }
    })
    if(!rank) return null
    return rank?._id as ObjectId
}

export default getRankId;