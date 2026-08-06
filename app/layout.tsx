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
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
