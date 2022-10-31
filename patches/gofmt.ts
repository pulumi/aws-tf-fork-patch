import { spawn } from "child_process";
import { PatchContext } from "../config";

export async function applyGoFmt(context: PatchContext) {
  await new Promise((resolve, reject) => {
    const proc = spawn("gofmt", ["-w", "internal"], {
      stdio: "pipe",
      cwd: context.dir,
    })
      .on("error", reject)
      .on("close", (code) =>
        code === 0
          ? resolve(undefined)
          : reject(new Error(`gofmt exited with code ${code}`))
      );
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
  });
}
