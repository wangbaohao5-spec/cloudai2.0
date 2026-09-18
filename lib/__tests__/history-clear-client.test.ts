import { describe, expect, it, vi } from "vitest";
import { clearHistoryAndReload } from "@/components/history/history-actions";

describe("history clear client synchronization", () => {
  it("reloads history from the server after a successful clear", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    await clearHistoryAndReload({
      reload,
      request: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing client state when the delete request fails", async () => {
    const reload = vi.fn().mockResolvedValue(undefined);

    await expect(
      clearHistoryAndReload({
        reload,
        request: vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
      }),
    ).rejects.toThrow("生成记录清理失败，请稍后再试。");

    expect(reload).not.toHaveBeenCalled();
  });
});
