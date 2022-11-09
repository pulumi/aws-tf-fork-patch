import { sort, distinct, distinctBy, sortBy } from "array-fns";
import { DocsReplacements } from "./patches";

export function mergeReplacements(
  a: DocsReplacements,
  b: DocsReplacements
): DocsReplacements {
  const sortedKeys = sort(distinct([...Object.keys(a), ...Object.keys(b)]));
  const merged: DocsReplacements = {};
  for (const key of sortedKeys) {
    const aReplacements = a[key] ?? [];
    const bReplacements = b[key] ?? [];
    const uniqueReplacements = distinctBy(
      [...aReplacements, ...bReplacements],
      (r) => r.old
    );
    const sortedReplacements = sortBy(uniqueReplacements, (r) => r.old);
    merged[key] = sortedReplacements;
  }
  return merged;
}
