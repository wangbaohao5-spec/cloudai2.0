import { describe, expect, it } from "vitest";
import { getMissingProductionEnv } from "@/lib/server-env";

function baseEnv(): Record<string, string | undefined> {
  return {
    AUTH_SECRET: "configured",
    DATABASE_URL: "configured",
    SUPABASE_URL: "configured",
    SUPABASE_SERVICE_ROLE_KEY: "configured",
    DASHSCOPE_API_KEY: "configured",
    DEEPSEEK_API_KEY: "configured",
    RUN_API_KEY: "configured",
    RUN_API_BASE_URL: "configured",
  };
}

describe("production environment validation", () => {
  it("reports required storage and enabled provider variables", () => {
    expect(getMissingProductionEnv({})).toEqual(expect.arrayContaining([
      "AUTH_SECRET",
      "DATABASE_URL",
      "DASHSCOPE_API_KEY",
      "DEEPSEEK_API_KEY",
      "RUN_API_KEY",
      "RUN_API_BASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]));
  });

  it("validates only the selected image edit provider", () => {
    const env = baseEnv();
    delete env.RUN_API_KEY;
    delete env.RUN_API_BASE_URL;
    env.IMAGE_EDIT_PROVIDER = "gemini-image";
    env.PRODUCT_IMAGE_EDIT_PROVIDER = "gemini-image";
    env.SCENE_IMAGE_PROVIDER = "gemini-image";
    env.DETAIL_PAGE_IMAGE_PROVIDER = "gemini-image";
    env.IMAGE_SET_IMAGE_PROVIDER = "gemini-image";
    env.GEMINI_IMAGE_API_KEY = "configured";

    expect(getMissingProductionEnv(env)).not.toContain("RUN_API_KEY");
    expect(getMissingProductionEnv(env)).toEqual([]);
  });

  it("does not require video-only configuration while video is disabled", () => {
    const env = baseEnv();
    env.NEXT_PUBLIC_BETA_VIDEO_ENABLED = "false";
    expect(getMissingProductionEnv(env)).not.toContain("DASHSCOPE_VIDEO_MODEL");
  });
});
