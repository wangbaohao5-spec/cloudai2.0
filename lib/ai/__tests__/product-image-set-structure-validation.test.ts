import { describe, expect, it } from "vitest";

import { validateImageSetStructure } from "../product-image-set-structure-validation";
import type { ProductImageSetCustomStructure } from "../product-image-set-plan-prompt-builder";

const customStructure: ProductImageSetCustomStructure = {
  detailCloseup: 1,
  other: 1,
  sellingPoint: 2,
  usageScene: 2,
  whiteBackground: 1,
};

function images(imageTypes: string[]) {
  return imageTypes.map((imageType) => ({ imageType }));
}

describe("validateImageSetStructure", () => {
  it("skips validation for smart mode", () => {
    const result = validateImageSetStructure({
      customStructure,
      images: images(["white-background", "selling-point"]),
      structureMode: "smart",
    });

    expect(result.status).toBe("not-needed");
    expect(result.items).toEqual([]);
  });

  it("returns matched when image types fit the custom structure", () => {
    const result = validateImageSetStructure({
      customStructure,
      images: images(["white-background", "selling-point", "selling-point", "usage-scene", "model-wearing", "detail-closeup", "cta"]),
      structureMode: "custom",
    });

    expect(result.status).toBe("matched");
    expect(result.totalExpected).toBe(7);
    expect(result.totalActual).toBe(7);
    expect(result.items.find((item) => item.key === "usageScene")).toMatchObject({ expected: 2, actual: 2 });
    expect(result.items.find((item) => item.key === "other")).toMatchObject({ expected: 1, actual: 1 });
  });

  it("returns partial when the result has a small category drift", () => {
    const result = validateImageSetStructure({
      customStructure,
      images: images(["hero", "selling-point", "selling-point", "selling-point", "usage-scene", "detail-closeup", "cta"]),
      structureMode: "custom",
    });

    expect(result.status).toBe("partial");
    expect(result.items.find((item) => item.key === "sellingPoint")).toMatchObject({ expected: 2, actual: 3 });
    expect(result.items.find((item) => item.key === "usageScene")).toMatchObject({ expected: 2, actual: 1 });
  });

  it("returns mismatched when the custom structure differs significantly", () => {
    const result = validateImageSetStructure({
      customStructure,
      images: images(["selling-point", "selling-point", "selling-point", "selling-point", "selling-point", "cta", "brand-story"]),
      structureMode: "custom",
    });

    expect(result.status).toBe("mismatched");
  });

  it("maps unknown image types to other without throwing", () => {
    const result = validateImageSetStructure({
      customStructure: {
        other: 2,
        whiteBackground: 1,
      },
      images: images(["white-background", "unexpected-type", "future-image-type"]),
      structureMode: "custom",
    });

    expect(result.status).toBe("matched");
    expect(result.items.find((item) => item.key === "other")).toMatchObject({ expected: 2, actual: 2 });
  });
});
