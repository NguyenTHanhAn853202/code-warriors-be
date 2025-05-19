import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const dbState = [
  { value: 0, label: "Disconnected" },
  { value: 1, label: "Connected" },
  { value: 2, label: "Connecting" },
  { value: 3, label: "Disconnecting" },
] as const;

const connection = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL as string);
    const state = mongoose.connection.readyState;
    const status = dbState.find((f) => f.value === state)?.label || "Unknown";
    console.log(`${status} to database`);
  } catch (error) {
    console.error("Database connection error:", error);
  }
};

export default connection;
