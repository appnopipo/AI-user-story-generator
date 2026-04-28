export function toArray<T>(value: T[] | string | undefined | null): T[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function cleanLlmJson(raw: string): string {
  return raw
    .replace(/^```(?:json)?\n?/gm, "")
    .replace(/```$/gm, "")
    .trim();
}
