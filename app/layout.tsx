import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
import "./globals.css";
import "./product-workspace.css";

export const metadata: Metadata = {
  applicationName: BRAND.name,
  title: `${BRAND.name} — ${BRAND.descriptor}`,
  description: BRAND.description,
  openGraph: {
    description: BRAND.description,
    locale: "zh_CN",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.descriptor}`,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    (function () {
      try {
        var theme = localStorage.getItem("cloudai-theme");
        var allowed = theme === "cloudai-dark" || theme === "ecommerce-pink" || theme === "business-light";
        document.documentElement.dataset.theme = allowed ? theme : "cloudai-dark";
      } catch (error) {
        document.documentElement.dataset.theme = "cloudai-dark";
      }
    })();
  `;

  return (
    <html lang="zh-CN" data-theme="cloudai-dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
