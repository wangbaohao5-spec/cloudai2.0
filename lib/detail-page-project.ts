export const DETAIL_PAGE_PROJECT_VERSION = 2 as const;
export const DETAIL_PAGE_PROJECT_HISTORY_TYPE = "detail-page-project";
export const DETAIL_PAGE_MIN_SECTIONS = 3;
export const DETAIL_PAGE_MAX_SECTIONS = 8;

export const DETAIL_PAGE_MODULE_TYPES = [
  "HERO",
  "BENEFITS",
  "USAGE_SCENE",
  "PRODUCT_DETAIL",
  "USAGE_GUIDE",
  "BRAND_CONTENT",
  "SPECS",
] as const;

export type DetailPageModuleType = (typeof DETAIL_PAGE_MODULE_TYPES)[number];
export type DetailPageModuleKind = "Visual" | "Hybrid" | "Fact";
export type DetailPageReadiness = "READY" | "NEEDS_INPUT" | "EXISTING_ASSET" | "OPTIONAL";
export type DetailPageLifecycle = "PLANNED" | "GENERATING" | "COMPLETE" | "FAILED";
export type DetailPageStylePreset = "brand-site" | "ecommerce" | "minimal" | "xiaohongshu";
export type DetailPageEvidenceSourceType = "existing-asset" | "product-brief" | "product-image" | "user-confirmed";
export type DetailPageAssetSourceType = "detail-page" | "image-edit" | "image-set" | "original" | "product-image" | "scene-image";
export type DetailPageAssetRelationEvidence = "analysis-source-asset" | "history-analysis-id" | "history-source-asset";

export type DetailPageAssetCandidate = {
  assetId: string;
  assetType: string;
  createdAt: string;
  historyId: string | null;
  imageType: string | null;
  name: string;
  previewUrl: string | null;
  productRelationEvidence: DetailPageAssetRelationEvidence;
  sourceType: DetailPageAssetSourceType;
  suggestedModuleTypes: DetailPageModuleType[];
};

export type DetailPageEvidence = {
  field: string;
  sourceType: DetailPageEvidenceSourceType;
  value: string;
  verifiedByUser: boolean;
};

export type DetailPageSectionCopy = {
  body: string;
  headline: string;
};

export type DetailPageStyle = {
  lighting: string;
  mood: string;
  palette: string;
  preset: DetailPageStylePreset;
  spacing: string;
  typography: string;
};

export type DetailPageSectionV2 = {
  assetSource: DetailPageEvidenceSourceType | null;
  copy: DetailPageSectionCopy;
  evidence: DetailPageEvidence[];
  hidden: boolean;
  id: string;
  lastError: string | null;
  layout: string | null;
  lifecycle: DetailPageLifecycle;
  moduleType: DetailPageModuleType;
  order: number;
  purpose: string;
  readiness: DetailPageReadiness;
  reason: string;
  selectedAssetId: string | null;
};

export type DetailPageProjectV2 = {
  analysisHistoryId: string;
  createdAt: string;
  pageStyle: DetailPageStyle;
  projectId: string;
  revision: number;
  sections: DetailPageSectionV2[];
  updatedAt: string;
  userId: string;
  version: typeof DETAIL_PAGE_PROJECT_VERSION;
};

export type DetailPagePlanCandidateSection = {
  body?: unknown;
  headline?: unknown;
  moduleType?: unknown;
  purpose?: unknown;
  reason?: unknown;
};

export type DetailPagePlanCandidate = {
  pageStyle?: unknown;
  sections?: unknown;
};

export type DetailPageProjectOperation =
  | { direction: "down" | "up"; sectionId: string; type: "move-section" }
  | { moduleType: DetailPageModuleType; type: "add-section" }
  | { assetId: string; sectionId: string; type: "bind-asset" }
  | { moduleType: DetailPageModuleType; sectionId: string; type: "replace-module" }
  | { sectionId: string; type: "delete-section" }
  | { sectionId: string; type: "set-evidence"; value: string }
  | { sectionId: string; type: "unbind-asset" };

export const DETAIL_PAGE_ASSET_MODULE_TYPES: DetailPageModuleType[] = [
  "HERO",
  "BENEFITS",
  "USAGE_SCENE",
  "PRODUCT_DETAIL",
  "BRAND_CONTENT",
];

export const DETAIL_PAGE_MODULE_DEFINITIONS: Record<
  DetailPageModuleType,
  { defaultPurpose: string; defaultReason: string; evidenceField: string; inputLabel: string; kind: DetailPageModuleKind; label: string }
> = {
  HERO: {
    label: "首屏主视觉",
    kind: "Visual",
    defaultPurpose: "建立商品第一印象并明确页面主题。",
    defaultReason: "以真实商品图为基础组织首屏视觉。",
    evidenceField: "product-image",
    inputLabel: "商品视觉说明",
  },
  BENEFITS: {
    label: "核心卖点",
    kind: "Hybrid",
    defaultPurpose: "用经过确认的事实解释商品价值。",
    defaultReason: "核心卖点需要用户确认，不能直接采用 AI 推测。",
    evidenceField: "confirmed-benefits",
    inputLabel: "确认后的核心卖点",
  },
  USAGE_SCENE: {
    label: "使用场景",
    kind: "Visual",
    defaultPurpose: "展示商品适合出现的日常环境。",
    defaultReason: "以商品真实外观为基础规划场景视觉。",
    evidenceField: "product-image",
    inputLabel: "场景补充说明",
  },
  PRODUCT_DETAIL: {
    label: "商品细节",
    kind: "Visual",
    defaultPurpose: "展示可由参考素材证明的商品细节。",
    defaultReason: "单张主图未必足以证明局部结构，需要用户确认参考素材是否充分。",
    evidenceField: "detail-reference",
    inputLabel: "细节参考说明",
  },
  USAGE_GUIDE: {
    label: "使用建议",
    kind: "Hybrid",
    defaultPurpose: "提供有可靠依据的使用说明。",
    defaultReason: "使用方法不能由商品外观或 AI 分析自动推断。",
    evidenceField: "confirmed-usage-guide",
    inputLabel: "官方或人工确认的使用说明",
  },
  BRAND_CONTENT: {
    label: "品牌内容",
    kind: "Visual",
    defaultPurpose: "建立克制、可信的品牌内容氛围。",
    defaultReason: "只围绕商品可见品牌信息和真实视觉展开。",
    evidenceField: "product-image",
    inputLabel: "品牌内容说明",
  },
  SPECS: {
    label: "规格信息",
    kind: "Fact",
    defaultPurpose: "呈现用户确认的规格、容量或尺寸信息。",
    defaultReason: "规格属于事实信息，缺少人工确认时必须等待补充。",
    evidenceField: "confirmed-specs",
    inputLabel: "确认后的规格 / 容量",
  },
};

const DEFAULT_MODULE_ORDER: DetailPageModuleType[] = [
  "HERO",
  "BENEFITS",
  "USAGE_SCENE",
  "PRODUCT_DETAIL",
  "USAGE_GUIDE",
  "BRAND_CONTENT",
  "SPECS",
];

const STYLE_DEFAULTS: Record<DetailPageStylePreset, DetailPageStyle> = {
  ecommerce: {
    preset: "ecommerce",
    mood: "清晰可信",
    palette: "跟随商品主色，保持克制",
    lighting: "明亮自然",
    typography: "清晰的电商信息层级",
    spacing: "紧凑但保留呼吸感",
  },
  "brand-site": {
    preset: "brand-site",
    mood: "专业克制",
    palette: "中性品牌色",
    lighting: "柔和品牌光线",
    typography: "编辑感标题与简洁正文",
    spacing: "充足留白",
  },
  minimal: {
    preset: "minimal",
    mood: "极简安静",
    palette: "低饱和中性色",
    lighting: "柔和漫射光",
    typography: "短标题、少量正文",
    spacing: "宽松留白",
  },
  xiaohongshu: {
    preset: "xiaohongshu",
    mood: "自然日常",
    palette: "清爽生活化",
    lighting: "自然日光",
    typography: "轻内容感层级",
    spacing: "轻松有节奏",
  },
};

export class DetailPageProjectError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DetailPageProjectError";
    this.status = status;
  }
}

function createId() {
  return crypto.randomUUID();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function cleanText(value: unknown, limit = 600) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Boolean(value) && Number.isFinite(Date.parse(value));
}

export function isDetailPageModuleType(value: unknown): value is DetailPageModuleType {
  return typeof value === "string" && DETAIL_PAGE_MODULE_TYPES.includes(value as DetailPageModuleType);
}

export function isDetailPageStylePreset(value: unknown): value is DetailPageStylePreset {
  return value === "brand-site" || value === "ecommerce" || value === "minimal" || value === "xiaohongshu";
}

export function getDefaultDetailPageStyle(preset: DetailPageStylePreset = "ecommerce"): DetailPageStyle {
  return { ...STYLE_DEFAULTS[preset] };
}

function normalizePageStyle(value: unknown, fallbackPreset: DetailPageStylePreset): DetailPageStyle {
  const fallback = getDefaultDetailPageStyle(fallbackPreset);

  if (!isRecord(value)) {
    return fallback;
  }

  const preset = isDetailPageStylePreset(value.preset) ? value.preset : fallbackPreset;
  const presetDefaults = getDefaultDetailPageStyle(preset);

  return {
    preset,
    mood: cleanText(value.mood, 160) || presetDefaults.mood,
    palette: cleanText(value.palette, 160) || presetDefaults.palette,
    lighting: cleanText(value.lighting, 160) || presetDefaults.lighting,
    typography: cleanText(value.typography, 160) || presetDefaults.typography,
    spacing: cleanText(value.spacing, 160) || presetDefaults.spacing,
  };
}

function normalizeEvidence(value: unknown): DetailPageEvidence[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const evidence: DetailPageEvidence[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const sourceType = item.sourceType;
    if (sourceType !== "existing-asset" && sourceType !== "product-brief" && sourceType !== "product-image" && sourceType !== "user-confirmed") {
      return null;
    }

    const field = cleanText(item.field, 120);
    const evidenceValue = cleanText(item.value, 1200);
    if (!field || !evidenceValue || typeof item.verifiedByUser !== "boolean") {
      return null;
    }

    evidence.push({ field, sourceType, value: evidenceValue, verifiedByUser: item.verifiedByUser });
  }

  return evidence;
}

function hasProductImage(evidence: DetailPageEvidence[]) {
  return evidence.some((item) => item.sourceType === "product-image" || item.sourceType === "existing-asset");
}

function hasVerifiedEvidence(evidence: DetailPageEvidence[], field?: string) {
  return evidence.some((item) => item.verifiedByUser && item.value && (!field || item.field === field));
}

export function canBindExistingAssetToModule(moduleType: DetailPageModuleType) {
  return DETAIL_PAGE_ASSET_MODULE_TYPES.includes(moduleType);
}

export function evaluateDetailPageReadiness(
  moduleType: DetailPageModuleType,
  evidence: DetailPageEvidence[],
  selectedAssetId: string | null = null,
): DetailPageReadiness {
  const hasExistingAsset = Boolean(selectedAssetId) || evidence.some((item) => item.sourceType === "existing-asset");

  if (moduleType === "HERO" || moduleType === "USAGE_SCENE" || moduleType === "BRAND_CONTENT") {
    if (hasExistingAsset) return "EXISTING_ASSET";
    return hasProductImage(evidence) ? "READY" : "NEEDS_INPUT";
  }

  if (moduleType === "PRODUCT_DETAIL") {
    if (hasExistingAsset) return "EXISTING_ASSET";
    return hasVerifiedEvidence(evidence, DETAIL_PAGE_MODULE_DEFINITIONS.PRODUCT_DETAIL.evidenceField) ? "READY" : "NEEDS_INPUT";
  }

  const hasRequiredEvidence = hasVerifiedEvidence(evidence, DETAIL_PAGE_MODULE_DEFINITIONS[moduleType].evidenceField);

  if (!hasRequiredEvidence) return "NEEDS_INPUT";
  if (moduleType === "BENEFITS" && hasExistingAsset) return "EXISTING_ASSET";
  return "READY";
}

export function evaluateDetailPageLifecycle(
  moduleType: DetailPageModuleType,
  readiness: DetailPageReadiness,
  selectedAssetId: string | null,
): DetailPageLifecycle {
  if (!selectedAssetId || readiness === "NEEDS_INPUT") {
    return "PLANNED";
  }

  return canBindExistingAssetToModule(moduleType) ? "COMPLETE" : "PLANNED";
}

export function getDetailPageSectionEffectiveState(section: DetailPageSectionV2, selectedAssetAvailable: boolean) {
  const selectedAssetId = section.selectedAssetId && selectedAssetAvailable ? section.selectedAssetId : null;
  const readiness = evaluateDetailPageReadiness(section.moduleType, section.evidence, selectedAssetId);

  return {
    lifecycle: evaluateDetailPageLifecycle(section.moduleType, readiness, selectedAssetId),
    readiness,
  };
}

function getInitialEvidence(moduleType: DetailPageModuleType, sourceAssetId?: string | null): DetailPageEvidence[] {
  if (!sourceAssetId) {
    return [];
  }

  return [
    {
      sourceType: "product-image",
      field: "sourceAssetId",
      value: sourceAssetId,
      verifiedByUser: false,
    },
  ];
}

function createSection(
  moduleType: DetailPageModuleType,
  order: number,
  options: { body?: unknown; headline?: unknown; idFactory: () => string; purpose?: unknown; reason?: unknown; sourceAssetId?: string | null },
): DetailPageSectionV2 {
  const definition = DETAIL_PAGE_MODULE_DEFINITIONS[moduleType];
  const evidence = getInitialEvidence(moduleType, options.sourceAssetId);

  return {
    id: options.idFactory(),
    moduleType,
    order,
    purpose: cleanText(options.purpose) || definition.defaultPurpose,
    reason: cleanText(options.reason) || definition.defaultReason,
    readiness: evaluateDetailPageReadiness(moduleType, evidence),
    lifecycle: "PLANNED",
    evidence,
    copy: {
      headline: cleanText(options.headline, 200),
      body: cleanText(options.body, 800),
    },
    selectedAssetId: null,
    assetSource: null,
    layout: null,
    hidden: false,
    lastError: null,
  };
}

function clampSectionCount(value: number) {
  if (!Number.isFinite(value)) {
    return 7;
  }

  return Math.max(5, Math.min(DETAIL_PAGE_MAX_SECTIONS, Math.round(value)));
}

function getFallbackModuleTypes(targetCount: number) {
  const moduleTypes = DEFAULT_MODULE_ORDER.slice(0, Math.min(targetCount, DEFAULT_MODULE_ORDER.length));

  while (moduleTypes.length < targetCount) {
    moduleTypes.push("PRODUCT_DETAIL");
  }

  return moduleTypes;
}

function normalizeCandidateSections(value: unknown, targetCount: number) {
  const candidates = Array.isArray(value) ? value.filter(isRecord).slice(0, DETAIL_PAGE_MAX_SECTIONS) : [];
  const normalized: Array<{ body?: unknown; headline?: unknown; moduleType: DetailPageModuleType; purpose?: unknown; reason?: unknown }> = [];
  const missing = [...DEFAULT_MODULE_ORDER];

  for (const candidate of candidates) {
    if (!isDetailPageModuleType(candidate.moduleType)) {
      continue;
    }

    const duplicateIndex = normalized.findIndex((item) => item.moduleType === candidate.moduleType);
    let moduleType = candidate.moduleType;

    if (duplicateIndex >= 0 && missing.length) {
      moduleType = missing[0];
    }

    const missingIndex = missing.indexOf(moduleType);
    if (missingIndex >= 0) {
      missing.splice(missingIndex, 1);
    }

    normalized.push({
      moduleType,
      purpose: candidate.purpose,
      reason: candidate.reason,
      headline: candidate.headline,
      body: candidate.body,
    });

    if (normalized.length === targetCount) {
      break;
    }
  }

  for (const moduleType of getFallbackModuleTypes(targetCount)) {
    if (normalized.length === targetCount) {
      break;
    }

    if (!normalized.some((item) => item.moduleType === moduleType) || normalized.length >= DEFAULT_MODULE_ORDER.length) {
      normalized.push({ moduleType });
    }
  }

  return normalized.slice(0, targetCount);
}

export function createDetailPageProject({
  analysisHistoryId,
  candidate,
  now = new Date(),
  preset = "ecommerce",
  projectId,
  sectionCount = 7,
  sourceAssetId,
  userId,
  idFactory = createId,
}: {
  analysisHistoryId: string;
  candidate?: DetailPagePlanCandidate | null;
  idFactory?: () => string;
  now?: Date;
  preset?: DetailPageStylePreset;
  projectId: string;
  sectionCount?: number;
  sourceAssetId?: string | null;
  userId: string;
}): DetailPageProjectV2 {
  const targetCount = clampSectionCount(sectionCount);
  const candidateRecord = isRecord(candidate) ? candidate : {};
  const normalizedSections = normalizeCandidateSections(candidateRecord.sections, targetCount);
  const timestamp = now.toISOString();

  return {
    version: DETAIL_PAGE_PROJECT_VERSION,
    projectId,
    revision: 1,
    userId,
    analysisHistoryId,
    pageStyle: normalizePageStyle(candidateRecord.pageStyle, preset),
    sections: normalizedSections.map((section, index) =>
      createSection(section.moduleType, index + 1, {
        ...section,
        idFactory,
        sourceAssetId,
      }),
    ),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createFallbackDetailPageProject(input: Omit<Parameters<typeof createDetailPageProject>[0], "candidate">) {
  return createDetailPageProject({ ...input, candidate: null });
}

export function parseDetailPageProject(value: unknown, expected?: { analysisHistoryId?: string; userId?: string }): DetailPageProjectV2 | null {
  if (!isRecord(value) || value.version !== DETAIL_PAGE_PROJECT_VERSION) {
    return null;
  }

  const projectId = cleanText(value.projectId, 200);
  const userId = cleanText(value.userId, 200);
  const analysisHistoryId = cleanText(value.analysisHistoryId, 200);
  const revision = Number(value.revision);

  if (
    !projectId ||
    !userId ||
    !analysisHistoryId ||
    !Number.isInteger(revision) ||
    revision < 1 ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.updatedAt) ||
    (expected?.userId && expected.userId !== userId) ||
    (expected?.analysisHistoryId && expected.analysisHistoryId !== analysisHistoryId) ||
    !Array.isArray(value.sections) ||
    value.sections.length < DETAIL_PAGE_MIN_SECTIONS ||
    value.sections.length > DETAIL_PAGE_MAX_SECTIONS
  ) {
    return null;
  }

  const sectionIds = new Set<string>();
  const sections: DetailPageSectionV2[] = [];

  for (const [index, rawSection] of value.sections.entries()) {
    if (!isRecord(rawSection) || !isDetailPageModuleType(rawSection.moduleType)) {
      return null;
    }

    const id = cleanText(rawSection.id, 200);
    const evidence = normalizeEvidence(rawSection.evidence);
    const copy = isRecord(rawSection.copy) ? rawSection.copy : null;
    const lifecycle = rawSection.lifecycle;
    const readiness = rawSection.readiness;

    if (
      !id ||
      sectionIds.has(id) ||
      !evidence ||
      !copy ||
      (lifecycle !== "PLANNED" && lifecycle !== "GENERATING" && lifecycle !== "COMPLETE" && lifecycle !== "FAILED") ||
      (readiness !== "READY" && readiness !== "NEEDS_INPUT" && readiness !== "EXISTING_ASSET" && readiness !== "OPTIONAL") ||
      typeof rawSection.hidden !== "boolean"
    ) {
      return null;
    }

    sectionIds.add(id);
    sections.push({
      id,
      moduleType: rawSection.moduleType,
      order: index + 1,
      purpose: cleanText(rawSection.purpose),
      reason: cleanText(rawSection.reason),
      readiness,
      lifecycle,
      evidence,
      copy: {
        headline: cleanText(copy.headline, 200),
        body: cleanText(copy.body, 800),
      },
      selectedAssetId: typeof rawSection.selectedAssetId === "string" ? cleanText(rawSection.selectedAssetId, 200) || null : null,
      assetSource:
        rawSection.assetSource === "existing-asset" ||
        rawSection.assetSource === "product-brief" ||
        rawSection.assetSource === "product-image" ||
        rawSection.assetSource === "user-confirmed"
          ? rawSection.assetSource
          : null,
      layout: typeof rawSection.layout === "string" ? cleanText(rawSection.layout, 120) || null : null,
      hidden: rawSection.hidden,
      lastError: typeof rawSection.lastError === "string" ? cleanText(rawSection.lastError, 300) || null : null,
    });
  }

  return {
    version: DETAIL_PAGE_PROJECT_VERSION,
    projectId,
    revision,
    userId,
    analysisHistoryId,
    pageStyle: normalizePageStyle(value.pageStyle, "ecommerce"),
    sections,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function parseDetailPageProjectOperation(value: unknown): DetailPageProjectOperation | null {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null;
  }

  const sectionId = cleanText(value.sectionId, 200);

  if (value.type === "move-section" && sectionId && (value.direction === "up" || value.direction === "down")) {
    return { type: "move-section", sectionId, direction: value.direction };
  }

  if (value.type === "delete-section" && sectionId) {
    return { type: "delete-section", sectionId };
  }

  if (value.type === "add-section" && isDetailPageModuleType(value.moduleType)) {
    return { type: "add-section", moduleType: value.moduleType };
  }

  if (value.type === "replace-module" && sectionId && isDetailPageModuleType(value.moduleType)) {
    return { type: "replace-module", sectionId, moduleType: value.moduleType };
  }

  if (value.type === "bind-asset" && sectionId) {
    const assetId = cleanText(value.assetId, 200);
    return assetId ? { type: "bind-asset", sectionId, assetId } : null;
  }

  if (value.type === "unbind-asset" && sectionId) {
    return { type: "unbind-asset", sectionId };
  }

  if (value.type === "set-evidence" && sectionId && typeof value.value === "string") {
    return { type: "set-evidence", sectionId, value: cleanText(value.value, 1200) };
  }

  return null;
}

function normalizeSectionOrder(sections: DetailPageSectionV2[]) {
  return sections.map((section, index) => ({ ...section, order: index + 1 }));
}

export function applyDetailPageProjectOperation(
  project: DetailPageProjectV2,
  operation: DetailPageProjectOperation,
  options: { idFactory?: () => string; now?: Date } = {},
) {
  const idFactory = options.idFactory || createId;
  const sectionIndex = "sectionId" in operation ? project.sections.findIndex((section) => section.id === operation.sectionId) : -1;
  const sections = [...project.sections];

  if ("sectionId" in operation && sectionIndex < 0) {
    throw new DetailPageProjectError("详情页模块不存在。", 404);
  }

  if (operation.type === "move-section") {
    const nextIndex = operation.direction === "up" ? sectionIndex - 1 : sectionIndex + 1;
    if (nextIndex >= 0 && nextIndex < sections.length) {
      [sections[sectionIndex], sections[nextIndex]] = [sections[nextIndex], sections[sectionIndex]];
    }
  } else if (operation.type === "delete-section") {
    if (sections.length <= DETAIL_PAGE_MIN_SECTIONS) {
      throw new DetailPageProjectError(`详情页至少保留 ${DETAIL_PAGE_MIN_SECTIONS} 个模块。`);
    }
    sections.splice(sectionIndex, 1);
  } else if (operation.type === "add-section") {
    if (sections.length >= DETAIL_PAGE_MAX_SECTIONS) {
      throw new DetailPageProjectError(`详情页最多支持 ${DETAIL_PAGE_MAX_SECTIONS} 个模块。`);
    }
    sections.push(
      createSection(operation.moduleType, sections.length + 1, {
        idFactory,
        sourceAssetId: project.sections[0]?.evidence.find((item) => item.sourceType === "product-image")?.value,
      }),
    );
  } else if (operation.type === "replace-module") {
    const replacement = createSection(operation.moduleType, sections[sectionIndex].order, {
      idFactory: () => sections[sectionIndex].id,
      sourceAssetId: sections[sectionIndex].evidence.find((item) => item.sourceType === "product-image")?.value,
    });
    sections[sectionIndex] = replacement;
  } else if (operation.type === "bind-asset") {
    const section = sections[sectionIndex];

    if (!canBindExistingAssetToModule(section.moduleType)) {
      throw new DetailPageProjectError("当前模块不支持绑定图片素材。", 400);
    }

    const readiness = evaluateDetailPageReadiness(section.moduleType, section.evidence, operation.assetId);
    sections[sectionIndex] = {
      ...section,
      selectedAssetId: operation.assetId,
      assetSource: "existing-asset",
      readiness,
      lifecycle: evaluateDetailPageLifecycle(section.moduleType, readiness, operation.assetId),
      lastError: null,
    };
  } else if (operation.type === "unbind-asset") {
    const section = sections[sectionIndex];
    const readiness = evaluateDetailPageReadiness(section.moduleType, section.evidence, null);
    sections[sectionIndex] = {
      ...section,
      selectedAssetId: null,
      assetSource: null,
      readiness,
      lifecycle: "PLANNED",
      lastError: null,
    };
  } else if (operation.type === "set-evidence") {
    const section = sections[sectionIndex];
    const evidenceField = DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType].evidenceField;
    const evidence = section.evidence.filter((item) => !(item.sourceType === "user-confirmed" && item.field === evidenceField));

    if (operation.value) {
      evidence.push({
        sourceType: "user-confirmed",
        field: evidenceField,
        value: operation.value,
        verifiedByUser: true,
      });
    }

    const readiness = evaluateDetailPageReadiness(section.moduleType, evidence, section.selectedAssetId);
    sections[sectionIndex] = {
      ...section,
      evidence,
      readiness,
      lifecycle: evaluateDetailPageLifecycle(section.moduleType, readiness, section.selectedAssetId),
      lastError: null,
    };
  }

  return {
    ...project,
    sections: normalizeSectionOrder(sections),
    updatedAt: (options.now || new Date()).toISOString(),
  };
}
