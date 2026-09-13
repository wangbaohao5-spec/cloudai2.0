import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f5f8f6",
    description: BRAND.description,
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "any",
        src: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    lang: "zh-CN",
    name: `${BRAND.name} — ${BRAND.descriptor}`,
    short_name: BRAND.name,
    start_url: "/",
    theme_color: "#174f46",
  };
}
