"use client";

import {
  DEFAULT_PRODUCT_OUTPUT_SETTINGS,
  formatProductOutputSettingsSummary,
  getProductOutputSettingsCompactLabel,
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

const settingCards: Array<{ key: keyof ProductOutputSettings; label: string }> = [
  { key: "targetPlatform", label: "平台" },
  { key: "targetMarket", label: "市场" },
  { key: "outputLanguage", label: "语言" },
  { key: "outputRatio", label: "比例" },
];

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
    <section className="product-output-settings cai-card cai-card--compact">
      <div className="product-output-settings-summary">
        <div>
          <h3>发布目标</h3>
          <strong>{formatProductOutputSettingsSummary(settings)}</strong>
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
            <strong>{getProductOutputSettingsCompactLabel(settings, item.key)}</strong>
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
