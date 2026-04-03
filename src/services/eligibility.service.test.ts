import { describe, it, expect } from "vitest";
import { assessGroupEligibility, bufferRequiredForGroupType } from "./eligibility.service";

const baseUser = { kycTier: 1 as const, basicKycCompleted: true };

describe("assessGroupEligibility", () => {
  it("rejects users who haven't completed Basic KYC", () => {
    const r = assessGroupEligibility({ kycTier: 1, basicKycCompleted: false }, "low");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Basic KYC/i);
  });

  it("allows Tier-1 users into low groups when Basic KYC is completed", () => {
    expect(assessGroupEligibility({ ...baseUser }, "low").ok).toBe(true);
  });

  it("allows Tier-1 users into premium groups for MVP testing", () => {
    expect(assessGroupEligibility({ ...baseUser }, "premium").ok).toBe(true);
  });

  it("still respects kycTier enum (tier 1 minimum)", () => {
    const r = assessGroupEligibility({ kycTier: 1, basicKycCompleted: true }, "high");
    expect(r.ok).toBe(true);
  });
});

describe("bufferRequiredForGroupType", () => {
  it("is false for low only", () => {
    expect(bufferRequiredForGroupType("low")).toBe(false);
    expect(bufferRequiredForGroupType("medium")).toBe(true);
  });
});
