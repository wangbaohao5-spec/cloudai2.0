"use client";

import {
  DEFAULT_PRODUCT_OUTPUT_SETTINGS,
  formatProductOutputSettingsSummary,
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

export function ProductOutputSettingsEditor({ analysisHistoryId, onSettingsChange }: ProductOutputSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState<ProductOutputSettings>(DEFAULT_PRODUCT_OUTPUT_SETTINGS);

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
          <p className="eyebrow">Output Settings</p>
          <h3>输出设置</h3>
          <strong>{formatProductOutputSettingsSummary(settings)}</strong>
          <p>这些设置会影响文案、套图、详情页和图片素材的生成方向。</p>
        </div>
        <button className="button secondary" type="button" onClick={() => setIsEditing((current) => !current)}>
          {isEditing ? "收起" : "修改"}
        </button>
      </div>

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
