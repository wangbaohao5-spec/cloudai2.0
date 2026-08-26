const PRODUCT_SESSION_STORAGE_PREFIX = "cloudai:products:";

export function clearProductSessionStorage(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(PRODUCT_SESSION_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}
