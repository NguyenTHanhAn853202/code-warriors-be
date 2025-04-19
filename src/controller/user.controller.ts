import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import sendResponse from "../utils/response";
import { httpCode } from "../utils/httpCode";
import { AppError } from "../utils/AppError";
import userModel, { IUser } from "../model/user.model";
import problemModel from "../model/problem.model";
import testcaseModel from "../model/testcase.model";
import { registerService, loginService } from "../service/user.service";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { EMAIL_USER, EMAIL_PASS,TOKEN_KEY } from '../utils/secret';
import crypto from "crypto";

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
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
    if (!passwordRegex.test(password)) {
        throw new AppError(
            "Password must be at least 6 characters long and contain at least one letter and one number",
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

export const changePassword = expressAsyncHandler(async (req: Request, res: Response) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new AppError("Vui lòng điền đầy đủ thông tin", httpCode.BAD_REQUEST, "error");
  }

  if (newPassword !== confirmPassword) {
    throw new AppError("Mật khẩu mới không khớp", httpCode.BAD_REQUEST, "error");
  }

  // Kiểm tra định dạng mật khẩu mới (ít nhất 6 ký tự, chứa chữ và số)
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new AppError(
      "Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ và số",
      httpCode.BAD_REQUEST,
      "error"
    );
  }

  console.log("User from auth middleware:", req.user);
  const user = await userModel.findById(req.user._id);
  
  if (!user) {
    throw new AppError("Người dùng không tồn tại", httpCode.NOT_FOUND, "error");
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw new AppError("Mật khẩu cũ không chính xác", httpCode.UNAUTHORIZED, "error");
  }

  user.password = newPassword;
  await user.save();

  sendResponse(res, "success", "Đổi mật khẩu thành công", httpCode.OK);
});

export const forgotPassword = expressAsyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      throw new AppError("Email không tồn tại", httpCode.NOT_FOUND, "error");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const resetLink = `http://localhost:3000/account/password/${token}/reset`;

    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await user.save();

    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: {
            name: "CodeWars",
            address: EMAIL_USER
        },
        to: user.email,
        subject: "Reset your password CodeWars",
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
              body {
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f3f4f6;
                color: #374151;
                line-height: 1.5;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .card {
                background-color: #ffffff;
                border-radius: 0.5rem;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                overflow: hidden;
              }
              .header {
                background-color: #4f46e5;
                padding: 1.5rem;
                text-align: center;
              }
              .header-text {
                color: #ffffff;
                font-size: 1.5rem;
                font-weight: 600;
                margin: 0;
              }
              .content {
                padding: 1.5rem;
              }
              .text {
                margin-bottom: 1rem;
                color: #4b5563;
              }
              .btn {
                display: inline-block;
                background-color:rgb(139, 134, 239);
                color: #ffffff;
                text-decoration: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.375rem;
                font-weight: 500;
                text-align: center;
                margin: 1rem 0;
                transition-property: background-color;
                transition-duration: 150ms;
              }
              .btn:hover {
                background-color:rgb(87, 84, 118);
              }
              .link-container {
                margin-top: 1rem;
                padding: 0.75rem;
                background-color: #f9fafb;
                border-radius: 0.375rem;
                border: 1px solid #e5e7eb;
                word-break: break-all;
              }
              .footer {
                margin-top: 1rem;
                text-align: center;
                font-size: 0.875rem;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <h1 class="header-text">Reset Your Password</h1>
                </div>
                <div class="content">
                  <p class="text">Hello,</p>
                  <p class="text">We received a request to reset your password for your CodeWars account. Please click the button below to proceed.</p>
                  
                  <a href="${resetLink}" class="btn">Reset Password</a>
                  
                  <p class="text">If you cannot click the button, please copy and paste the link below into your browser:</p>
                  
                  <div class="link-container">
                    ${resetLink}
                  </div>
                  
                  <p class="text" style="margin-top: 1.5rem; font-size: 0.875rem;">This link will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
                </div>
              </div>
              <div class="footer">
                <p>&copy; 2025 CodeWars. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
    };
      await transporter.sendMail(mailOptions);

    sendResponse(res, "success", "Link đặt lại mật khẩu đã được gửi qua email", httpCode.OK,{ token });
});

export const resetPassword = expressAsyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    throw new AppError("Thiếu thông tin", httpCode.BAD_REQUEST, "error");
  }
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
  if (!passwordRegex.test(newPassword)) {
    throw new AppError(
      "Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ và số",
      httpCode.BAD_REQUEST,
      "error"
    );
  }

  if (newPassword !== confirmPassword) {
    throw new AppError("Mật khẩu xác nhận không khớp", httpCode.BAD_REQUEST, "error");
  }

  const user = await userModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() }, // Kiểm tra token chưa hết hạn
  });
  
  if (!user) {
    throw new AppError("Token không hợp lệ hoặc đã hết hạn", httpCode.UNAUTHORIZED, "error");
  }

  // Cập nhật mật khẩu mới
  user.password = newPassword;

  // Xoá token và hạn sử dụng
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  sendResponse(res, "success", "Đặt lại mật khẩu thành công", httpCode.OK);
});
//check url token
export const validateResetToken = expressAsyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  
  if (!token) {
    throw new AppError("Token không được cung cấp", httpCode.BAD_REQUEST, "error");
  }
  
  // Check if token exists in database and is not expired
  const user = await userModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() }
  });
  
  if (!user) {
    throw new AppError("Token không hợp lệ hoặc đã hết hạn", httpCode.UNAUTHORIZED, "error");
  }
  
  sendResponse(res, "success", "Token hợp lệ", httpCode.OK);
});

export const updateProfile = expressAsyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  
  if (!userId) {
    throw new AppError("Người dùng chưa đăng nhập", httpCode.UNAUTHORIZED, "error");
  }

  const {
    gender,
    location,
    birthday,
    summary,
  } = req.body;
  if (birthday && !isValidDate(birthday)) {
    throw new AppError("Định dạng ngày sinh không hợp lệ", httpCode.BAD_REQUEST, "error");
  }

  const updateData: Partial<IUser> = {};
  
  if (gender !== undefined) updateData.gender = gender;
  if (location !== undefined) updateData.location = location;
  if (birthday !== undefined) updateData.birthday = new Date(birthday);
  if (summary !== undefined) updateData.summary = summary;

  const updatedUser = await userModel.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-password");
  
  if (!updatedUser) {
    throw new AppError("Không tìm thấy người dùng", httpCode.NOT_FOUND, "error");
  }
  
  sendResponse(res, "success", "Cập nhật thông tin thành công", httpCode.OK, updatedUser);
});

const isValidDate = (dateString: string): boolean => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return false;
  }
  const [day, month, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
         date.getMonth() === month - 1 &&
         date.getDate() === day;
};


export const getUserDetail = expressAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = id || req.user?._id || req.user?._id;

  console.log("🔍 Tìm user với ID:", userId);

  const user = await userModel.findById(userId).select("-password");

  if (!user) {
    throw new AppError("Không tìm thấy người dùng", httpCode.NOT_FOUND, "error");
  }

  sendResponse(res, "success", "Lấy thông tin người dùng thành công", httpCode.OK, user);
});

export const logout = expressAsyncHandler(async (req: Request, res: Response) => {
  res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
  });

  sendResponse(res, "success", "Logout successfully", httpCode.OK);
});
