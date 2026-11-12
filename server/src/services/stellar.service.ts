import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { env } from "../config/env";
import {withRetry} from "../utils/retry";

export const horizon = new Horizon.Server(env.horizonUrl);
export const usdc = new Asset("USDC", env.usdcIssuerPublic);

async function submit(signer: Keypair, operation: xdr.Operation) {
   const account = await withRetry(() => horizon.loadAccount(signer.publicKey()));
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: env.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
    tx.sign(signer);
  return withRetry(() => horizon.submitTransaction(tx));
}

export function addUsdcTrustline(secret: string) {
  return submit(
    Keypair.fromSecret(secret),
    Operation.changeTrust({ asset: usdc })
  );
}

export function mintUsdc(destination: string, amount: string) {
  return submit(
    Keypair.fromSecret(env.usdcIssuerSecret),
    Operation.payment({ destination, asset: usdc, amount })
  );
}

export function createFundedAccount(destination: string, startingBalance: string) {
  return submit(
    Keypair.fromSecret(env.treasurySecret),
    Operation.createAccount({ destination, startingBalance })
  );
}

export async function getUsdcBalance(publicKey: string): Promise<string> {
    const account = await withRetry(() => horizon.loadAccount(publicKey));
  const line = account.balances.find(
    (b) => "asset_code" in b && b.asset_code === "USDC" && b.asset_issuer === env.usdcIssuerPublic
  );
  return line ? line.balance : "0";
}