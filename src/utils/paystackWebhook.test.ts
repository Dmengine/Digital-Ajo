import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyPaystackSignature } from "./paystackWebhook";

describe("verifyPaystackSignature", () => {
  const secret = "sk_test_example";
  const body = Buffer.from(JSON.stringify({ event: "charge.success" }), "utf8");

  it("accepts a valid Paystack-style HMAC-SHA512 hex signature", () => {
    const sig = crypto.createHmac("sha512", secret).update(body).digest("hex");
    expect(verifyPaystackSignature(body, sig, secret)).toBe(true);
  });

  it("rejects wrong secret", () => {
    const sig = crypto.createHmac("sha512", secret).update(body).digest("hex");
    expect(verifyPaystackSignature(body, sig, "other_secret")).toBe(false);
  });

  it("rejects tampered body", () => {
    const sig = crypto.createHmac("sha512", secret).update(body).digest("hex");
    const tampered = Buffer.from(JSON.stringify({ event: "charge.failed" }), "utf8");
    expect(verifyPaystackSignature(tampered, sig, secret)).toBe(false);
  });

  it("rejects missing raw body or signature", () => {
    expect(verifyPaystackSignature(undefined, "abc", secret)).toBe(false);
    expect(verifyPaystackSignature(body, undefined, secret)).toBe(false);
  });

  it("rejects malformed signature length without throwing", () => {
    expect(verifyPaystackSignature(body, "too-short", secret)).toBe(false);
  });
});
