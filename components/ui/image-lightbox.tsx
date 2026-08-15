"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ImageLightboxProps = {
  alt?: string;
  imageUrl: string;
  onClose: () => void;
  title?: string;
};

export function ImageLightbox({ alt, imageUrl, onClose, title }: ImageLightboxProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!isMounted) {
    return null;
  }

  const accessibleLabel = title || alt || "图片预览";

  return createPortal(
    <div className="product-image-lightbox" role="dialog" aria-modal="true" aria-label={accessibleLabel}>
      <button className="product-image-lightbox__backdrop" type="button" aria-label="关闭图片预览" onClick={onClose} />
      <div className="product-image-lightbox__content">
        <button className="product-image-lightbox__close" type="button" aria-label="关闭图片预览" onClick={onClose}>
          关闭
        </button>
        {title ? <p className="product-image-lightbox__title">{title}</p> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="product-image-lightbox__image" src={imageUrl} alt={alt || accessibleLabel} decoding="async" />
      </div>
    </div>,
    document.body,
  );
}
