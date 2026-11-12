import { Keypair } from "@stellar/stellar-sdk";
import { Client, basicNodeSigner } from "@stellar/stellar-sdk/contract";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { withRetry } from "../utils/retry";

const UNITS = 10_000_000;

export const toBaseUnits = (amount: number): bigint => BigInt(Math.round(amount * UNITS));
export const fromBaseUnits = (units: bigint | number | string): number => Number(units) / UNITS;

const CONTRACT_ERRORS: Record<number, string> = {
  1: "This circle is already set up",
  2: "Invalid circle settings",
  3: "Circle not found on-chain",
  4: "This circle is not open for joining",
  5: "The joining deadline has passed",
  6: "This circle is full",
  7: "You are already a member",
  8: "Not enough members to start",
  9: "Invalid payout order",
  10: "Too early to start",
  11: "This circle has not started",
  12: "You are not a member",
  13: "You have already paid this cycle",
  14: "This cycle is not complete yet",
  15: "The circle is not finished yet",
  16: "Nothing to claim",
  17: "This cycle has ended",
  18: "Not due yet",
};

function toAppError(err: unknown): AppError {
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/Error\(Contract, #(\d+)\)/);
  if (match && CONTRACT_ERRORS[Number(match[1])]) {
    return new AppError(CONTRACT_ERRORS[Number(match[1])], 400);
  }
  console.error(err);
  return new AppError("The blockchain rejected this action", 400);
}

function options(keypair: Keypair) {
  const { signTransaction } = basicNodeSigner(keypair, env.networkPassphrase);
  return {
    networkPassphrase: env.networkPassphrase,
    rpcUrl: env.rpcUrl,
    publicKey: keypair.publicKey(),
    signTransaction,
  };
}

function unwrap(result: any) {
  return result && typeof result.isOk === "function" ? result.unwrap() : result;
}

export async function deployCircleContract(): Promise<string> {
  try {
    return await withRetry(async () => {
      const treasury = Keypair.fromSecret(env.treasurySecret);
      const deployTx = await Client.deploy(null, {
        ...options(treasury),
        wasmHash: env.wasmHash,
      });
      const { result: client } = await deployTx.signAndSend();
      return client.options.contractId;
    });
  } catch (err) {
    throw toAppError(err);
  }
}

export async function writeContract(
  contractId: string,
  signer: Keypair,
  method: string,
  args: Record<string, unknown> = {}
) {
  try {
    return await withRetry(async () => {
      const client: any = await Client.from({ ...options(signer), contractId });
      const tx = await client[method](args);
      const sent = await tx.signAndSend();
      return unwrap(sent.result);
    });
  } catch (err) {
    throw toAppError(err);
  }
}

export async function readContract(
  contractId: string,
  method: string,
  args: Record<string, unknown> = {}
) {
  try {
    return await withRetry(async () => {
      const reader = Keypair.fromSecret(env.treasurySecret);
      const client: any = await Client.from({ ...options(reader), contractId });
      const tx = await client[method](args);
      return unwrap(tx.result);
    });
  } catch (err) {
    throw toAppError(err);
  }
}