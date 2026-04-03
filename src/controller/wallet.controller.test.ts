import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/wallet.service", () => ({
  applyPaystackDeposit: vi.fn(),
  debitWallet: vi.fn(),
  reverseWalletDebit: vi.fn(),
}));

vi.mock("../utils/paystackWebhook", () => ({
  verifyPaystackSignature: vi.fn(() => true),
}));

vi.mock("../config/env", () => ({
  env: {
    webhookSecret: vi.fn(() => "test_secret"),
  },
}));

import { applyPaystackDeposit } from "../services/wallet.service";
import { webhook } from "./wallet.controller";

describe("wallet.controller webhook", () => {
  beforeEach(() => {
    (applyPaystackDeposit as any).mockReset();
  });

  it("does not process charge.success when Paystack reference is missing/empty", async () => {
    const req = {
      headers: { "x-paystack-signature": "sig" },
      rawBody: Buffer.from("body"),
      body: {
        event: "charge.success",
        data: {
          reference: "",
          metadata: { userId: "user_1" },
          amount: 20000,
        },
      },
    } as any;

    const res = {
      sendStatus: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const next = vi.fn();

    // asyncHandler doesn't return a promise, so we "schedule" async completion.
    (webhook as any)(req, res, next);
    await Promise.resolve();

    expect(applyPaystackDeposit).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(200);
  });
});

