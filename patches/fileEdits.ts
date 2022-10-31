import { readFile, writeFile } from "fs/promises";
import { EOL } from "os";
import { join } from "path";
import { PatchContext } from "../config";

export async function applyFileEdits(context: PatchContext) {
  await Promise.all([
    edit(
      context,
      "internal/provider/provider.go",
      addLineAfter(
        /^import \($/im,
        `\t"github.com/hashicorp/terraform-provider-aws/internal/service/s3legacy"`
      ),
      addLineAfter(
        /^\s*"aws_ecr_repository":\s*ecr\.DataSourceRepository\(\),$/im,
        `\t\t\t"aws_ecr_credentials": ecr.DataSourceCredentials(),`
      ),
      addLineAfter(
        /^\s*"aws_fsx_openzfs_snapshot":\s*fsx.DataSourceOpenzfsSnapshot\(\),$/im,
        EOL +
          `\t\t\t"aws_globalaccelerator_accelerator": globalaccelerator.DataSourceAccelerator(),`
      ),
      addLineAfter(
        /^\s*"aws_location_tracker_associations":\s*location.DataSourceTrackerAssociations\(\),$/im,
        EOL +
          `\t\t\t"aws_arn":                     meta.DataSourceARN(), // Upstream this is currently implemented using Terraform Plugin Framework. See also: https://github.com/pulumi/pulumi-terraform-bridge/issues/590` +
          EOL +
          `\t\t\t"aws_billing_service_account": meta.DataSourceBillingServiceAccount(),` +
          EOL +
          `\t\t\t"aws_default_tags":            meta.DataSourceDefaultTags(),` +
          EOL +
          `\t\t\t"aws_ip_ranges":               meta.DataSourceIPRanges(),` +
          EOL +
          `\t\t\t"aws_partition":               meta.DataSourcePartition(),` +
          EOL +
          `\t\t\t"aws_region":                  meta.DataSourceRegion(),` +
          EOL +
          `\t\t\t"aws_regions":                 meta.DataSourceRegions(),` +
          EOL +
          `\t\t\t"aws_service":                 meta.DataSourceService(),`
      ),
      addLineAfter(
        /^\s*"aws_storagegateway_local_disk":\s*storagegateway.DataSourceLocalDisk\(\),$/im,
        EOL + `\t\t\t"aws_caller_identity": sts.DataSourceCallerIdentity(),`
      ),
      addLineAfter(
        /^\s*"aws_s3_bucket":\s*s3.ResourceBucket\(\),$/im,
        `\t\t\t"aws_s3_bucket_legacy":                               s3legacy.ResourceBucketLegacy(),`
      ),
      addLineAfter(
        /^\s*"aws_signer_signing_profile_permission": signer.ResourceSigningProfilePermission\(\),$/im,
        EOL + `\t\t\t"aws_simpledb_domain": simpledb.ResourceDomain(),`
      )
    ),
  ]);
}

function addLineAfter(matchLine: string | RegExp, extraContent: string) {
  return (content: string) => {
    const match = content.match(matchLine);
    if (match === null || match.index === undefined) {
      throw new UnmatchedError(`couldn't find ${matchLine}`);
    }
    const endOfMatch = match.index + match[0].length;
    const prefix = content.substring(0, endOfMatch);
    const suffix = content.substring(endOfMatch);
    // Check if we've already added this
    if (suffix.startsWith(EOL + extraContent)) {
      return content;
    }
    return prefix + EOL + extraContent + suffix;
  };
}

class UnmatchedError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "UnmatchedError";
  }
}

async function edit(
  context: PatchContext,
  path: string,
  ...edits: ((content: string) => string)[]
) {
  const filePath = join(context.dir, path);
  const content = await readFile(filePath, "utf-8");
  let unmatched: string[] = [];
  let output = content;
  for (const edit of edits) {
    try {
      output = edit(output);
    } catch (err) {
      if (err instanceof UnmatchedError) {
        unmatched.push(err.message);
      } else {
        throw err;
      }
    }
  }
  if (output !== content) {
    await writeFile(filePath, output);
  }
  if (unmatched.length > 0) {
    console.warn("Unmatched edits for", path, EOL, unmatched.join(EOL));
  }
}
