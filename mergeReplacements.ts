import { DocsReplacements } from "./patches";

export function mergeReplacements(
  a: DocsReplacements,
  b: DocsReplacements
): DocsReplacements {
  const merged = { ...a };
  for (const [key, bValue] of Object.entries(b)) {
    if (key in merged) {
      const aValue = merged[key];
      merged[key] = [...aValue, ...bValue];
    } else {
      merged[key] = bValue;
    }
  }
  return merged;
}
