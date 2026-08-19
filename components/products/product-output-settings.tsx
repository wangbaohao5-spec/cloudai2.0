"use client";

import {
  DEFAULT_PRODUCT_OUTPUT_SETTINGS,
  getProductOutputSettingsFromSession,
  getProductOutputSettingsSessionKey,
  PRODUCT_OUTPUT_LANGUAGE_OPTIONS,
  PRODUCT_OUTPUT_MARKET_OPTIONS,
  PRODUCT_OUTPUT_PLATFORM_OPTIONS,
  PRODUCT_OUTPUT_RATIO_OPTIONS,
} from "@/lib/product-output-settings";
import type { ProductOutputSettings } from "@/lib/product-types";
import { useEffect, useState } from "react";

type ProductOutputSettingsProps = {
  analysisHistoryId?: string;
  onSettingsChange?: (settings: ProductOutputSettings) => void;
};

type OptionGroup = {
  key: keyof ProductOutputSettings;
  label: string;
  options: ReadonlyArray<{ label: string; value: string }>;
};

const optionGroups: OptionGroup[] = [
  { key: "targetPlatform", label: "目标平台", options: PRODUCT_OUTPUT_PLATFORM_OPTIONS },
  { key: "targetMarket", label: "目标市场", options: PRODUCT_OUTPUT_MARKET_OPTIONS },
  { key: "outputLanguage", label: "输出语言", options: PRODUCT_OUTPUT_LANGUAGE_OPTIONS },
  { key: "outputRatio", label: "输出比例", options: PRODUCT_OUTPUT_RATIO_OPTIONS },
];

const summaryLabels: Record<keyof ProductOutputSettings, Record<string, string>> = {
  targetPlatform: {
    amazon: "Amazon",
    douyin: "抖音电商",
    general: "通用电商",
    "independent-site": "独立站",
    jd: "京东",
    pinduoduo: "拼多多",
    shopee: "Shopee",
    taobao: "淘宝平台",
    "tiktok-shop": "TikTok Shop",
    xiaohongshu: "小红书",
  },
  targetMarket: {
    china: "中国市场",
    europe: "欧洲市场",
    global: "全球市场",
    japan: "日本市场",
    "north-america": "北美市场",
    "southeast-asia": "东南亚市场",
  },
  outputLanguage: {
    "zh-CN": "中文输出",
    en: "英文输出",
    ja: "日文输出",
  },
  outputRatio: {
    "1:1": "1:1 方图",
    "3:4": "3:4 商品图",
    "4:5": "4:5 竖图",
    "16:9": "16:9 横图",
  },
};

const compactLabels: Record<keyof ProductOutputSettings, Record<string, string>> = {
  targetPlatform: {
    amazon: "Amazon",
    douyin: "抖音",
    general: "通用",
    "independent-site": "独立站",
    jd: "京东",
    pinduoduo: "拼多多",
    shopee: "Shopee",
    taobao: "淘宝",
    "tiktok-shop": "TikTok Shop",
    xiaohongshu: "小红书",
  },
  targetMarket: {
    china: "中国",
    europe: "欧洲",
    global: "全球",
    japan: "日本",
    "north-america": "北美",
    "southeast-asia": "东南亚",
  },
  outputLanguage: {
    "zh-CN": "中文",
    en: "English",
    ja: "日本語",
  },
  outputRatio: {
    "1:1": "1:1",
    "3:4": "3:4",
    "4:5": "4:5",
    "16:9": "16:9",
  },
};

const settingCards: Array<{ key: keyof ProductOutputSettings; label: string }> = [
  { key: "targetPlatform", label: "平台" },
  { key: "targetMarket", label: "市场" },
  { key: "outputLanguage", label: "语言" },
  { key: "outputRatio", label: "比例" },
];

function getSummaryLabel(settings: ProductOutputSettings, key: keyof ProductOutputSettings) {
  return summaryLabels[key][settings[key]] || settings[key];
}

function getCompactLabel(settings: ProductOutputSettings, key: keyof ProductOutputSettings) {
  return compactLabels[key][settings[key]] || settings[key];
}

function formatReadableSummary(settings: ProductOutputSettings) {
  return settingCards.map((item) => getSummaryLabel(settings, item.key)).join(" · ");
}

function getLanguageNotice(settings: ProductOutputSettings) {
  if (settings.outputLanguage === "en") {
    return "当前选择为英文输出，后续文案和图片中的文字会尽量使用英文。";
  }

  if (settings.outputLanguage === "ja") {
    return "当前选择为日文输出，后续文案和图片中的文字会尽量使用日文。";
  }

  return "";
}

export function ProductOutputSettingsEditor({ analysisHistoryId, onSettingsChange }: ProductOutputSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState<ProductOutputSettings>(DEFAULT_PRODUCT_OUTPUT_SETTINGS);
  const languageNotice = getLanguageNotice(settings);

  useEffect(() => {
    const nextSettings = getProductOutputSettingsFromSession(analysisHistoryId) || DEFAULT_PRODUCT_OUTPUT_SETTINGS;

    setSettings(nextSettings);
    onSettingsChange?.(nextSettings);
  }, [analysisHistoryId, onSettingsChange]);

  function saveSettings(nextSettings: ProductOutputSettings) {
    setSettings(nextSettings);
    onSettingsChange?.(nextSettings);

    const storageKey = getProductOutputSettingsSessionKey(analysisHistoryId);

    if (storageKey) {
      sessionStorage.setItem(storageKey, JSON.stringify(nextSettings));
    }
  }

  function updateSetting(key: keyof ProductOutputSettings, value: string) {
    saveSettings({
      ...settings,
      [key]: value,
    });
  }

  return (
    <section className="product-output-settings">
      <div className="product-output-settings-summary">
        <div>
          <h3>发布目标</h3>
          <strong>{formatReadableSummary(settings)}</strong>
          <p>这些设置会影响商品文案、套图、详情页和图片素材的语言、平台风格与画面比例。</p>
        </div>
        <button className="button secondary" type="button" onClick={() => setIsEditing((current) => !current)}>
          {isEditing ? "收起" : "修改"}
        </button>
      </div>

      <div className="product-output-settings-cards" aria-label="当前发布目标">
        {settingCards.map((item) => (
          <span key={item.key}>
            <em>{item.label}</em>
            <strong>{getCompactLabel(settings, item.key)}</strong>
          </span>
        ))}
      </div>

      {languageNotice ? <p className="product-output-settings-notice">{languageNotice}</p> : null}

      {isEditing ? (
        <div className="product-output-settings-groups">
          {optionGroups.map((group) => (
            <fieldset className="product-output-settings-group" key={group.key}>
              <legend>{group.label}</legend>
              <div className="product-output-settings-options">
                {group.options.map((option) => (
                  <button
                    className={settings[group.key] === option.value ? "active" : undefined}
                    key={option.value}
                    type="button"
                    onClick={() => updateSetting(group.key, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}
    </section>
  );
}
