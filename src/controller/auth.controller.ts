import { Request, Response } from "express";
import { UserModel } from "../models/auth.model";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const Register = async (req: Request, res: Response) => {
    try {
        const { name, email, phone, password } = req.body;

        if ( !name || !email || !phone || !password) {
            return res.status(400).send({
                message: "Please provide all required fields",
                success: false,
            })
        }
        const existingUser = await UserModel.findOne({email})
        if (existingUser) {
            return res.status(400).send({
                message: "User already exists",
                success: false,
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await UserModel.create({
            name,
            email,
            phone,
            password: hashedPassword,
            wallets: {
                normal: 0,
                emergency: 0,
                fixed: [],
            }
        })
        const token = jwt.sign({ id: newUser.id}, process.env.JWT_SECRET as string, { expiresIn: '7d'});
        res.status(201).send({
            message: 'User registered successfully',
            success: true,
            token,
            newUser,
        })
    } catch (error) {
        console.log("Error in register controller", error);
        res.status(500).send({ message: "Server Error" });
    }
}

export const Login = async (req:Request, res:Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).send({
                message: "Please provide all required fields",
                success: false,
            })
        }
        const existingUser = await UserModel.findOne({ email})
        if (!existingUser) {
            return res.status(404).send({
                message: "User not found",
                success: false,
            })
        }
        const comparePassword = await bcrypt.compare(password, existingUser.password)
        if (!comparePassword) {
            return res.status(400).send({
                message: "Invalid credentials",
                success: false,
            })
        }

        const token = jwt.sign({ id: existingUser.id}, process.env.JWT_SECRET as string, {
            expiresIn: '7d'
        })
        res.status(200).send({
            message: 'User logged in successfully',
            success: true,
            token,
            existingUser,
        })
    } catch (error) {
        console.log("Error in login controller", error);
        res.status(500).send({
            message: "Login failed",
            success: false,
        });
    }
}