export type PreferenceMemory = {
  key: string;
  value: string;
  confirmed: boolean;
  expiresAt: string;
};

const memories = new Map<string, PreferenceMemory[]>();

export function listMemories(userId: string): PreferenceMemory[] {
  const now = Date.now();
  return (memories.get(userId) ?? []).filter((item) => Date.parse(item.expiresAt) > now);
}

export function writeMemory(userId: string, key: string, value: string, confirmed: boolean) {
  const next = listMemories(userId).filter((item) => item.key !== key);
  next.push({
    key,
    value,
    confirmed,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  memories.set(userId, next);
  return next;
}

export function deleteMemory(userId: string, key: string) {
  memories.set(
    userId,
    listMemories(userId).filter((item) => item.key !== key),
  );
}
