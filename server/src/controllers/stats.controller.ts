import type { Request, Response } from "express";
import { getStats } from "../services/stats.service";

export async function stats(_req: Request, res: Response) {
  res.json(await getStats());
}