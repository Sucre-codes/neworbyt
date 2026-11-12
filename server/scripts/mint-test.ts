import { Keypair } from "@stellar/stellar-sdk";
import { env } from "../src/config/env";
import { addUsdcTrustline, mintUsdc } from "../src/services/stellar.service";

const treasury = Keypair.fromSecret(env.treasurySecret);
await addUsdcTrustline(env.treasurySecret);
await mintUsdc(treasury.publicKey(), "1000");
console.log("Treasury now holds 1000 test USDC");