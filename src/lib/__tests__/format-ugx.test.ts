import { formatUGX } from "../format-ugx";

describe("formatUGX", () => {
  it("adds the currency and thousands separators", () => {
    expect(formatUGX(1_499_000)).toBe("UGX 1,499,000");
  });

  it("never shows decimals (UGX has no minor unit in practice)", () => {
    expect(formatUGX(349_000.6)).toBe("UGX 349,001");
  });

  it("formats zero", () => {
    expect(formatUGX(0)).toBe("UGX 0");
  });
});
