import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

vi.mock("./notification.service", () => ({ notify: vi.fn(async () => undefined) }));

import { UserModel } from "../models/user.model";
import { GroupAjoModel } from "../models/groupAjo.model";
import { ContributionModel } from "../models/contribution.model";
import { runContributionCycle } from "./contributionCycle.service";
import { notify } from "./notification.service";
import {
  confirmContribution,
  getCurrentRound,
  isMembershipOpen,
  markContributionSent,
  unconfirmContribution,
} from "./round.service";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
  await Promise.all([UserModel.syncIndexes(), GroupAjoModel.syncIndexes(), ContributionModel.syncIndexes()]);
});

async function makeUser(username: string) {
  return UserModel.create({
    name: username.toUpperCase(),
    email: `${username}@example.com`,
    phone: "08000000000",
    password: "hashed",
    username,
    basicKycCompleted: true,
    bankAccount: { accountNumber: "0123456789", accountName: username.toUpperCase(), bankName: "Test Bank", bankCode: "058", confirmedAt: new Date() },
  });
}

/** Creates a weekly group of `n` members starting at `startDate`, creator first in payout order. */
async function makeGroup(startDate: Date, n = 3) {
  const users = await Promise.all(Array.from({ length: n }, (_, i) => makeUser(`user${i + 1}`)));
  const group = await GroupAjoModel.create({
    name: "Test Ajo",
    groupType: "low",
    contributionAmount: 5000,
    frequency: "weekly",
    startDate,
    createdBy: users[0]._id,
    inviteCode: new mongoose.Types.ObjectId().toString(),
    status: "open",
    members: users.map((u, i) => ({ user: u._id, order: i + 1, hasReceived: false })),
  });
  return { group, users };
}

const id = (x: { _id: mongoose.Types.ObjectId }) => x._id.toString();

describe("round lifecycle (non-custodial)", () => {
  it("opens round 1 at the lock time and locks membership", async () => {
    const start = new Date(Date.now() + 10 * DAY);
    const { group } = await makeGroup(start);
    expect(isMembershipOpen(group, new Date(start.getTime() - 3 * DAY))).toBe(true);

    await runContributionCycle(new Date(start.getTime() - 3 * DAY));
    expect((await GroupAjoModel.findById(group._id))!.status).toBe("open");

    await runContributionCycle(new Date(start.getTime() - 47 * HOUR));
    const active = (await GroupAjoModel.findById(group._id))!;
    expect(active.status).toBe("active");
    expect(isMembershipOpen(active)).toBe(false);

    const rows = await ContributionModel.find({ groupAjo: group._id, cycle: 1 }).lean();
    expect(rows).toHaveLength(2); // recipient (order 1) doesn't pay themselves
    expect(rows.every((r) => r.recipient.toString() === group.members[0].user.toString())).toBe(true);
  });

  // users[0] is the group admin (createdBy) and also the round-1 recipient (order 1).

  it("non-admin members, including the recipient, get 403 on confirm and unconfirm", async () => {
    const { group, users } = await makeGroup(new Date(Date.now() + DAY), 4);
    const [admin, b, c, d] = users;
    await runContributionCycle(new Date());
    await markContributionSent(id(group), id(c));

    for (const actor of [b, c, d]) {
      await expect(confirmContribution(id(group), id(actor), id(c))).rejects.toMatchObject({ statusCode: 403 });
      await expect(unconfirmContribution(id(group), id(actor), id(c))).rejects.toMatchObject({ statusCode: 403 });
    }
    // Nothing changed.
    const row = (await ContributionModel.findOne({ groupAjo: group._id, cycle: 1, user: c._id }))!;
    expect(row.status).toBe("marked_paid");
    expect(row.confirmedAt).toBeUndefined();

    // In round 2 the recipient is b (not the admin) and still can't confirm.
    await confirmContribution(id(group), id(admin), id(b));
    await confirmContribution(id(group), id(admin), id(c));
    await confirmContribution(id(group), id(admin), id(d));
    expect((await GroupAjoModel.findById(group._id))!.currentRound).toBe(2);
    await expect(confirmContribution(id(group), id(b), id(c))).rejects.toMatchObject({ statusCode: 403 });
  });

  it("a member's \"I've sent\" does not count as paid and notifies the admin", async () => {
    const start = new Date(Date.now() + DAY);
    const { group, users } = await makeGroup(start);
    const [admin, b, c] = users;
    await runContributionCycle(new Date());
    vi.mocked(notify).mockClear();

    await markContributionSent(id(group), id(b), "NIP-123");
    await markContributionSent(id(group), id(c));

    expect(vi.mocked(notify).mock.calls.filter(([uid]) => uid === id(admin))).toHaveLength(2);
    const view = await getCurrentRound(id(group), id(b));
    expect(view.round!.myPayment?.status).toBe("marked_paid");
    expect(view.round!.progress).toEqual({ confirmed: 0, total: 2 });
    // Members only see their own status; the checklist is admin-only.
    expect(view.round!.payments).toEqual([]);
    expect((await getCurrentRound(id(group), id(admin))).round!.payments).toHaveLength(2);

    let g = (await GroupAjoModel.findById(group._id))!;
    expect(g.currentRound).toBe(1);
    expect(g.members.find((m) => m.order === 1)!.hasReceived).toBe(false);
    await expect(markContributionSent(id(group), id(admin))).rejects.toMatchObject({ statusCode: 400 }); // admin is the recipient

    // Grace ends with both still only "sent" -> they default, because only admin confirmation counts.
    await runContributionCycle(new Date(start.getTime() + HOUR));
    await runContributionCycle(new Date(start.getTime() + 49 * HOUR));
    const rows = await ContributionModel.find({ groupAjo: group._id, cycle: 1 }).lean();
    expect(rows.every((r) => r.status === "defaulted")).toBe(true);
    g = (await GroupAjoModel.findById(group._id))!;
    expect(g.currentRound).toBe(1);
  });

  it("round advances after the admin confirms every member; confirmedAt/confirmedBy stored", async () => {
    const { group, users } = await makeGroup(new Date(Date.now() + DAY));
    const [admin, b, c] = users;
    const now = new Date();
    await runContributionCycle(now);

    await markContributionSent(id(group), id(b), "NIP-123", now);
    const first = await confirmContribution(id(group), id(admin), id(b), now);
    expect(first.roundSettled).toBe(false);
    expect(first.contribution.confirmedBy?.toString()).toBe(id(admin));
    expect(first.contribution.confirmedAt).toEqual(now);

    // c never tapped "I've sent"; the admin can still confirm (e.g. checked their bank).
    const second = await confirmContribution(id(group), id(admin), id(c), now);
    expect(second.roundSettled).toBe(true);

    const g = (await GroupAjoModel.findById(group._id))!;
    expect(g.currentRound).toBe(2);
    expect(g.members.find((m) => m.order === 1)!.hasReceived).toBe(true);

    const round2 = await ContributionModel.find({ groupAjo: group._id, cycle: 2 }).lean();
    expect(round2.map((r) => r.user.toString()).sort()).toEqual([id(admin), id(c)].sort());
    expect(round2.every((r) => r.recipient.toString() === id(b))).toBe(true);

    const view = await getCurrentRound(id(group), id(c));
    expect(view.round!.recipient.userId).toBe(id(b));
    expect(view.round!.recipient.bankAccount?.accountNumber).toBe("0123456789");
  });

  it("admin can undo a confirmation: back to unpaid, member notified, round not advanced", async () => {
    const { group, users } = await makeGroup(new Date(Date.now() + DAY), 4);
    const [admin, b] = users;
    await runContributionCycle(new Date());

    await confirmContribution(id(group), id(admin), id(b));
    vi.mocked(notify).mockClear();
    const undone = await unconfirmContribution(id(group), id(admin), id(b));
    expect(undone.status).toBe("unpaid");
    expect(undone.confirmedAt).toBeUndefined();
    expect(undone.confirmedBy).toBeUndefined();
    expect(vi.mocked(notify).mock.calls.some(([uid]) => uid === id(b))).toBe(true);

    await expect(unconfirmContribution(id(group), id(admin), id(b))).rejects.toMatchObject({ statusCode: 400 });
    const view = await getCurrentRound(id(group), id(admin));
    expect(view.round!.progress.confirmed).toBe(0);
  });

  it("default after grace: reliability penalty only, no money taken, penalised once", async () => {
    const start = new Date(Date.now() + DAY);
    const { group, users } = await makeGroup(start);
    const [admin, b, c] = users;
    await runContributionCycle(new Date());
    await confirmContribution(id(group), id(admin), id(b));

    // Due date passes with C unconfirmed -> round paused, C unpaid.
    await runContributionCycle(new Date(start.getTime() + HOUR));
    let g = (await GroupAjoModel.findById(group._id))!;
    expect(g.roundStatus).toBe("paused");
    expect((await ContributionModel.findOne({ groupAjo: group._id, cycle: 1, user: c._id }))!.status).toBe("unpaid");

    // Grace (48h) ends -> C defaulted.
    const afterGrace = new Date(start.getTime() + 49 * HOUR);
    await runContributionCycle(afterGrace);
    const row = (await ContributionModel.findOne({ groupAjo: group._id, cycle: 1, user: c._id }).lean())!;
    expect(row.status).toBe("defaulted");
    expect(row).not.toHaveProperty("penaltyAmount");

    let cUser = (await UserModel.findById(c._id).lean())!;
    expect(cUser.reliabilityScore).toBe(80);
    expect(cUser.missedPaymentsCount).toBe(1);
    expect(cUser).not.toHaveProperty("wallets");

    // Later ticks don't penalise again.
    await runContributionCycle(new Date(afterGrace.getTime() + DAY));
    cUser = (await UserModel.findById(c._id).lean())!;
    expect(cUser.reliabilityScore).toBe(80);

    // Nothing in the platform stores or moves money.
    const collections = (await mongoose.connection.db!.listCollections().toArray()).map((x) => x.name);
    expect(collections).not.toContain("transactions");

    // Round stays paused until the admin confirms the late payment; no further penalty for C.
    g = (await GroupAjoModel.findById(group._id))!;
    expect(g.currentRound).toBe(1);
    const late = await confirmContribution(id(group), id(admin), id(c), new Date(afterGrace.getTime() + 2 * DAY));
    expect(late.roundSettled).toBe(true);
    expect((await UserModel.findById(c._id))!.reliabilityScore).toBe(80);
    expect((await GroupAjoModel.findById(group._id))!.currentRound).toBe(2);
  });

  it("scores reliability when the round settles: on-time +2, late -5", async () => {
    const start = new Date(Date.now() + DAY);
    const { group, users } = await makeGroup(start);
    const [admin, b, c] = users;
    await UserModel.updateMany({}, { $set: { reliabilityScore: 50 } });
    await runContributionCycle(new Date());

    await confirmContribution(id(group), id(admin), id(b), new Date(start.getTime() - HOUR));
    expect((await UserModel.findById(b._id))!.reliabilityScore).toBe(50); // not scored until settle
    await confirmContribution(id(group), id(admin), id(c), new Date(start.getTime() + HOUR));

    expect((await UserModel.findById(b._id))!.reliabilityScore).toBe(52);
    expect((await UserModel.findById(c._id))!.reliabilityScore).toBe(45);
  });

  it("restricts a member after repeated defaults", async () => {
    const start = new Date(Date.now() + DAY);
    const { group, users } = await makeGroup(start, 2);
    const [, b] = users;
    await UserModel.updateOne({ _id: b._id }, { $set: { reliabilityScore: 50 } });
    await runContributionCycle(new Date());
    await runContributionCycle(new Date(start.getTime() + HOUR));
    await runContributionCycle(new Date(start.getTime() + 49 * HOUR));

    const bUser = (await UserModel.findById(b._id))!;
    expect(bUser.reliabilityScore).toBe(30);
    expect(bUser.isRestricted).toBe(true);
  });

  it("completes the group when the final member receives (admin confirms their own payment too)", async () => {
    const { group, users } = await makeGroup(new Date(Date.now() + DAY), 2);
    const [admin, b] = users;
    await runContributionCycle(new Date());

    await confirmContribution(id(group), id(admin), id(b));
    await markContributionSent(id(group), id(admin));
    const last = await confirmContribution(id(group), id(admin), id(admin));
    expect(last.roundSettled).toBe(true);

    const g = (await GroupAjoModel.findById(group._id))!;
    expect(g.status).toBe("completed");
    expect(g.isCompleted).toBe(true);
    expect(g.members.every((m) => m.hasReceived)).toBe(true);
    expect((await UserModel.findById(admin._id))!.completedAjoCycles).toBe(1);

    const view = await getCurrentRound(id(group), id(admin));
    expect(view.round).toBeNull();
  });

  it("cancels a group that has fewer than 2 members when it would start", async () => {
    const { group } = await makeGroup(new Date(Date.now() + DAY), 1);
    await runContributionCycle(new Date());
    expect((await GroupAjoModel.findById(group._id))!.status).toBe("cancelled");
  });
});
