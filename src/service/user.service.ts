import userModel from "../model/user.model";
import { AppError } from "../utils/AppError";
import { httpCode } from "../utils/httpCode";

export const registerService = async (username: string, password: string) => {
    const existingUser = await userModel.findOne({ username });
    if (existingUser) {
        throw new AppError("User already exists", httpCode.BAD_REQUEST, "error");
    }

    const user = await userModel.create({
        username: username,
        password: password,
    });
    const token = user.generateToken();
    return token;
};

export const loginService = async (username: string, password: string) => {
    const user = await userModel.findOne({ username });
    if (!user) {
        throw new AppError("User does not exist", httpCode.BAD_REQUEST, "error");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new AppError("Incorrect password", httpCode.BAD_REQUEST, "error");
    }

    return user.generateToken();
};
