import { ApiError } from "@/lib/api-errors";
import { DETAIL_PAGE_MODULE_DEFINITIONS, type DetailPageSectionV2, type DetailPageStylePreset } from "@/lib/detail-page-project";
import {
  DETAIL_PAGE_EXPORT_FORMAT,
  DETAIL_PAGE_EXPORT_LIMITS,
  DETAIL_PAGE_EXPORT_QUALITY,
} from "@/lib/detail-page-export";
import { getDetailPageMediaRole, getDetailPageStyleRole } from "@/lib/detail-page-preview";
import sharp from "sharp";

type RenderBox = { height: number; width: number; x: number; y: number };

export type DetailPageSectionRenderPlan = {
  copy: RenderBox;
  height: number;
  media: RenderBox | null;
  mediaRole: ReturnType<typeof getDetailPageMediaRole>;
};

export type RenderedDetailPageSection = {
  buffer: Buffer;
  channels: 1 | 2 | 3 | 4;
  height: number;
  sectionId: string;
  width: number;
};

export type DetailPageSectionRenderTiming = {
  assetMetadataMs: number;
  imageDecodeMs: number;
  sectionLayoutMs: number;
  sectionRenderMs: number;
  textSvgBuildMs: number;
};

export type DetailPageCompositeTiming = {
  fullCompositeMs: number;
  fullJpegEncodeMs: number;
};

const WIDTH = DETAIL_PAGE_EXPORT_LIMITS.width;
const FONT_FAMILY = "Arial, Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif";

const SECTION_HEIGHTS: Record<DetailPageSectionV2["moduleType"], Record<string, number>> = {
  HERO: { FULL_VISUAL: 1_000, SPLIT: 760 },
  BENEFITS: { TEXT_LED: 520, SPLIT: 680 },
  USAGE_SCENE: { FULL_VISUAL: 860, SPLIT: 720 },
  PRODUCT_DETAIL: { SINGLE_DETAIL: 820, SPLIT_DETAIL: 720 },
  USAGE_GUIDE: { TEXT_LED: 500, STEP_TEXT: 560 },
  BRAND_CONTENT: { FULL_VISUAL: 860, EDITORIAL_SPLIT: 720 },
  SPECS: { SIMPLE_FACTS: 460, TWO_COLUMN_FACTS: 520 },
};

export function escapeDetailPageSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function charUnits(character: string) {
  return /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(character) ? 1 : 0.56;
}

export function wrapDetailPageText(value: string, maxUnits: number, maxLines: number) {
  const lines: string[] = [];

  for (const paragraph of value.replace(/\r/g, "").split("\n")) {
    let line = "";
    let units = 0;

    for (const character of paragraph.trim()) {
      const nextUnits = charUnits(character);
      if (line && units + nextUnits > maxUnits) {
        lines.push(line.trimEnd());
        line = "";
        units = 0;
      }
      line += character;
      units += nextUnits;
    }

    if (line || !paragraph) lines.push(line.trimEnd());
  }

  if (lines.length > maxLines) {
    throw new ApiError("模块文案超出当前版式可安全呈现的范围，请精简后重试。", 422);
  }

  return lines;
}

export function getDetailPageSectionRenderPlan(section: DetailPageSectionV2): DetailPageSectionRenderPlan {
  const height = SECTION_HEIGHTS[section.moduleType][section.layout];
  if (!height || height > DETAIL_PAGE_EXPORT_LIMITS.maxSectionHeight) {
    throw new ApiError("详情页模块版式不受支持。", 422);
  }

  const mediaRole = getDetailPageMediaRole(section.moduleType);

  if (section.moduleType === "PRODUCT_DETAIL" && section.layout === "SINGLE_DETAIL") {
    return {
      height: 760,
      mediaRole,
      media: { x: 180, y: 48, width: 840, height: 430 },
      copy: { x: 0, y: 510, width: WIDTH, height: 250 },
    };
  }

  if (section.moduleType === "PRODUCT_DETAIL" && section.layout === "SPLIT_DETAIL") {
    return {
      height,
      mediaRole,
      media: { x: 60, y: 60, width: 520, height: height - 120 },
      copy: { x: 620, y: 0, width: 580, height },
    };
  }

  if (["SPLIT", "SPLIT_DETAIL", "EDITORIAL_SPLIT"].includes(section.layout)) {
    return {
      height,
      mediaRole,
      media: { x: 0, y: 0, width: 660, height },
      copy: { x: 660, y: 0, width: 540, height },
    };
  }

  if (["FULL_VISUAL", "SINGLE_DETAIL"].includes(section.layout)) {
    const mediaHeight = Math.round(height * 0.68);
    return {
      height,
      mediaRole,
      media: { x: 0, y: 0, width: WIDTH, height: mediaHeight },
      copy: { x: 0, y: mediaHeight, width: WIDTH, height: height - mediaHeight },
    };
  }

  return {
    height,
    mediaRole,
    media: null,
    copy: { x: 0, y: 0, width: WIDTH, height },
  };
}

function renderTextSvg(section: DetailPageSectionV2, box: RenderBox, preset: DetailPageStylePreset) {
  const style = getDetailPageStyleRole(preset);
  const padding = box.width < 600 ? 64 : 84;
  const contentWidth = box.width - padding * 2;
  const headline = section.copy.headline.trim() || DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType].label;
  const body = section.copy.body.trim() || section.purpose;
  const headlineSize = box.width < 600 ? 48 : 58;
  const bodySize = box.width < 600 ? 26 : 29;
  const headlineLines = wrapDetailPageText(headline, contentWidth / headlineSize, 3);
  const availableBodyHeight = box.height - padding * 2 - 36 - headlineLines.length * Math.round(headlineSize * 1.16) - 34;
  const bodyLineHeight = Math.round(bodySize * 1.62);
  const bodyLines = wrapDetailPageText(body, contentWidth / bodySize, Math.max(2, Math.floor(availableBodyHeight / bodyLineHeight)));
  const headlineY = padding + 58;
  const bodyY = headlineY + headlineLines.length * Math.round(headlineSize * 1.16) + 28;
  const textLines = (lines: string[], x: number, y: number, lineHeight: number) => lines
    .map((line, index) => `<tspan x="${x}" y="${y + index * lineHeight}">${escapeDetailPageSvgText(line)}</tspan>`)
    .join("");

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}">
      <rect width="100%" height="100%" fill="${style.surface}"/>
      <text x="${padding}" y="${padding}" fill="${style.accent}" font-family="${FONT_FAMILY}" font-size="18" font-weight="700">${escapeDetailPageSvgText(DETAIL_PAGE_MODULE_DEFINITIONS[section.moduleType].label)}</text>
      <text fill="${style.text}" font-family="${FONT_FAMILY}" font-size="${headlineSize}" font-weight="650">${textLines(headlineLines, padding, headlineY, Math.round(headlineSize * 1.16))}</text>
      <text fill="${style.muted}" font-family="${FONT_FAMILY}" font-size="${bodySize}" font-weight="400">${textLines(bodyLines, padding, bodyY, bodyLineHeight)}</text>
    </svg>
  `);
}

async function renderMedia(source: Buffer, box: RenderBox, preset: DetailPageStylePreset) {
  if (source.byteLength > DETAIL_PAGE_EXPORT_LIMITS.maxSourceBytes) {
    throw new ApiError("素材文件过大，暂时无法安全导出。", 413);
  }

  const metadataStartedAt = performance.now();
  const image = sharp(source, { failOn: "error", limitInputPixels: DETAIL_PAGE_EXPORT_LIMITS.maxSourceDimension ** 2 });
  const metadata = await image.metadata();
  const assetMetadataMs = performance.now() - metadataStartedAt;
  if (!metadata.width || !metadata.height || metadata.width > DETAIL_PAGE_EXPORT_LIMITS.maxSourceDimension || metadata.height > DETAIL_PAGE_EXPORT_LIMITS.maxSourceDimension) {
    throw new ApiError("素材尺寸超出安全导出范围。", 413);
  }

  const style = getDetailPageStyleRole(preset);
  const decodeStartedAt = performance.now();
  const rendered = await image
    .rotate()
    .resize({ width: box.width, height: box.height, fit: "contain", background: style.surfaceAlt, withoutEnlargement: true })
    .flatten({ background: style.surfaceAlt })
    .ensureAlpha(1)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    assetMetadataMs,
    imageDecodeMs: performance.now() - decodeStartedAt,
    rendered,
  };
}

export async function renderDetailPageSection({
  assetBuffer,
  onTiming,
  pageStyle,
  section,
}: {
  assetBuffer: Buffer | null;
  onTiming?: (timing: DetailPageSectionRenderTiming) => void;
  pageStyle: DetailPageStylePreset;
  section: DetailPageSectionV2;
}): Promise<RenderedDetailPageSection> {
  const layoutStartedAt = performance.now();
  const plan = getDetailPageSectionRenderPlan(section);
  const style = getDetailPageStyleRole(pageStyle);
  const sectionLayoutMs = performance.now() - layoutStartedAt;
  const composites: sharp.OverlayOptions[] = [];
  let assetMetadataMs = 0;
  let imageDecodeMs = 0;

  if (plan.media) {
    if (!assetBuffer) throw new ApiError("模块素材不可用，请重新选择后再导出。", 409);
    const media = await renderMedia(assetBuffer, plan.media, pageStyle);
    assetMetadataMs = media.assetMetadataMs;
    imageDecodeMs = media.imageDecodeMs;
    composites.push({
      input: media.rendered.data,
      raw: {
        width: media.rendered.info.width,
        height: media.rendered.info.height,
        channels: media.rendered.info.channels,
      },
      left: plan.media.x,
      top: plan.media.y,
    });
  }

  const textStartedAt = performance.now();
  const textSvg = renderTextSvg(section, plan.copy, pageStyle);
  const textSvgBuildMs = performance.now() - textStartedAt;
  composites.push({ input: textSvg, left: plan.copy.x, top: plan.copy.y });

  const renderStartedAt = performance.now();
  const rendered = await sharp({
    create: { width: WIDTH, height: plan.height, channels: 3, background: style.background },
  })
    .composite(composites)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sectionRenderMs = performance.now() - renderStartedAt;

  onTiming?.({ assetMetadataMs, imageDecodeMs, sectionLayoutMs, sectionRenderMs, textSvgBuildMs });

  return {
    buffer: rendered.data,
    channels: rendered.info.channels,
    height: plan.height,
    sectionId: section.id,
    width: WIDTH,
  };
}

export async function encodeDetailPageSection(section: RenderedDetailPageSection) {
  return sharp(section.buffer, { raw: { width: section.width, height: section.height, channels: section.channels } })
    .jpeg({ quality: DETAIL_PAGE_EXPORT_QUALITY, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();
}

export function validateDetailPageCompositeBudget(sections: Array<{ height: number }>) {
  const totalHeight = sections.reduce((sum, section) => sum + section.height, 0);
  const totalPixels = totalHeight * WIDTH;

  if (sections.length > DETAIL_PAGE_EXPORT_LIMITS.maxSections) throw new ApiError("详情页模块数量超出安全导出范围。", 413);
  if (sections.some((section) => section.height > DETAIL_PAGE_EXPORT_LIMITS.maxSectionHeight)) throw new ApiError("详情页模块高度超出安全导出范围。", 413);
  if (totalHeight > DETAIL_PAGE_EXPORT_LIMITS.maxTotalHeight || totalPixels > DETAIL_PAGE_EXPORT_LIMITS.maxTotalPixels) {
    throw new ApiError("详情页总尺寸超出安全导出范围，请减少模块后重试。", 413);
  }

  return { totalHeight, totalPixels };
}

export async function composeDetailPageExport(
  sections: RenderedDetailPageSection[],
  preset: DetailPageStylePreset,
  onTiming?: (timing: DetailPageCompositeTiming) => void,
) {
  const { totalHeight } = validateDetailPageCompositeBudget(sections);
  const style = getDetailPageStyleRole(preset);
  let top = 0;
  const composites = sections.map((section) => {
    const input = {
      input: section.buffer,
      raw: { width: section.width, height: section.height, channels: section.channels },
      left: 0,
      top,
    };
    top += section.height;
    return input;
  });

  const compositeStartedAt = performance.now();
  const composite = await sharp({ create: { width: WIDTH, height: totalHeight, channels: 3, background: style.background } })
    .composite(composites)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const fullCompositeMs = performance.now() - compositeStartedAt;
  const encodeStartedAt = performance.now();
  const output = await sharp(composite.data, { raw: { width: WIDTH, height: totalHeight, channels: composite.info.channels } })
    .jpeg({ quality: DETAIL_PAGE_EXPORT_QUALITY, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();
  onTiming?.({ fullCompositeMs, fullJpegEncodeMs: performance.now() - encodeStartedAt });
  return output;
}

export function getDetailPageExportContentType() {
  return DETAIL_PAGE_EXPORT_FORMAT === "jpeg" ? "image/jpeg" : "application/octet-stream";
}
