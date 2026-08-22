"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type HeaderActionIconName = "announcement" | "contact" | "plan";

type HeaderActionPopoverProps = {
  children: ReactNode;
  icon: HeaderActionIconName;
  label: string;
};

function HeaderActionIcon({ icon }: { icon: HeaderActionIconName }) {
  const commonProps = {
    "aria-hidden": true,
    className: "header-action-button__icon",
    fill: "none",
    height: 16,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    width: 16,
  };

  switch (icon) {
    case "plan":
      return (
        <svg {...commonProps}>
          <path d="M12 3 4 7l8 4 8-4z" />
          <path d="m4 11 8 4 8-4" />
          <path d="m4 15 8 4 8-4" />
        </svg>
      );
    case "announcement":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );
    case "contact":
      return (
        <svg {...commonProps}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      );
  }
}

export function HeaderActionPopover({ children, icon, label }: HeaderActionPopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="header-action-popover" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label={label}
        className="header-action-button"
        onClick={() => setOpen((current) => !current)}
        title={label}
        type="button"
      >
        <HeaderActionIcon icon={icon} />
        <span>{label}</span>
      </button>
      {open ? <div className="header-action-panel">{children}</div> : null}
    </div>
  );
}
