"use client";

import { useEffect, useRef, useState } from "react";

type ThemeId = "cloudai-dark" | "ecommerce-pink";

const THEME_STORAGE_KEY = "cloudai-theme";

const themes: Array<{
  id: ThemeId;
  label: string;
  swatchClassName: string;
}> = [
  {
    id: "cloudai-dark",
    label: "CloudAI Dark",
    swatchClassName: "theme-swatch cloudai-dark",
  },
  {
    id: "ecommerce-pink",
    label: "E-commerce Pink",
    swatchClassName: "theme-swatch ecommerce-pink",
  },
];

function normalizeTheme(theme: string | undefined | null): ThemeId {
  return theme === "ecommerce-pink" ? "ecommerce-pink" : "cloudai-dark";
}

export function ThemeSelector() {
  const [theme, setTheme] = useState<ThemeId>("cloudai-dark");
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);
  const currentTheme = themes.find((item) => item.id === theme) ?? themes[0];

  useEffect(() => {
    setTheme(normalizeTheme(document.documentElement.dataset.theme));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!selectorRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function selectTheme(nextTheme: ThemeId) {
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Theme still applies for the current page when storage is unavailable.
    }
    setTheme(nextTheme);
    setIsOpen(false);
  }

  return (
    <div className="theme-selector" ref={selectorRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="theme-selector-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>
          <small>外观</small>
          <strong>{currentTheme.label}</strong>
        </span>
      </button>
      {isOpen ? (
        <div aria-label="选择主题" className="theme-selector-menu" role="listbox" tabIndex={-1}>
          {themes.map((item) => (
            <button
              aria-selected={item.id === theme}
              className={item.id === theme ? "selected" : undefined}
              key={item.id}
              onClick={() => selectTheme(item.id)}
              role="option"
              type="button"
            >
              <span className={item.swatchClassName} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
