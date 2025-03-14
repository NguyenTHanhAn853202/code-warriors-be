import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import bodyParser from "body-parser";
import { PORT } from "./utils/secret";
import cors from "cors";
import path from "path";
import logger from "./utils/logger";
import connectDB from "./database";
import router from "./routes/index.routes";
import errorHandler from "./utils/errorHandler";

const app = express();

app.use(morgan("dev"));

app.use(cors());

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// routes
router(app);

// connectDB
connectDB();

app.use(errorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`HTTP ${req.method} ${req.url}`);
    next();
});

app.listen(PORT, () => {
    console.log("listening on port: ", PORT);
    logger.info("listening on port: " + PORT);
});
