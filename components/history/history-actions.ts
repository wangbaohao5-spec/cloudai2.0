type ClearHistoryOptions = {
  reload: () => Promise<void>;
  request: () => Promise<Response>;
};

export async function clearHistoryAndReload({ reload, request }: ClearHistoryOptions) {
  const response = await request();

  if (!response.ok) {
    throw new Error("生成记录清理失败，请稍后再试。");
  }

  await reload();
}
