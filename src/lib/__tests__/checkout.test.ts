import {
  type CheckoutForm,
  INITIAL_CHECKOUT_FORM,
  PAYMENT_METHODS,
  deliveryEstimate,
  formatUgPhone,
  hasErrors,
  makeOrderId,
  networkFor,
  normalizeUgPhone,
  validateCheckout,
  withSubmittedText,
} from "../checkout";

describe("normalizeUgPhone", () => {
  it.each([
    "0772 123456",
    "0772123456",
    "+256772123456",
    "+256 772 123 456",
    "256772123456",
    "772123456",
    "(0772) 123-456",
    "+256 0772 123456", // trunk 0 after the country code
    "+2560772123456",
    "2560772123456",
    "256 0772 123 456",
  ])("normalises %s", (input) => {
    expect(normalizeUgPhone(input)).toBe("+256772123456");
  });

  it.each([
    "",
    "12345",
    "0772 12345", // too short
    "0772 1234567", // too long
    "0414 123456", // landline, not 7x
    "+254772123456", // Kenyan
    "07721234ab",
    "+256 00772 123456", // two zeros
    "+256 0772 12345", // too short after the trunk 0
  ])("rejects %p", (input) => {
    expect(normalizeUgPhone(input)).toBeNull();
  });
});

describe("networkFor", () => {
  it.each([
    ["0761 000000", "mtn"],
    ["0772 123456", "mtn"],
    ["+256782123456", "mtn"],
    ["0790 123456", "mtn"],
    ["0700 123456", "airtel"],
    ["0740 123456", "airtel"],
    ["256752123456", "airtel"],
    ["0712 123456", "other"],
    ["not a number", "other"],
  ] as const)("%s is %s", (phone, network) => {
    expect(networkFor(phone)).toBe(network);
  });
});

describe("formatUgPhone", () => {
  it("groups the digits for display", () => {
    expect(formatUgPhone("0772123456")).toBe("+256 772 123456");
  });
});

describe("validateCheckout", () => {
  const valid: CheckoutForm = {
    fullName: "Amina Nakato",
    phone: "0772 123456",
    area: "Nakawa",
    notes: "Opposite Shell Kisementi",
    payment: "mtn-momo",
  };

  it("accepts a complete MoMo order with an MTN number", () => {
    expect(validateCheckout(valid)).toEqual({});
    expect(hasErrors(validateCheckout(valid))).toBe(false);
  });

  it("flags every field of an empty form", () => {
    const errors = validateCheckout({
      fullName: " ",
      phone: "",
      area: "",
      notes: "",
      payment: "",
    });
    expect(Object.keys(errors).sort()).toEqual(["area", "fullName", "notes", "payment", "phone"]);
  });

  it("rejects a phone number that isn't Ugandan mobile", () => {
    expect(validateCheckout({ ...valid, phone: "0414 123456" }).phone).toMatch(/Ugandan mobile/);
  });

  it("requires an MTN number for MTN MoMo", () => {
    const errors = validateCheckout({ ...valid, phone: "0700 123456" });
    expect(errors.phone).toMatch(/MTN MoMo needs an MTN number/);
  });

  it("requires an Airtel number for Airtel Money", () => {
    const errors = validateCheckout({ ...valid, payment: "airtel-money" });
    expect(errors.phone).toMatch(/Airtel Money needs an Airtel number/);
    expect(validateCheckout({ ...valid, payment: "airtel-money", phone: "0750 123456" })).toEqual(
      {},
    );
  });

  it("takes cash on delivery from any network", () => {
    expect(validateCheckout({ ...valid, payment: "cash", phone: "0712 123456" })).toEqual({});
  });

  it("limits the length of notes", () => {
    expect(validateCheckout({ ...valid, notes: "x".repeat(201) }).notes).toMatch(/under 200/);
  });
});

describe("deliveryEstimate", () => {
  it("is same-day inside Kampala and 1–2 days outside", () => {
    expect(deliveryEstimate("Kampala Central")).toBe("today, within 2–4 hours");
    expect(deliveryEstimate("Outside Kampala")).toBe("1–2 days");
  });
});

describe("makeOrderId", () => {
  // mulberry32: a tiny seeded PRNG, so the sequence is reproducible.
  const seeded = (seed: number) => {
    let a = seed;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  it("looks like VIRTU-XXXXXX with no ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      expect(makeOrderId()).toMatch(/^VIRTU-[2-9A-HJ-NP-Z]{6}$/);
    }
  });

  it("is deterministic for a seeded random source", () => {
    const first = makeOrderId(seeded(42));
    expect(makeOrderId(seeded(42))).toBe(first);
    expect(makeOrderId(seeded(43))).not.toBe(first);
  });

  it("maps the ends of the random range onto the alphabet", () => {
    expect(makeOrderId(() => 0)).toBe("VIRTU-222222");
    expect(makeOrderId(() => 0.999999)).toBe("VIRTU-ZZZZZZ");
  });
});

describe("default payment", () => {
  it("starts on cash on delivery, listed first", () => {
    expect(INITIAL_CHECKOUT_FORM.payment).toBe("cash");
    expect(PAYMENT_METHODS[0]?.id).toBe("cash");
  });
});

describe("withSubmittedText", () => {
  const data = (entries: Record<string, string>) => {
    const fd = new FormData();
    for (const [key, value] of Object.entries(entries)) fd.set(key, value);
    return fd;
  };

  it("takes autofilled text fields from the submitted form data", () => {
    const merged = withSubmittedText(
      INITIAL_CHECKOUT_FORM,
      data({ fullName: "Amina Nakato", phone: "0772 123456", notes: "Blue gate" }),
    );
    expect(merged).toEqual({
      ...INITIAL_CHECKOUT_FORM,
      fullName: "Amina Nakato",
      phone: "0772 123456",
      notes: "Blue gate",
    });
  });

  it("keeps state for fields the form data lacks, and never touches area or payment", () => {
    const form = { ...INITIAL_CHECKOUT_FORM, fullName: "Okello", area: "Nakawa" as const };
    const merged = withSubmittedText(form, data({ phone: "0700 123456", area: "Kira" }));
    expect(merged).toEqual({ ...form, phone: "0700 123456" });
  });

  it("does not mutate the form it is given", () => {
    const form = { ...INITIAL_CHECKOUT_FORM };
    withSubmittedText(form, data({ phone: "0772 123456" }));
    expect(form).toEqual(INITIAL_CHECKOUT_FORM);
  });
});
