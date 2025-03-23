import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import RankModel from "../model/rank.model";
import { httpCode } from "../utils/httpCode";
import { AppError } from "../utils/AppError";
import sendResponse from "../utils/response";

class RankController {
    createRanks = expressAsyncHandler(async (req: Request, res: Response) => {
        const defaultRanks = [
            { name: "Bronze", minElo: 0, maxElo: 999, badge: "bronze.png" },
            { name: "Silver", minElo: 1000, maxElo: 1999, badge: "silver.png" },
            { name: "Gold", minElo: 2000, maxElo: 2999, badge: "gold.png" },
            { name: "Platinum", minElo: 3000, maxElo: 3999, badge: "platinum.png" },
        ];

        const existingRanks = await RankModel.find({});
        if (existingRanks.length > 0) {
            return sendResponse(res, "success", "Ranks already exist", httpCode.OK, { ranks: existingRanks });
        }

        await RankModel.insertMany(defaultRanks);
        sendResponse(res, "success", "Ranks created successfully!", httpCode.OK, { ranks: defaultRanks });
    });

    viewAllRanks = expressAsyncHandler(async (req: Request, res: Response) => {
        const ranks = await RankModel.find({}).sort({ minElo: 1 });

        if (!ranks || ranks.length === 0) {
            throw new AppError("No ranks found", httpCode.NOT_FOUND, "error");
        }

        sendResponse(res, "success", "Ranks retrieved successfully", httpCode.OK, { ranks });
    });

    viewRankDetail = expressAsyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const rank = await RankModel.findById(id);

        if (!rank) {
            throw new AppError("Rank not found", httpCode.NOT_FOUND, "error");
        }

        sendResponse(res, "success", "Rank details retrieved", httpCode.OK, { rank });
    });
}

export default new RankController();
