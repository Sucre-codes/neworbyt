import { connectDb } from "../src/config/db";
import { Circle } from "../src/models/circle.model";
import { User } from "../src/models/user.model";
import * as circles from "../src/services/circle.service";
import * as users from "../src/services/user.service";
import * as auth from "../src/services/auth.service"

const sleep = (s: number) => new Promise((r) => setTimeout(r, s * 1000));
const step = (m: string) => console.log(`\n>> ${m}`);

async function waitUntilLedger(unixSeconds: number) {
  const wait = unixSeconds + 6 - Date.now() / 1000;
  if (wait > 0) {
    console.log(`   waiting ${Math.ceil(wait)}s...`);
    await sleep(wait);
  }
}

await connectDb();

const people = [
  { name: "Emem Udoh", email: "emem@demo.orbyt", phone: "08000000001" },
  { name: "Ima Bassey", email: "ima@demo.orbyt", phone: "08000000002" },
  { name: "Aniekan Etim", email: "aniekan@demo.orbyt", phone: "08000000003" },
];

step("Cleaning old demo data");
await User.deleteMany({ email: { $in: people.map((p) => p.email) } });
await Circle.deleteMany({ name: "Demo Ajo" });

step("Signing up three members");
const ids: string[] = [];
for (const p of people) {
  const { user } = await auth.signUp({ ...p, password: "demo-password-1" });
  await users.deposit(user.id, 1000);
  ids.push(user.id);
  console.log(`   ${user.name} is ready with 1000 USDC`);
}
const [organizer, second, third] = ids;

step("Organizer creates the circle");
const created = await circles.createCircle(organizer, {
  name: "Demo Ajo",
  amount: 10,
  deposit: 10,
  maxMembers: 3,
  joinDeadline: new Date(Date.now() + 10 * 60 * 1000),
  contributionInterval: 90,
  contributionsPerPayout: 2,
});
console.log(`   invite code ${created.inviteCode}`);

step("The other two join");
await circles.joinCircle(second, created.inviteCode);
await circles.joinCircle(third, created.inviteCode);

step("Organizer starts the circle");
console.log(await circles.startCircle(organizer, created.id));

const state = await circles.getCircle(organizer, created.id);
const start = state.startTime;
const interval = 90;
const cycleLength = 180;

step("Cycle 1, period 1: everyone pays");
for (const id of ids) await circles.contribute(id, created.id);

step("Cycle 1, period 2: everyone pays, so the payout fires by itself");
await waitUntilLedger(start + interval);
for (const id of ids) await circles.contribute(id, created.id);

step("Cycle 2 opens");
await waitUntilLedger(start + cycleLength);

step("Cycle 2, period 1: everyone pays");
for (const id of ids) await circles.contribute(id, created.id);

step("Cycle 2, period 2: the third member goes quiet");
await waitUntilLedger(start + cycleLength + interval);
await circles.contribute(organizer, created.id);
await circles.contribute(second, created.id);

step("Waiting for cycle 2 to end, then settling");
await waitUntilLedger(start + cycleLength * 2);
try {
  await circles.settle(organizer, created.id);
} catch {
  console.log("   (the auto-settler already did it)");
}

step("Final activity feed");
const feed = await circles.getActivity(organizer, created.id);
for (const item of [...feed].reverse()) console.log(`   - ${item.message}`);

console.log("\nDone.");
process.exit(0);