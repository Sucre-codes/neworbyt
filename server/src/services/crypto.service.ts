import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { env } from "../config/env";

const key = Buffer.from(env.encryptionKey, "hex");

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((b) => b.toString("hex")).join(":");
}

export function decrypt(payload: string): string {
  const [iv, tag, data] = payload.split(":").map((h) => Buffer.from(h, "hex"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hashNin(nin: string): string {
  return createHmac("sha256", key).update(nin).digest("hex");
}