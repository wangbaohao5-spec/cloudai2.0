import { describe, expect, it, vi } from "vitest";
import { createGenerationAttempt } from "@/lib/generation-request";
import {
  clearImageSetFailure,
  getFailedImageSetSlots,
  getRemainingImageSetSlots,
  recordImageSetFailure,
  recordImageSetSuccess,
} from "@/lib/product-image-set-progress";

const slots = [{ imageIndex: 1 }, { imageIndex: 2 }, { imageIndex: 3 }];

describe("image-set partial success progress", () => {
  it("retains successful slots and exposes only the failed slot for retry", () => {
    let results = {};
    let errors = {};

    results = recordImageSetSuccess(results, 1, { imageUrl: "one.png" });
    errors = recordImageSetFailure(errors, 2, "generation failed");
    results = recordImageSetSuccess(results, 3, { imageUrl: "three.png" });

    expect(results).toEqual({
      1: { imageUrl: "one.png" },
      3: { imageUrl: "three.png" },
    });
    expect(errors).toEqual({ 2: "generation failed" });
    expect(getRemainingImageSetSlots(slots, results).map((slot) => slot.imageIndex)).toEqual([2]);
    expect(getFailedImageSetSlots(slots, results, errors).map((slot) => slot.imageIndex)).toEqual([2]);
  });

  it("submits only the failed slot on retry and preserves prior successes", async () => {
    let results: Record<number, { imageUrl: string }> = {
      1: { imageUrl: "one.png" },
      3: { imageUrl: "three.png" },
    };
    let errors: Record<number, string> = { 2: "generation failed" };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ imageUrl: "two.png" }));
    const retriedIndexes: number[] = [];

    for (const slot of getFailedImageSetSlots(slots, results, errors)) {
      const attempt = createGenerationAttempt(fetcher);
      retriedIndexes.push(slot.imageIndex);
      await attempt.fetch(`/api/products/image-set/generate?slot=${slot.imageIndex}`, { method: "POST" });
      results = recordImageSetSuccess(results, slot.imageIndex, { imageUrl: "two.png" });
      errors = clearImageSetFailure(errors, slot.imageIndex);
    }

    expect(retriedIndexes).toEqual([2]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain("slot=2");
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("x-request-id")).toBeTruthy();
    expect(results).toEqual({
      1: { imageUrl: "one.png" },
      2: { imageUrl: "two.png" },
      3: { imageUrl: "three.png" },
    });
    expect(errors).toEqual({});
    expect(getRemainingImageSetSlots(slots, results)).toEqual([]);
  });
});
