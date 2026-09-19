import { describe, expect, it, vi } from "vitest";
import { copyProductPackageText } from "@/lib/product-package-clipboard";

describe("product package clipboard recovery", () => {
  it("returns safe user feedback when clipboard access is rejected", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));

    await expect(copyProductPackageText("package", writeText)).resolves.toEqual({
      message: "复制失败，请手动选择内容复制。",
      tone: "error",
    });
  });
});
