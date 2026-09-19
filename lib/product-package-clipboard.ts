export type ProductPackageCopyFeedback = {
  message: string;
  tone: "error" | "success";
};

export async function copyProductPackageText(
  text: string,
  writeText: (value: string) => Promise<void> = (value) => navigator.clipboard.writeText(value),
): Promise<ProductPackageCopyFeedback> {
  try {
    await writeText(text);
    return { message: "复制成功", tone: "success" };
  } catch {
    return { message: "复制失败，请手动选择内容复制。", tone: "error" };
  }
}
