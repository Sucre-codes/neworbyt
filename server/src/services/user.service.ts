
import { isValidObjectId } from "mongoose";
import { User } from "../models/user.model";
import { AppError } from "../utils/AppError";
import {
  getUsdcBalance,
  mintUsdc,
} from "./stellar.service";
import { Keypair } from "@stellar/stellar-sdk";
import { decrypt } from "./crypto.service";
import { toPublic } from "./auth.service";



export async function findUser(userId: string) {
  if (!isValidObjectId(userId)) throw new AppError("User not found", 404);
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function getUser(userId: string) {
  const user = await findUser(userId);
  return toPublic(user, await getUsdcBalance(user.publicKey));
}

export async function deposit(userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    throw new AppError("Invalid amount", 400);
  }
  const user = await findUser(userId);
  await mintUsdc(user.publicKey, amount.toFixed(2));
  return toPublic(user, await getUsdcBalance(user.publicKey));
}

export async function getUserKeypair(userId: string) {
  const user = await findUser(userId);
  return Keypair.fromSecret(decrypt(user.encryptedSecret));
}