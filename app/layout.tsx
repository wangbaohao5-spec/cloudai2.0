import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudAI - 现代 AI 工具平台",
  description:
    "CloudAI 是面向团队与创作者的现代 AI 工具平台，提供文案生成、图片生成与智能工作流能力。",
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
        var allowed = theme === "cloudai-dark" || theme === "ecommerce-pink";
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
