import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredHistoryRecord = {
  assetId: string | null;
  createdAt: Date;
  id: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  title: string;
  type: string;
  userId: string;
};

const mocks = vi.hoisted(() => ({
  records: [] as StoredHistoryRecord[],
}));

function matchesJsonPath(record: StoredHistoryRecord, condition: Record<string, unknown>) {
  const input = record.input;
  const path = condition.path;
  return Array.isArray(path) && path.length === 1 && input[String(path[0])] === condition.equals;
}

function matchesWhere(record: StoredHistoryRecord, where: Record<string, unknown>): boolean {
  const typeFilter = where.type as { in?: string[]; not?: string; notIn?: string[] } | string | undefined;
  const orFilters = where.OR as Array<Record<string, unknown>> | undefined;

  if (where.userId && record.userId !== where.userId) return false;
  if (where.id && record.id !== where.id) return false;
  if (typeof typeFilter === "string" && record.type !== typeFilter) return false;
  if (typeof typeFilter === "object" && typeFilter.not && record.type === typeFilter.not) return false;
  if (typeof typeFilter === "object" && typeFilter.notIn?.includes(record.type)) return false;
  if (typeof typeFilter === "object" && typeFilter.in && !typeFilter.in.includes(record.type)) return false;
  if (orFilters && !orFilters.some((condition) => {
    if (condition.type && record.type !== condition.type) return false;
    return condition.input ? matchesJsonPath(record, condition.input as Record<string, unknown>) : true;
  })) return false;
  return true;
}

vi.mock("@/lib/db", () => ({
  db: {
    asset: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    historyRecord: {
      count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => mocks.records.filter((record) => matchesWhere(record, where)).length),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const retained = mocks.records.filter((record) => !matchesWhere(record, where));
        const count = mocks.records.length - retained.length;
        mocks.records.splice(0, mocks.records.length, ...retained);
        return { count };
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => mocks.records.find((record) => matchesWhere(record, where)) || null),
      findMany: vi.fn(async ({ orderBy, take, where }: { orderBy?: { createdAt?: string }; take?: number; where: Record<string, unknown> }) => {
        const records = mocks.records.filter((record) => matchesWhere(record, where));
        if (orderBy?.createdAt === "desc") {
          records.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        }
        return typeof take === "number" ? records.slice(0, take) : records;
      }),
    },
  },
}));

import { clearHistory, getHistoryRecordForUser } from "@/lib/history";
import { getProductCreationCenterData } from "@/lib/product-creation-center";
import { getProductProjectList } from "@/lib/product-projects";
import { getLatestValidProductAnalysisHistoryId } from "@/lib/recent-product-analysis";

function analysisRecord(id: string, title: string, createdAt: string): StoredHistoryRecord {
  return {
    id,
    userId: "user-a",
    assetId: null,
    type: "product-analysis",
    title,
    input: {},
    output: { category: "测试商品", productNameSuggestions: [title] },
    createdAt: new Date(createdAt),
  };
}

function generationRecord(id: string, analysisHistoryId: string, createdAt: string): StoredHistoryRecord {
  return {
    id,
    userId: "user-a",
    assetId: null,
    type: "copywriting",
    title: "生成内容",
    input: { analysisHistoryId },
    output: { title: "生成标题" },
    createdAt: new Date(createdAt),
  };
}

function detailPageProjectRecord(analysisHistoryId: string): StoredHistoryRecord {
  return {
    id: `detail-page-project-${analysisHistoryId}`,
    userId: "user-a",
    assetId: null,
    type: "detail-page-project",
    title: "详情页策划",
    input: { analysisHistoryId },
    output: { version: 2 },
    createdAt: new Date("2026-09-04T12:00:00.000Z"),
  };
}

describe("product recovery after clearing generation history", () => {
  beforeEach(() => {
    mocks.records.splice(
      0,
      mocks.records.length,
      analysisRecord("analysis-a", "Product A", "2026-09-01T00:00:00.000Z"),
      generationRecord("copy-a", "analysis-a", "2026-09-02T00:00:00.000Z"),
      analysisRecord("analysis-b", "Product B", "2026-09-03T00:00:00.000Z"),
      generationRecord("copy-b", "analysis-b", "2026-09-04T00:00:00.000Z"),
      detailPageProjectRecord("analysis-a"),
      { ...analysisRecord("analysis-other", "Other Product", "2026-09-05T00:00:00.000Z"), userId: "user-b" },
    );
  });

  it("retains both product anchors for recent, all-products, and Workspace recovery consumers", async () => {
    await expect(clearHistory("user-a")).resolves.toBe(2);

    expect(mocks.records.filter((record) => record.userId === "user-a" && !["product-analysis", "detail-page-project"].includes(record.type))).toEqual([]);
    expect(mocks.records.filter((record) => record.userId === "user-a").map((record) => record.id)).toEqual([
      "analysis-a",
      "analysis-b",
      "detail-page-project-analysis-a",
    ]);
    expect(mocks.records.some((record) => record.id === "analysis-other")).toBe(true);

    const recentAnalysisId = await getLatestValidProductAnalysisHistoryId("user-a");
    const projectList = await getProductProjectList("user-a");

    expect(recentAnalysisId).toBe("analysis-b");
    expect(projectList.projects.map((project) => project.analysisHistoryId)).toEqual(["analysis-b", "analysis-a"]);
    await expect(getHistoryRecordForUser("user-a", recentAnalysisId!)).resolves.toMatchObject({ id: "analysis-b", type: "product-analysis" });

    const [productA, productB] = await Promise.all([
      getProductCreationCenterData("user-a", "analysis-a"),
      getProductCreationCenterData("user-a", "analysis-b"),
    ]);
    expect(productA.product.analysisHistoryId).toBe("analysis-a");
    expect(productB.product.analysisHistoryId).toBe("analysis-b");
    expect(productA.copywriting).toEqual([]);
    expect(productB.copywriting).toEqual([]);
  });
});
