import type { Request, Response } from "express";
import * as circleService from "../services/circle.service";
import { AppError } from "../utils/AppError";

const uid = (req: Request) => req.userId as string;
const cid = (req: Request) => String(req.params.id);

export async function createCircle(req: Request, res: Response) {
  const b = req.body ?? {};
  const joinDeadline = new Date(b.joinDeadline);
  if (!b.name || Number.isNaN(joinDeadline.getTime())) {
    throw new AppError("name and a valid joinDeadline are required", 400);
  }
  const result = await circleService.createCircle(uid(req), {
    name: String(b.name),
    amount: Number(b.amount),
    deposit: Number(b.deposit ?? 0),
    maxMembers: Number(b.maxMembers),
    joinDeadline,
    contributionInterval: Number(b.contributionInterval),
    contributionsPerPayout: Number(b.contributionsPerPayout),
  });
  res.status(201).json(result);
}

export async function joinCircle(req: Request, res: Response) {
  if (!req.body?.code) throw new AppError("code is required", 400);
  res.json(await circleService.joinCircle(uid(req), String(req.body.code)));
}

export async function listCircles(req: Request, res: Response) {
  res.json(await circleService.listMyCircles(uid(req)));
}

export async function getCircle(req: Request, res: Response) {
  res.json(await circleService.getCircle(uid(req), cid(req)));
}

export async function suggestOrder(req: Request, res: Response) {
  res.json(await circleService.suggestOrder(uid(req), cid(req)));
}

export async function startCircle(req: Request, res: Response) {
  const order = Array.isArray(req.body?.order) ? req.body.order.map(String) : undefined;
  res.json(await circleService.startCircle(uid(req), cid(req), order));
}

export async function contribute(req: Request, res: Response) {
  res.json(await circleService.contribute(uid(req), cid(req)));
}

export async function settle(req: Request, res: Response) {
  res.json(await circleService.settle(uid(req), cid(req)));
}

export async function claimDeposit(req: Request, res: Response) {
  res.json(await circleService.claimDeposit(uid(req), cid(req)));
}

export async function getActivity(req: Request, res: Response) {
  res.json(await circleService.getActivity(uid(req), cid(req)));
}