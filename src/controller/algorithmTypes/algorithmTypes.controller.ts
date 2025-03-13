import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import algorithmType from "../../model/algorithmType";

interface AlgorithmTypeInput {
  name: string;
}
class algorithmTypes {
  createalgorithmTypes = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const data: AlgorithmTypeInput[] = req.body;

      if (!Array.isArray(data)) {
        res.status(400).json({
          status: "error",
          message: "Request must be an array of algorithm types",
        });
      }

      const existingAlgorithms = await algorithmType.find({
        name: { $in: data.map((item: AlgorithmTypeInput) => item.name) },
      });
      const existingNames = existingAlgorithms.map((algo) => algo.name);

      const newAlgorithms = data.filter(
        (item: AlgorithmTypeInput) => !existingNames.includes(item.name)
      );

      if (newAlgorithms.length === 0) {
        res.status(400).json({ message: "All algorithm types already exist" });
      }

      const createdAlgorithms = await algorithmType.insertMany(newAlgorithms);

      res.status(201).json({ status: "success", data: createdAlgorithms });
    }
  );
  viewalgorithmTypes = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const data = await algorithmType.find();
      res.status(200).json({ status: "success", data: data });
    }
  );
}
export default new algorithmTypes();
