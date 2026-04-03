import { describe, it, expect } from "vitest";
import { assessGroupEligibility, bufferRequiredForGroupType } from "./eligibility.service";

const baseUser = { kycTier: 1 as const, reliabilityScore: 100, completedAjoCycles: 3 };

describe("assessGroupEligibility", () => {
  it("allows a strong Tier-1 user into low groups", () => {
    expect(assessGroupEligibility({ ...baseUser, reliabilityScore: 60, completedAjoCycles: 0 }, "low").ok).toBe(true);
  });

  it("rejects low score for low tier groups", () => {
    const r = assessGroupEligibility({ ...baseUser, reliabilityScore: 59, kycTier: 1, completedAjoCycles: 0 }, "low");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/60/);
  });

  it("requires one completed cycle for medium", () => {
    expect(assessGroupEligibility({ ...baseUser, reliabilityScore: 80, completedAjoCycles: 0 }, "medium").ok).toBe(false);
    expect(assessGroupEligibility({ ...baseUser, reliabilityScore: 80, completedAjoCycles: 1 }, "medium").ok).toBe(true);
  });

  it("requires Tier 2 for high groups", () => {
    expect(assessGroupEligibility({ ...baseUser, reliabilityScore: 90, completedAjoCycles: 2, kycTier: 1 }, "high").ok).toBe(false);
    expect(assessGroupEligibility({ ...baseUser, reliabilityScore: 90, completedAjoCycles: 2, kycTier: 2 }, "high").ok).toBe(true);
  });

  it("requires Tier 3 and score 90 for premium", () => {
    expect(
      assessGroupEligibility({ ...baseUser, reliabilityScore: 89, completedAjoCycles: 0, kycTier: 3 }, "premium").ok
    ).toBe(false);
    expect(
      assessGroupEligibility({ ...baseUser, reliabilityScore: 90, completedAjoCycles: 0, kycTier: 3 }, "premium").ok
    ).toBe(true);
  });
});

describe("bufferRequiredForGroupType", () => {
  it("is false for low only", () => {
    expect(bufferRequiredForGroupType("low")).toBe(false);
    expect(bufferRequiredForGroupType("medium")).toBe(true);
  });
});
