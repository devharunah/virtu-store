import { cldUrl, isCloudinaryUrl } from "../image-url";

const URL = "https://res.cloudinary.com/virtu/image/upload/v1731000000/virtu/shops/a.webp";

describe("isCloudinaryUrl", () => {
  it("accepts a Cloudinary image upload", () => {
    expect(isCloudinaryUrl(URL)).toBe(true);
  });

  it.each([
    "https://evil.example/a.png",
    "https://res.cloudinary.com/virtu/raw/upload/a.js",
    "https://res.cloudinary.com/virtu/image/upload/a.png#x",
    `https://res.cloudinary.com/virtu/image/upload/${"a".repeat(400)}`,
  ])("refuses %p", (url) => {
    expect(isCloudinaryUrl(url)).toBe(false);
  });
});

describe("cldUrl", () => {
  it("inserts the transform after /image/upload/", () => {
    expect(cldUrl(URL, "w_400,f_auto")).toBe(
      "https://res.cloudinary.com/virtu/image/upload/w_400,f_auto/v1731000000/virtu/shops/a.webp",
    );
  });

  it("leaves other URLs alone", () => {
    expect(cldUrl("/models/a.png", "w_400")).toBe("/models/a.png");
  });
});
