// utils/passwordUtils.ts
import bcrypt from "bcrypt";

export const hashPassword = async (
  password: string | undefined
): Promise<string | null> => {
  if (!password) return null;

  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  candidatePassword: string | undefined,
  hashedPassword: string | undefined | null
): Promise<boolean> => {
  if (!candidatePassword || !hashedPassword) return false;

  return bcrypt.compare(candidatePassword, hashedPassword);
};
