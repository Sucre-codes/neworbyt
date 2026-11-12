import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth.service";
import { AppError } from "../utils/AppError";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError("Please log in", 401);
  req.userId = verifyToken(header.slice(7));
  next();
}