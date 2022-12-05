import { PatchContext } from "../config";
import glob from "fast-glob";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { EOL } from "os";
import z from "zod";
import { existsSync } from "fs";

const LinkStripConfig = z.object({
  allowedDomains: z.string().array().optional(),
  blockedDomains: z.string().array().optional(),
  allowedGitHubOrgs: z.string().array().optional(),
  blockedGitHubOrgs: z.string().array().optional(),
});

export async function readDomains(path: string): Promise<LinkStripConfig> {
  if (path === "domains.json" && !existsSync(path)) {
    return defaultConfig;
  }
  const content = await readFile(path, "utf-8");
  const json = JSON.parse(content);
  return LinkStripConfig.parse(json);
}

type LinkStripConfig = z.infer<typeof LinkStripConfig>;

export async function applyStripDocLinks(
  ctx: PatchContext,
  domains: LinkStripConfig
) {
  const allowedDomains = new Set(domains.allowedDomains);
  const blockedDomains = new Set(domains.blockedDomains);
  const allowedGitHubOrgs = new Set(domains.allowedGitHubOrgs);
  const blockedGitHubOrgs = new Set(domains.blockedGitHubOrgs);
  const files = await glob("website/**/*.markdown", { cwd: ctx.dir });
  for (const file of files) {
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    // Match a "[", capture everything that's not "]"
    // Then match a "(" and everything up to ")"
    const linkReplaced = content.replace(
      /\[([^\]]*)\]\(([^\)]*)\)/g,
      (source: string, linkText: string, href: string) => {
        try {
          const url = new URL(href);
          if (url.hostname === "github.com") {
            const org = url.pathname.split("/")[1];
            if (allowedGitHubOrgs.has(org)) {
              return source; // unchanged
            }
            if (blockedGitHubOrgs.has(org)) {
              return linkText; // strip link
            }
          }
          if (allowedDomains.has(url.hostname)) {
            return source; // unchanged
          }
          if (blockedDomains.has(url.hostname)) {
            return linkText; // strip link
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

        console.log("Unhandled link URL: ", href, EOL);
        return source;
      }
    );
    if (linkReplaced != content) {
      await writeFile(filePath, linkReplaced);
    }
  }
}

const defaultConfig: LinkStripConfig = {
  blockedGitHubOrgs: ["hashicorp"],
  allowedDomains: [
    "activemq.apache.org",
    "aws.amazon.com",
    "awscli.amazonaws.com",
    "bitbucket.org",
    "ci.apache.org",
    "console.aws.amazon.com",
    "developer.amazon.com",
    "developer.mozilla.org",
    "docs.aws.amazon.com",
    "docs.aws.amazon.com",
    "en.wikipedia.org",
    "enterprise.github.com",
    "forums.aws.amazon.com",
    "goessner.net",
    "golang.org",
    "help.github.com",
    "hub.docker.com",
    "lightsail.aws.amazon.com",
    "linux.die.net",
    "man7.org",
    "manpages.ubuntu.com",
    "manual-snort-org.s3-website-us-east-1.amazonaws.com",
    "openid.net",
    "orc.apache.org",
    "parquet.apache.org",
    "redis.io",
    "suricata.readthedocs.io",
    "tools.ietf.org",
    "velocity.apache.org",
    "www.envoyproxy.io",
    "www.iana.org",
    "www.icann.org",
    "www.ietf.org",
    "www.iso.org",
    "www.joda.org",
    "www.pulumi.com",
    "www.rfc-editor.org",
    "www.w3.org",
  ],
  blockedDomains: [
    "developer.hashicorp.com",
    "learn.hashicorp.com",
    "registry.terraform.io",
    "www.terraform.io",
  ],
};
