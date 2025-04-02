import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import sendResponse from "../utils/response";
import { httpCode } from "../utils/httpCode";
import { AppError } from "../utils/AppError";
import userModel from "../model/user.model";
import problemModel from "../model/problem.model";
import testcaseModel from "../model/testcase.model";
import { registerService, loginService } from "../service/user.service";

export const getUser = expressAsyncHandler(async (req: Request, res: Response) => {
    const user = await userModel.create({
        username: "admin",
        password: "testpass",
        role: "admin",
    });
    const data = await problemModel.create({
        title: "test problem",
        description: "test problem description",
        author: user._id,
    });

    const testcase = await testcaseModel.create({
        problem: data._id,
        input: "test input",
        expectedOutput: "test output",
    });
    sendResponse(res, "success", "get user success", httpCode.OK, { data, testcase });
});

export const register = expressAsyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, repeatPassword } = req.body;

    if (!username || !email || !password || !repeatPassword) {
        throw new AppError("Missing required fields", httpCode.BAD_REQUEST, "error");
    }

    // Kiểm tra email có đúng định dạng hay không
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        throw new AppError("Invalid email format", httpCode.BAD_REQUEST, "error");
    }

    // Kiểm tra mật khẩu có đủ mạnh hay không
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[A-Z]).{6,}$/;
    if (!passwordRegex.test(password)) {
        throw new AppError(
            "Password must be at least 6 characters long and contain at least one letter, one number, and one uppercase letter",
            httpCode.BAD_REQUEST,
            "error"
        );
    }

    if (password !== repeatPassword) {
        throw new AppError("Passwords do not match", httpCode.BAD_REQUEST, "error");
    }

    // Gọi service đăng ký và tạo token
    const token = await registerService(username, email, password);
    if (!token) {
        throw new AppError("Failed to generate token", httpCode.INTERNAL_SERVER_ERROR, "error");
    }

    // Set cookie chứa token
    res.cookie("token", token, {
        secure: true,
        httpOnly: true,
    });

    sendResponse(res, "success", "Register successfully", httpCode.OK);
});

export const login = expressAsyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new AppError("Missing required fields", httpCode.BAD_REQUEST, "error");
    }

    const token = await loginService(email, password);
    if (!token) {
        throw new AppError("Invalid username or password", httpCode.UNAUTHORIZED, "error");
    }
    res.cookie("token", token, { secure: true, httpOnly: true });
    sendResponse(res, "success", "Login successfully", httpCode.OK);
});