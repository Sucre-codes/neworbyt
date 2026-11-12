import "dotenv/config";
import { Networks } from "@stellar/stellar-sdk";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing in .env`);
  return value;
}

export const env = {
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: Networks.TESTNET,
  rpcUrl: "https://soroban-testnet.stellar.org",
  wasmHash: required("WASM_HASH"),
  treasurySecret: required("TREASURY_SECRET"),
  usdcIssuerPublic: required("USDC_ISSUER_PUBLIC"),
  usdcIssuerSecret: required("USDC_ISSUER_SECRET"),
  usdcContractId: required("USDC_CONTRACT_ID"),
  encryptionKey: required("ENCRYPTION_KEY"),
  jwtSecret: required("JWT_SECRET"),
};