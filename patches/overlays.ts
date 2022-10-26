import glob from "fast-glob";
import { readFile, stat, writeFile } from "fs/promises";
import { join } from "path";
import { PatchContext } from "../config";

export async function applyOverlays(config: PatchContext) {
  const overlayDir = join("patches", "overlays");
  const overlays = await glob("**/*", { cwd: overlayDir });
  for (const overlayFile of overlays) {
    const overlayContent = await readFile(
      join(overlayDir, overlayFile),
      "utf-8"
    );
    const targetPath = join(config.dir, overlayFile);
    const existingContent = await tryGetExisting(targetPath);

    if (existingContent !== undefined && existingContent !== overlayContent) {
      console.warn("Overlay differs from target:", overlayFile);
      continue;
    }

    if (existingContent === overlayContent) {
      continue; // Skip as already written
    }

    await writeFile(targetPath, overlayContent, "utf-8");
  }
}

async function tryGetExisting(targetPath: string) {
  try {
    await stat(targetPath);
  } catch {
    // doesn't exist
    return undefined;
  }
  return await readFile(targetPath, "utf-8");
}
