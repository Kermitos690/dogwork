import { describe, it, expect } from "vitest";
import {
  TIERS,
  getTierByProductId,
  getTierByPriceId,
} from "@/hooks/useSubscription";
import { EDUCATOR_PRODUCT_ID, EDUCATOR_PRICE_ID } from "@/hooks/useEducatorSubscription";

describe("Subscription tier resolution", () => {
  it("returns starter for null product ID", () => {
    expect(getTierByProductId(null)).toBe("starter");
  });

  it("returns starter for unknown product ID", () => {
    expect(getTierByProductId("prod_unknown")).toBe("starter");
  });

  it("resolves pro tier by product ID", () => {
    expect(getTierByProductId(TIERS.pro.product_id)).toBe("pro");
  });

  it("resolves expert tier by product ID", () => {
    expect(getTierByProductId(TIERS.expert.product_id)).toBe("expert");
  });

  it("returns starter for null price ID", () => {
    expect(getTierByPriceId(null)).toBe("starter");
  });

  it("resolves pro tier by price ID", () => {
    expect(getTierByPriceId(TIERS.pro.price_id)).toBe("pro");
  });

  it("resolves expert tier by price ID", () => {
    expect(getTierByPriceId(TIERS.expert.price_id)).toBe("expert");
  });

  it("has consistent product/price IDs across tiers", () => {
    expect(TIERS.starter.price_id).toBeNull();
    expect(TIERS.starter.product_id).toBeNull();
    expect(TIERS.pro.price_id).toBeTruthy();
    expect(TIERS.pro.product_id).toBeTruthy();
    expect(TIERS.expert.price_id).toBeTruthy();
    expect(TIERS.expert.product_id).toBeTruthy();
  });
});

describe("Educator subscription constants", () => {
  it("has valid educator product and price IDs", () => {
    expect(EDUCATOR_PRODUCT_ID).toMatch(/^prod_/);
    expect(EDUCATOR_PRICE_ID).toMatch(/^price_/);
  });

  it("educator product differs from owner tiers", () => {
    expect(EDUCATOR_PRODUCT_ID).not.toBe(TIERS.pro.product_id);
    expect(EDUCATOR_PRODUCT_ID).not.toBe(TIERS.expert.product_id);
  });
});
