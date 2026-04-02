import mongoose from "mongoose";
import { env } from "../config/env";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri());
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
};
