"use client";

import { useEffect, useState } from "react";

type QuickTheme = "cloudai-dark" | "business-light";

const THEME_STORAGE_KEY = "cloudai-theme";

function getQuickTheme(theme: string | undefined | null): QuickTheme {
  return theme === "business-light" ? "business-light" : "cloudai-dark";
}

export function ThemeQuickToggle() {
  const [theme, setTheme] = useState<QuickTheme>("cloudai-dark");

  useEffect(() => {
    setTheme(getQuickTheme(document.documentElement.dataset.theme));

    const observer = new MutationObserver(() => {
      setTheme(getQuickTheme(document.documentElement.dataset.theme));
    });

    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  function selectTheme(nextTheme: QuickTheme) {
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The theme still applies for the current page when storage is unavailable.
    }
    setTheme(nextTheme);
  }

  return (
    <div className="theme-quick-toggle" role="group" aria-label="快速切换深色或浅色主题">
      <button
        aria-pressed={theme !== "business-light"}
        className={theme !== "business-light" ? "active" : undefined}
        type="button"
        onClick={() => selectTheme("cloudai-dark")}
      >
        深色
      </button>
      <button
        aria-pressed={theme === "business-light"}
        className={theme === "business-light" ? "active" : undefined}
        type="button"
        onClick={() => selectTheme("business-light")}
      >
        浅色
      </button>
    </div>
  );
}
