/** Keeps browser-only dashboard data separate when people share a device. */
export function accountStorageKey(key: string, account: string | null | undefined) {
  const identity = account?.trim().toLowerCase() || "signed-in";
  return `${key}:${encodeURIComponent(identity)}`;
}
