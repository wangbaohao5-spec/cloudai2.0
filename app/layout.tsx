import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudAI - AI 电商商品创作工作台",
  description:
    "CloudAI 是面向电商创作者的商品内容创作工作台，支持商品策划、上架文案、商品图精修、商品套图和素材包整理。",
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
