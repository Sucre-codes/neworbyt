import type { Request, Response } from "express";
import { getHealth } from "../services/health.service";

export function healthCheck(_req: Request, res: Response) {
  res.json(getHealth());
}