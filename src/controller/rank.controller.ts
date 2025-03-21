import RankModel from "../model/rank.model";

export const createRanks = async () => {
    const defaultRanks = [
        { name: "Bronze", minElo: 0, maxElo: 999, badge: "bronze.png" },
        { name: "Silver", minElo: 1000, maxElo: 1999, badge: "silver.png" },
        { name: "Gold", minElo: 2000, maxElo: 2999, badge: "gold.png" },
        { name: "Platinum", minElo: 3000, maxElo: 3999, badge: "platinum.png" },
    ];

    try {
        const existingRanks = await RankModel.find({});
        if (existingRanks.length > 0) {
            console.log("✅ Ranks already exist.");
            return;
        }

        await RankModel.insertMany(defaultRanks);
        console.log("✅ Ranks created successfully!");
    } catch (error) {
        console.error("❌ Error creating ranks:", error);
    }
};
