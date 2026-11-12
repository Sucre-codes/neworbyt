import { randomInt } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { env } from "../config/env";
import { Circle } from "../models/circle.model";
import { User } from "../models/user.model";
import { AppError } from "../utils/AppError";
import { listActivity, logActivity } from "./activity.service";
import {
  deployCircleContract,
  fromBaseUnits,
  readContract,
  toBaseUnits,
  writeContract,
} from "./soroban.service";
import { getUsdcBalance } from "./stellar.service";
import { findUser, getUserKeypair } from "./user.service";
import { Keypair } from "@stellar/stellar-sdk";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function makeInviteCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

async function loadCircle(circleId: string) {
  if (!isValidObjectId(circleId)) throw new AppError("Circle not found", 404);
  const circle = await Circle.findById(circleId);
  if (!circle) throw new AppError("Circle not found", 404);
  return circle;
}

type CircleDoc = Awaited<ReturnType<typeof loadCircle>>;
type UserDoc = Awaited<ReturnType<typeof findUser>>;

async function loadForMember(userId: string, circleId: string) {
  const circle = await loadCircle(circleId);
  if (!circle.members.some((m) => m.toString() === userId)) {
    throw new AppError("You are not a member of this circle", 403);
  }
  return circle;
}

function chainState(circle: CircleDoc): Promise<any> {
  return readContract(circle.contractId, "get_circle");
}

async function requireFunds(user: UserDoc, needed: number, message: string) {
  const balance = Number(await getUsdcBalance(user.publicKey));
  if (balance < needed) throw new AppError(message, 400);
}

async function nameOf(publicKey: string) {
  const user = await User.findOne({ publicKey });
  return user ? user.name : "A member";
}

async function logPayout(circle: CircleDoc, cycle: number, amount: number) {
  const order: string[] = await readContract(circle.contractId, "get_order");
  const name = await nameOf(order[cycle - 1]);
  await logActivity(circle.id, "payout", `${name} received ${amount} USDC (cycle ${cycle})`, undefined, {
    cycle,
    amount,
  });
}

export async function createCircle(
  organizerId: string,
  input: {
    name: string;
    amount: number;
    deposit: number;
    maxMembers: number;
    joinDeadline: Date;
    contributionInterval: number;
    contributionsPerPayout: number;
  }
) {
  if (input.amount <= 0 || input.deposit < 0) throw new AppError("Invalid amounts", 400);
  if (input.maxMembers < 2 || input.maxMembers > 12) {
    throw new AppError("A circle needs 2 to 12 members", 400);
  }
  if (input.contributionInterval < 10) throw new AppError("Contribution interval is too short", 400);
  if (input.contributionsPerPayout < 1 || input.contributionsPerPayout > 31) {
    throw new AppError("Contributions per payout must be between 1 and 31", 400);
  }
  if (input.joinDeadline.getTime() <= Date.now()) {
    throw new AppError("The join deadline must be in the future", 400);
  }

  const organizer = await findUser(organizerId);
  if (organizer.blacklisted) throw new AppError("Your account cannot create circles", 403);
  await requireFunds(organizer, input.deposit, "Top up your wallet to cover the deposit first");

  const signer = await getUserKeypair(organizerId);
  const contractId = await deployCircleContract();

  await writeContract(contractId, signer, "init", {
    organizer: organizer.publicKey,
    token: env.usdcContractId,
    amount: toBaseUnits(input.amount),
    deposit: toBaseUnits(input.deposit),
    max_members: input.maxMembers,
    join_deadline: BigInt(Math.floor(input.joinDeadline.getTime() / 1000)),
    contribution_interval: BigInt(input.contributionInterval),
    contributions_per_payout: input.contributionsPerPayout,
  });

  const circle = await Circle.create({
    ...input,
    contractId,
    inviteCode: makeInviteCode(),
    organizer: organizer._id,
    members: [organizer._id],
  });
  await logActivity(circle.id, "created", `${organizer.name} created ${circle.name}`, organizerId);
  return { id: circle.id, name: circle.name, inviteCode: circle.inviteCode, contractId };
}

export async function joinCircle(userId: string, code: string) {
  const circle = await Circle.findOne({ inviteCode: code.trim().toUpperCase() });
  if (!circle) throw new AppError("No circle with that code", 404);

  const user = await findUser(userId);
  if (user.blacklisted) throw new AppError("Your account cannot join circles", 403);
  if (circle.members.some((m) => m.toString() === userId)) {
    throw new AppError("You are already a member", 400);
  }
  await requireFunds(user, circle.deposit, "Top up your wallet to cover the deposit first");

  const signer = await getUserKeypair(userId);
  await writeContract(circle.contractId, signer, "join", { member: user.publicKey });

  circle.members.push(user._id);
  await circle.save();
  await logActivity(
    circle.id,
    "joined",
    `${user.name} joined (${circle.members.length}/${circle.maxMembers})`,
    userId
  );
  return { id: circle.id, name: circle.name };
}

async function orderedMembers(circle: CircleDoc, order?: string[]) {
  const users = await User.find({ _id: { $in: circle.members } });
  const byId = new Map(users.map((u) => [u.id as string, u]));
  const age = (u: UserDoc) => new Date(u.get("createdAt")).getTime();
  const ids =
    order && order.length
      ? order
      : [...users].sort((a, b) => age(a) - age(b)).map((u) => u.id as string);

  if (
    ids.length !== users.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !byId.has(id))
  ) {
    throw new AppError("The payout order must list every member exactly once", 400);
  }
  return ids.map((id) => byId.get(id)!);
}

export async function suggestOrder(userId: string, circleId: string) {
  const circle = await loadForMember(userId, circleId);
  const ordered = await orderedMembers(circle);
  return ordered.map((u, i) => ({ position: i + 1, userId: u.id, name: u.name }));
}

export async function startCircle(userId: string, circleId: string, order?: string[]) {
  const circle = await loadForMember(userId, circleId);
  if (circle.organizer.toString() !== userId) {
    throw new AppError("Only the organizer can start the circle", 403);
  }
  const ordered = await orderedMembers(circle, order);
  const signer = await getUserKeypair(userId);
  await writeContract(circle.contractId, signer, "start", {
    order: ordered.map((u) => u.publicKey),
  });
  await logActivity(
    circle.id,
    "started",
    `Circle started. Payout order: ${ordered.map((u) => u.name).join(", ")}`,
    userId
  );
  return ordered.map((u, i) => ({ position: i + 1, name: u.name }));
}

export async function contribute(userId: string, circleId: string) {
  const circle = await loadForMember(userId, circleId);
  const user = await findUser(userId);
  await requireFunds(user, circle.amount, "Your balance is too low for this contribution. Top up first.");

  const before = await chainState(circle);
  const signer = await getUserKeypair(userId);
  await writeContract(circle.contractId, signer, "contribute", { member: user.publicKey });
  await logActivity(
    circle.id,
    "paid",
    `${user.name} paid ${circle.amount} USDC (cycle ${before.current_cycle})`,
    userId,
    { cycle: before.current_cycle, amount: circle.amount }
  );

  const after = await chainState(circle);
  if (after.current_cycle !== before.current_cycle || after.status.tag === "Completed") {
    const pot = circle.amount * circle.members.length * circle.contributionsPerPayout;
    await logPayout(circle, before.current_cycle, pot);
        if (after.status.tag === "Completed") {
      circle.finished = true;
      await circle.save();
    }
  }
  return { ok: true };
}

async function settleWith(circle: CircleDoc, signer: Keypair) {
  const before = await chainState(circle);
  if (before.status.tag !== "Active") throw new AppError("This circle is not running", 400);

  const order: string[] = await readContract(circle.contractId, "get_order");
  const recipientKey = order[before.current_cycle - 1];
  const recipientBefore = Number(await getUsdcBalance(recipientKey));

  await writeContract(circle.contractId, signer, "payout", {});

  const received = Number(await getUsdcBalance(recipientKey)) - recipientBefore;

  const members: string[] = await readContract(circle.contractId, "get_members");
  for (const key of members) {
    const paid: number = await readContract(circle.contractId, "get_paid", {
      cycle: before.current_cycle,
      member: key,
    });
    const missing = before.contributions_per_payout - paid;
    if (missing > 0) {
      await logActivity(
        circle.id,
        "default",
        `${await nameOf(key)} missed ${missing} contribution(s) in cycle ${before.current_cycle}. Deposit used to cover it.`,
        undefined,
        { cycle: before.current_cycle, missing }
      );
    }
  }
  await logPayout(circle, before.current_cycle, Math.round(received * 100) / 100);

  const after = await chainState(circle);
  if (after.status.tag === "Completed") {
    circle.finished = true;
    await circle.save();
  }
  return { ok: true };
}

export async function settle(userId: string, circleId: string) {
  const circle = await loadForMember(userId, circleId);
  return settleWith(circle, await getUserKeypair(userId));
}

export async function autoSettleOverdue() {
  const treasury = Keypair.fromSecret(env.treasurySecret);
  const circles = await Circle.find({ finished: false });
  for (const circle of circles) {
    try {
      const chain = await chainState(circle);
      if (chain.status.tag === "Completed") {
        circle.finished = true;
        await circle.save();
        continue;
      }
      if (chain.status.tag !== "Active") continue;
      const cycleLength = Number(chain.contribution_interval) * chain.contributions_per_payout;
      const cycleEnd = Number(chain.start_time) + chain.current_cycle * cycleLength;
      if (Date.now() / 1000 >= cycleEnd + 6) await settleWith(circle, treasury);
    } catch (err) {
      console.error("auto-settle failed for", circle.id, err);
    }
  }
}

export async function claimDeposit(userId: string, circleId: string) {
  const circle = await loadForMember(userId, circleId);
  const user = await findUser(userId);
  const balanceBefore = Number(await getUsdcBalance(user.publicKey));

  const signer = await getUserKeypair(userId);
  await writeContract(circle.contractId, signer, "claim_deposit", { member: user.publicKey });

  const claimed = Number(await getUsdcBalance(user.publicKey)) - balanceBefore;
  await logActivity(
    circle.id,
    "claimed",
    `${user.name} reclaimed ${Math.round(claimed * 100) / 100} USDC deposit`,
    userId
  );
  return { ok: true, claimed };
}

export async function listMyCircles(userId: string) {
  const circles = await Circle.find({ members: userId }).sort({ createdAt: -1 });
  return circles.map((c) => ({
    id: c.id,
    name: c.name,
    inviteCode: c.inviteCode,
    amount: c.amount,
    members: c.members.length,
    maxMembers: c.maxMembers,
  }));
}

export async function getCircle(userId: string, circleId: string) {
  const circle = await loadForMember(userId, circleId);
  const chain = await chainState(circle);
    const keys: string[] =
    chain.status.tag === "Open" ? [] : await readContract(circle.contractId, "get_order");
  const owners = await User.find({ publicKey: { $in: keys } });
  const byKey = new Map(owners.map((u) => [u.publicKey, u]));
  return {
    id: circle.id,
    name: circle.name,
    inviteCode: circle.inviteCode,
    contractId: circle.contractId,
    amount: fromBaseUnits(chain.amount),
    deposit: fromBaseUnits(chain.deposit),
    maxMembers: chain.max_members,
    members: circle.members.length,
    joinDeadline: circle.joinDeadline,  
    contributionInterval: Number(chain.contribution_interval),
    contributionsPerPayout: chain.contributions_per_payout,
    status: chain.status.tag,
    currentCycle: chain.current_cycle,
    startTime: Number(chain.start_time),
    isOrganizer: circle.organizer.toString() === userId,
    order: keys.map((k, i) => ({
      position: i + 1,
      name: byKey.get(k)?.name ?? "Member",
      you: byKey.get(k)?.id === userId,
    })),
  };
}

export async function getActivity(userId: string, circleId: string) {
  const circle = await loadForMember(userId, circleId);
  return listActivity(circle.id);
}