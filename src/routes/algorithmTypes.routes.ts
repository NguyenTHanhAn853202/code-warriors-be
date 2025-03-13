import { Router } from "express";
import algorithmTypesController from "../controller/algorithmTypes/algorithmTypes.controller";

const router = Router();

router.get("/viewalgorithmTypes", algorithmTypesController.viewalgorithmTypes);
router.post("/createalgorithmTypes", algorithmTypesController.createalgorithmTypes);

export default router;
