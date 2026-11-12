import type { Request, Response } from "express";
import * as userService from "../services/user.service";
import { AppError } from "../utils/AppError";


export async function getMe(req: Request, res: Response) {
  res.json(await userService.getUser(req.userId as string));
}

export async function deposit(req: Request, res: Response) {
  res.json(await userService.deposit(req.userId as string, Number(req.body?.amount)));
}