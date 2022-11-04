import { PatchContext } from "../config";
import glob from "fast-glob";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export async function applyStripDocLinks(ctx: PatchContext) {
  const files = await glob("website/**/*.markdown", { cwd: ctx.dir });
  for (const file of files) {
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    // Match a "[", capture everything that's not "]"
    // Then match a "(" and everything up to ")"
    const replaced = content.replace(
      /\[([^\]]*)\]\(([^\)]*)\)/g,
      (source: string, linkText: string, href: string) => {
        try {
          const url = new URL(href);
          switch (url.hostname) {
            // Allowed link domains
            case "activemq.apache.org":
            case "aws.amazon.com":
            case "awscli.amazonaws.com":
            case "bitbucket.org":
            case "ci.apache.org":
            case "console.aws.amazon.com":
            case "developer.amazon.com":
            case "developer.mozilla.org":
            case "docs.aws.amazon.com":
            case "docs.aws.amazon.com":
            case "en.wikipedia.org":
            case "enterprise.github.com":
            case "forums.aws.amazon.com":
            case "goessner.net":
            case "golang.org":
            case "help.github.com":
            case "hub.docker.com":
            case "lightsail.aws.amazon.com":
            case "linux.die.net":
            case "man7.org":
            case "manpages.ubuntu.com":
            case "manual-snort-org.s3-website-us-east-1.amazonaws.com":
            case "openid.net":
            case "orc.apache.org":
            case "parquet.apache.org":
            case "redis.io":
            case "suricata.readthedocs.io":
            case "tools.ietf.org":
            case "velocity.apache.org":
            case "www.envoyproxy.io":
            case "www.iana.org":
            case "www.icann.org":
            case "www.ietf.org":
            case "www.iso.org":
            case "www.joda.org":
            case "www.pulumi.com":
            case "www.rfc-editor.org":
            case "www.w3.org":
              return source;
            // Disallow hashicorp links
            case "developer.hashicorp.com":
            case "learn.hashicorp.com":
            case "registry.terraform.io":
            case "www.terraform.io":
              return linkText;
            // Check Github org
            case "github.com":
              if (url.pathname.startsWith("/hashicorp")) {
                // Remove hashicorp org links
                return linkText;
              }
              return source;
            default:
              console.log("Unhandled link URL: ", href);
              return source;
          }
        } catch {} // Not passable as a URL

        try {
          // Parse with fake domain for relative links
          const url = new URL("http://domain.test/" + href);
          const { hash, pathname } = url;
          // Disallow path based links
          if (pathname !== "/") {
            return linkText;
          }
          // Allow same-page links
          if (hash !== "") {
            return source;
          }
        } catch {} // Not passable as a URL

        console.log("Unhandled link URL: ", href);
        return source;
      }
    );
    if (replaced != content) {
      await writeFile(filePath, replaced);
    }
  }
}
