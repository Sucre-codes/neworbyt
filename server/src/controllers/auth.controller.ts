import type { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { AppError } from "../utils/AppError";

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body ?? {};
  if (!identifier || !password) throw new AppError("Enter your email or phone and your password", 400);
  res.json(await authService.login(String(identifier), String(password)));
}

export async function signUp(req: Request, res: Response) {
  const { name, email, phone, password } = req.body ?? {};
  const cleanEmail = String(email ?? "").trim().toLowerCase();
  const cleanPhone = String(phone ?? "").replace(/\s+/g, "");
  if (String(name ?? "").trim().length < 2) throw new AppError("Please enter your full name", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) throw new AppError("Enter a valid email address", 400);
  if (!/^0\d{10}$/.test(cleanPhone)) throw new AppError("Enter an 11-digit Nigerian phone number, like 08012345678", 400);
  if (typeof password !== "string" || password.length < 8) throw new AppError("Password must be at least 8 characters", 400);
  res.status(201).json(
    await authService.signUp({ name: String(name).trim(), email: cleanEmail, phone: cleanPhone, password })
  );
}

