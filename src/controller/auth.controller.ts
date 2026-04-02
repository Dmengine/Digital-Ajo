import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model";
import { env } from "../config/env";
import { HttpError } from "../errors/HttpError";
import { asyncHandler } from "../middleware/asyncHandler";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, password, username } = req.body as {
    name: string;
    email: string;
    phone: string;
    password: string;
    username: string;
  };

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) throw new HttpError(400, "User already exists");

  const existingUsername = await UserModel.findOne({ username });
  if (existingUsername) throw new HttpError(400, "Username already taken");

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await UserModel.create({
    name,
    email,
    phone,
    username,
    password: hashedPassword,
    wallets: { main: 0, locked: [] },
  });

  const token = jwt.sign({ id: newUser.id }, env.jwtSecret(), { expiresIn: "7d" });
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    token,
    user: newUser.toJSON(),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { emailOrUsername, password } = req.body as { emailOrUsername: string; password: string };

  const existingUser = await UserModel.findOne({
    $or: [{ email: emailOrUsername.toLowerCase() }, { username: emailOrUsername.toLowerCase() }],
  }).select("+password");

  if (!existingUser) throw new HttpError(401, "Invalid credentials");

  const comparePassword = await bcrypt.compare(password, existingUser.password);
  if (!comparePassword) throw new HttpError(401, "Invalid credentials");

  const token = jwt.sign({ id: existingUser.id }, env.jwtSecret(), { expiresIn: "7d" });

  res.status(200).json({
    success: true,
    message: "User logged in successfully",
    token,
    user: existingUser.toJSON(),
  });
});
