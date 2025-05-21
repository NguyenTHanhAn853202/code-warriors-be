import userModel from "../model/user.model";
import { AppError } from "../utils/AppError";
import { httpCode } from "../utils/httpCode";

export const registerService = async (
  username: string,
  email: string,
  password: string
) => {
  const existingUsername = await userModel.findOne({ username });
  if (existingUsername) {
    throw new AppError("User already exists", httpCode.BAD_REQUEST, "error");
  }
  const existingemail = await userModel.findOne({ email });
  if (existingemail) {
    throw new AppError("Email already exists", httpCode.BAD_REQUEST, "error");
  }

  const user = await userModel.create({
    username: username,
    email: email,
    password: password,
  });
  const token = user.generateToken();
  return token;
};

export const loginService = async (email: string, password: string) => {
  const user = await userModel.findOne({ email });
  if (!user) {
    throw new AppError("User does not exist", httpCode.BAD_REQUEST, "error");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError("Incorrect password", httpCode.BAD_REQUEST, "error");
  }
  const token = user.generateToken();
  const { _id, username, avtImage } = user;
    if (!token) {
        throw new AppError("Token was expired", httpCode.UNAUTHORIZED, "error");
    }
  return {
    token,
    user: {
      userId: _id,
      username,
      avtImage,
    },
  };
};
