import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/user.model";
import { AppError } from "../utils/AppError";
import { encrypt } from "./crypto.service";
import { Keypair } from "@stellar/stellar-sdk";
import {
  addUsdcTrustline,
  createFundedAccount,
} from "./stellar.service";


export function toPublic(user: InstanceType<typeof User>, usdcBalance: string) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    publicKey: user.publicKey,
    usdcBalance,
  };
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload === "string" || !payload.sub) throw new Error("bad token");
    return String(payload.sub);
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }
}

export async function login(identifier: string, password: string) {
  const id = identifier.trim();
  const user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { phone: id }] });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) throw new AppError("Wrong phone or password", 401);
  if (user.blacklisted) throw new AppError("This account is blocked", 403);
  return { token: signToken(user.id) };
}

export async function signUp(input: { name: string; email: string; phone: string; password: string }) {
  const existing = await User.findOne({ $or: [{ email: input.email }, { phone: input.phone }] });
  if (existing) throw new AppError("This email or phone number is already registered", 409);

  const passwordHash = await hashPassword(input.password);

  const keypair = Keypair.random();
  await createFundedAccount(keypair.publicKey(), "20");
  await addUsdcTrustline(keypair.secret());

  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash,
    publicKey: keypair.publicKey(),
    encryptedSecret: encrypt(keypair.secret()),
  });
  return { token: signToken(user.id), user: toPublic(user, "0") };
}