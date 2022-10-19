import { PatchContext } from "../config";
import glob from "fast-glob";
import { readFile, writeFile } from "fs/promises";
import { join, relative } from "path";
import { EOL } from "os";

export async function applyDocsTerraformReplace(ctx: PatchContext) {
  const suggestions: DocsReplacements = {};
  const files = await glob("website/**/*.markdown", { cwd: ctx.dir });
  for (const file of files) {
    if (file === "website/docs/index.html.markdown") {
      continue;
    }
    const filePath = join(ctx.dir, file);
    const content = await readFile(filePath, { encoding: "utf-8" });
    const replaced = tryReplace(file, content);
    if (replaced != content) {
      await writeFile(filePath, replaced);
    }
    if (!replaced.includes("Terraform")) {
      continue;
    }
    // Build suggestions for pending replacements
    const tfLines: [number, string][] = [];
    content.split(EOL).forEach((line, i) => {
      if (line.includes("Terraform")) {
        tfLines.push([i + 1, line]);
      }
    });
    const replacements = tfLines.map(([n, old]) => ({
      old: old,
      new: buildSuggestion(old),
    }));
    if (tfLines.length > 0) {
      suggestions[file] = replacements;
    }
  }
  if (Object.keys(suggestions).length > 0) {
    writeFile(
      "suggestedReplacements.json",
      JSON.stringify(suggestions, null, 2) + EOL
    );
    console.log(`"Terraform" found in docs, see suggestedReplacements.json`);
  }
}

function tryReplace(file: string, content: string): string {
  if (file in knownReplacements) {
    let replaced = content;
    const replacements = knownReplacements[file];
    for (const replacement of replacements) {
      const newReplacement = content.replace(replacement.old, replacement.new);
      if (replaced === newReplacement) {
        console.warn("Replacement not matched:", file, "\n", replacement.old);
      }
      replaced = newReplacement;
    }
    return replaced;
  }
  return content;
}

function buildSuggestion(line: string): string {
  // if (line.includes("Terraform data source")) {
  //   return line.replace("Terraform data source", "data source");
  // }
  // if (line.includes("Terraform will fail")) {
  //   return line.replace("Terraform will fail", "the provider will fail");
  // }
  // if (line.includes("which Terraform is")) {
  //   return line.replace("which Terraform is", "which the provider is");
  // }
  // if (line.includes("Terraform's")) {
  //   return line.replace("Terraform's", "the provider's");
  // }
  return line;
}

export type LineReplacement = {
  old: string;
  new: string;
};

export type DocsReplacements = Record<string, LineReplacement[]>;

const knownReplacements: DocsReplacements = {
  "website/docs/d/ami.html.markdown": [
    {
      old: "Terraform will fail. Ensure that your search is specific enough to return",
      new: "this call will fail. Ensure that your search is specific enough to return",
    },
  ],
  "website/docs/d/caller_identity.html.markdown": [
    {
      old: "which Terraform is authorized.",
      new: "which this provider is authorized.",
    },
  ],
  "website/docs/d/canonical_user_id.html.markdown": [
    {
      old: "for the effective account in which Terraform is working.  ",
      new: "for the effective account in which this provider is working.  ",
    },
  ],
  "website/docs/d/cloudformation_export.html.markdown": [
    {
      old: " -> Note: If you are trying to use a value from a Cloudformation Stack in the same Terraform run please use normal interpolation or Cloudformation Outputs.",
      new: " -> Note: If you are trying to use a value from a Cloudformation Stack in the same deployment please use normal interpolation or Cloudformation Outputs.",
    },
  ],
  "website/docs/d/elastic_beanstalk_solution_stack.html.markdown": [
    {
      old: "Terraform will fail. Ensure that your search is specific enough to return",
      new: "this call will fail. Ensure that your search is specific enough to return",
    },
  ],
  "website/docs/d/elb_service_account.html.markdown": [
    {
      old: '  name               = "my-foobar-terraform-elb"',
      new: '  name               = "my-foobar-elb"',
    },
  ],
  "website/docs/d/iam_account_alias.html.markdown": [
    {
      old: "for the effective account in which Terraform is working.",
      new: "for the effective account in which this provider is working.",
    },
  ],
  "website/docs/d/iam_server_certificate.html.markdown": [
    {
      old: "The terraform import function will read in certificate body, certificate chain (if it exists), id, name, path, and arn.",
      new: "The import function will read in certificate body, certificate chain (if it exists), id, name, path, and arn.",
    },
  ],
  "website/docs/d/instance.html.markdown": [
    {
      old: "Terraform will fail. Ensure that your search is specific enough to return",
      new: "this call will fail. Ensure that your search is specific enough to return",
    },
  ],
  "website/docs/d/ip_ranges.html.markdown": [
    {
      old: "CIDR blocks, Terraform will fail.",
      new: "CIDR blocks, this call will fail.",
    },
  ],
  "website/docs/d/networkmanager_core_network_policy_document.html.markdown": [
    {
      old: "-> For more information about building AWS Core Network policy documents with Terraform, see the Using AWS & AWSCC Provider Together Guide",
      new: "-> For more information about building AWS Core Network policy documents with Terraform, see the [Using AWS & AWSCC Provider Together Guide](/docs/providers/aws/guides/using-aws-with-awscc-provider.html)",
    },
  ],
  "website/docs/d/redshift_cluster.html.markdown": [
    {
      old: '  name        = "terraform-kinesis-firehose-example-stream"',
      new: '  name        = "kinesis-firehose-example-stream"',
    },
  ],
  "website/docs/d/s3_bucket_object.html.markdown": [
    {
      old: "-> **Note:** Terraform ignores all leading `/`s in the object's `key` and treats multiple `/`s in the rest of the object's `key` as a single `/`, so values of `/index.html` and `index.html` correspond to the same S3 object as do `first//second///third//` and `first/second/third/`.",
      new: "-> **Note:** This provider ignores all leading `/`s in the object's `key` and treats multiple `/`s in the rest of the object's `key` as a single `/`, so values of `/index.html` and `index.html` correspond to the same S3 object as do `first//second///third//` and `first/second/third/`.",
    },
  ],
  "website/docs/d/s3_bucket_objects.html.markdown": [
    {
      old: "~> **NOTE on `max_keys`:** Retrieving very large numbers of keys can adversely affect Terraform's performance.",
      new: "~> **NOTE on `max_keys`:** Retrieving very large numbers of keys can adversely affect this provider's performance.",
    },
    {
      old: "The following example retrieves a list of all object keys in an S3 bucket and creates corresponding Terraform object data sources:",
      new: "The following example retrieves a list of all object keys in an S3 bucket and creates corresponding object data sources:",
    },
  ],
  "website/docs/d/security_groups.html.markdown": [
    {
      old: "Use this data source to get IDs and VPC membership of Security Groups that are created outside of Terraform.",
      new: "Use this data source to get IDs and VPC membership of Security Groups that are created",
    },
  ],
  "website/docs/d/service_discovery_dns_namespace.html.markdown": [
    {
      old: '  name = "example.terraform.local"',
      new: '  name = "example.service.local"',
    },
  ],
  "website/docs/index.html.markdown": [
    {
      old: "* `default_tags` - (Optional) Configuration block with resource tag settings to apply across all resources handled by this provider (see the Terraform multiple provider instances documentation for more information about additional provider configurations). This is designed to replace redundant per-resource `tags` configurations. Provider tags can be overridden with new values, but not excluded from specific resources. To override provider tag values, use the `tags` argument within a resource to configure new tag values for matching keys. See the [`default_tags`](#default_tags-configuration-block) Configuration Block section below for example usage and available arguments. This functionality is supported in all resources that implement `tags`, with the exception of the `aws_autoscaling_group` resource.",
      new: "* `default_tags` - (Optional) Configuration block with resource tag settings to apply across all resources handled by this provider (see the [Terraform multiple provider instances documentation](/docs/configuration/providers.html#alias-multiple-provider-instances) for more information about additional provider configurations). This is designed to replace redundant per-resource `tags` configurations. Provider tags can be overridden with new values, but not excluded from specific resources. To override provider tag values, use the `tags` argument within a resource to configure new tag values for matching keys. See the [`default_tags`](#default_tags-configuration-block) Configuration Block section below for example usage and available arguments. This functionality is supported in all resources that implement `tags`, with the exception of the `aws_autoscaling_group` resource.",
    },
    {
      old: "* `ignore_tags` - (Optional) Configuration block with resource tag settings to ignore across all resources handled by this provider (except any individual service tag resources such as `aws_ec2_tag`) for situations where external systems are managing certain resource tags. Arguments to the configuration block are described below in the `ignore_tags` Configuration Block section. See the Terraform multiple provider instances documentation for more information about additional provider configurations.",
      new: "* `ignore_tags` - (Optional) Configuration block with resource tag settings to ignore across all resources handled by this provider (except any individual service tag resources such as `aws_ec2_tag`) for situations where external systems are managing certain resource tags. Arguments to the configuration block are described below in the `ignore_tags` Configuration Block section. See the [Terraform multiple provider instances documentation](https://www.terraform.io/docs/configuration/providers.html#alias-multiple-provider-configurations) for more information about additional provider configurations.",
    },
    {
      old: "* `keys` - (Optional) List of exact resource tag keys to ignore across all resources handled by this provider. This configuration prevents Terraform from returning the tag in any `tags` attributes and displaying any configuration difference for the tag value. If any resource configuration still has this tag key configured in the `tags` argument, it will display a perpetual difference until the tag is removed from the argument or `ignore_changes` is also used.",
      new: "* `keys` - (Optional) List of exact resource tag keys to ignore across all resources handled by this provider. This configuration prevents Terraform from returning the tag in any `tags` attributes and displaying any configuration difference for the tag value. If any resource configuration still has this tag key configured in the `tags` argument, it will display a perpetual difference until the tag is removed from the argument or [`ignore_changes`](https://www.terraform.io/docs/configuration/meta-arguments/lifecycle.html#ignore_changes) is also used.",
    },
    {
      old: "* `key_prefixes` - (Optional) List of resource tag key prefixes to ignore across all resources handled by this provider. This configuration prevents Terraform from returning any tag key matching the prefixes in any `tags` attributes and displaying any configuration difference for those tag values. If any resource configuration still has a tag matching one of the prefixes configured in the `tags` argument, it will display a perpetual difference until the tag is removed from the argument or `ignore_changes` is also used.",
      new: "* `key_prefixes` - (Optional) List of resource tag key prefixes to ignore across all resources handled by this provider. This configuration prevents Terraform from returning any tag key matching the prefixes in any `tags` attributes and displaying any configuration difference for those tag values. If any resource configuration still has a tag matching one of the prefixes configured in the `tags` argument, it will display a perpetual difference until the tag is removed from the argument or [`ignore_changes`](https://www.terraform.io/docs/configuration/meta-arguments/lifecycle.html#ignore_changes) is also used.",
    },
  ],
  "website/docs/r/acm_certificate.html.markdown": [
    {
      old: "Domain validation through email is also supported but should be avoided as it requires a manual step outside of Terraform.",
      new: "Domain validation through email is also supported but should be avoided as it requires a manual step outside of this provider.",
    },
  ],
  "website/docs/r/acmpca_certificate_authority.html.markdown": [
    {
      old: "~> **NOTE:** Creating this resource will leave the certificate authority in a `PENDING_CERTIFICATE` status, which means it cannot yet issue certificates. To complete this setup, you must fully sign the certificate authority CSR available in the `certificate_signing_request` attribute and import the signed certificate outside of Terraform. Terraform can support another resource to manage that workflow automatically in the future.",
      new: "~> **NOTE:** Creating this resource will leave the certificate authority in a `PENDING_CERTIFICATE` status, which means it cannot yet issue certificates. To complete this setup, you must fully sign the certificate authority CSR available in the `certificate_signing_request` attribute and import the signed certificate using the AWS SDK, CLI or Console. This provider can support another resource to manage that workflow automatically in the future.",
    },
  ],
  "website/docs/r/ami.html.markdown": [
    {
      old: '  name                = "terraform-example"',
      new: '  name                = "example"',
    },
  ],
  "website/docs/r/ami_copy.html.markdown": [
    {
      old: '  name              = "terraform-example"',
      new: '  name              = "example"',
    },
  ],
  "website/docs/r/ami_from_instance.html.markdown": [
    {
      old: '  name               = "terraform-example"',
      new: '  name               = "example"',
    },
  ],
  "website/docs/r/api_gateway_api_key.html.markdown": [
    {
      old: '* `description` - (Optional) API key description. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) API key description. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/api_gateway_deployment.html.markdown": [
    {
      old: "To properly capture all REST API configuration in a deployment, this resource must have dependencies on all prior Terraform resources that manage resources/paths, methods, integrations, etc.",
      new: "To properly capture all REST API configuration in a deployment, this resource must have dependencies on all prior resources that manage resources/paths, methods, integrations, etc.",
    },
    {
      old: "* For REST APIs that are configured via OpenAPI specification (`aws_api_gateway_rest_api` resource `body` argument), no special dependency setup is needed beyond referencing the  `id` attribute of that resource unless additional Terraform resources have further customized the REST API.",
      new: "* For REST APIs that are configured via OpenAPI specification (`aws_api_gateway_rest_api` resource `body` argument), no special dependency setup is needed beyond referencing the  `id` attribute of that resource unless additional resources have further customized the REST API.",
    },
    {
      old: "* When the REST API configuration involves other Terraform resources (`aws_api_gateway_integration` resource, etc.), the dependency setup can be done with implicit resource references in the `triggers` argument or explicit resource references using the resource `depends_on` meta-argument. The `triggers` argument should be preferred over `depends_on`, since `depends_on` can only capture dependency ordering and will not cause the resource to recreate (redeploy the REST API) with upstream configuration changes.",
      new: "* When the REST API configuration involves other resources (`aws_api_gateway_integration` resource), the dependency setup can be done with implicit resource references in the `triggers` argument or explicit resource references using the [resource `dependsOn` custom option](https://www.pulumi.com/docs/intro/concepts/resources/#dependson). The `triggers` argument should be preferred over `depends_on`, since `depends_on` can only capture dependency ordering and will not cause the resource to recreate (redeploy the REST API) with upstream configuration changes.",
    },
    {
      old: "!> **WARNING:** We recommend using the `aws_api_gateway_stage` resource instead of managing an API Gateway Stage via the `stage_name` argument of this resource. When this resource is recreated (REST API redeployment) with the `stage_name` configured, the stage is deleted and recreated. This will cause a temporary service interruption, increase Terraform plan differences, and can require a second Terraform apply to recreate any downstream stage configuration such as associated `aws_api_method_settings` resources.",
      new: "!> **WARNING:** It is recommended to use the `aws_api_gateway_stage` resource instead of managing an API Gateway Stage via the `stage_name` argument of this resource. When this resource is recreated (REST API redeployment) with the `stage_name` configured, the stage is deleted and recreated. This will cause a temporary service interruption, increase provide plan differences, and can require a second apply to recreate any downstream stage configuration such as associated `aws_api_method_settings` resources.",
    },
  ],
  "website/docs/r/api_gateway_rest_api.html.markdown": [
    {
      old: "Manages an API Gateway REST API. The REST API can be configured via [importing an OpenAPI specification](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-import-api.html) in the `body` argument (with other arguments serving as overrides) or via other Terraform resources to manage the resources (`aws_api_gateway_resource` resource), methods (`aws_api_gateway_method` resource), integrations (`aws_api_gateway_integration` resource), etc. of the REST API. Once the REST API is configured, the `aws_api_gateway_deployment` resource can be used along with the `aws_api_gateway_stage` resource to publish the REST API.",
      new: "Manages an API Gateway REST API. The REST API can be configured via [importing an OpenAPI specification](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-import-api.html) in the `body` argument (with other arguments serving as overrides) or via other provider resources to manage the resources (`aws_api_gateway_resource` resource), methods (`aws_api_gateway_method` resource), integrations (`aws_api_gateway_integration` resource), etc. of the REST API. Once the REST API is configured, the `aws_api_gateway_deployment` resource can be used along with the `aws_api_gateway_stage` resource to publish the REST API.",
    },
  ],
  "website/docs/r/api_gateway_rest_api_policy.html.markdown": [
    {
      old: "* `policy` - (Required) JSON formatted policy document that controls access to the API Gateway. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide",
      new: "* `policy` - (Required) JSON formatted policy document that controls access to the API Gateway.",
    },
  ],
  "website/docs/r/api_gateway_stage.html.markdown": [
    {
      old: "API Gateway provides the ability to [enable CloudWatch API logging](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html). To manage the CloudWatch Log Group when this feature is enabled, the `aws_cloudwatch_log_group` resource can be used where the name matches the API Gateway naming convention. If the CloudWatch Log Group previously exists, the `aws_cloudwatch_log_group` resource can be imported into Terraform as a one time operation and recreation of the environment can occur without import.",
      new: "-> The below configuration uses [`dependsOn`](https://www.pulumi.com/docs/intro/concepts/programming-model/#dependson) to prevent ordering issues with API Gateway automatically creating the log group first and a variable for naming consistency. Other ordering and naming methodologies may be more appropriate for your environment.",
    },
  ],
  "website/docs/r/apigatewayv2_api.html.markdown": [
    {
      old: "Further more, the `name`, `description`, `cors_configuration`, `tags` and `version` fields should be specified in the Terraform configuration and the values will override any values specified in the OpenAPI document.",
      new: "Further more, the `name`, `description`, `cors_configuration`, `tags` and `version` fields should be specified in the provider configuration and the values will override any values specified in the OpenAPI document.",
    },
  ],
  "website/docs/r/apigatewayv2_integration.html.markdown": [
    {
      old: "Terraform will only perform drift detection of its value when present in a configuration.",
      new: "this provider will only perform drift detection of its value when present in a configuration.",
    },
  ],
  "website/docs/r/apigatewayv2_stage.html.markdown": [
    {
      old: "Valid values: `ERROR`, `INFO`, `OFF`. Defaults to `OFF`. Supported only for WebSocket APIs. Terraform will only perform drift detection of its value when present in a configuration.",
      new: "Valid values: `ERROR`, `INFO`, `OFF`. Defaults to `OFF`. Supported only for WebSocket APIs. This provider will only perform drift detection of its value when present in a configuration.",
    },
  ],
  "website/docs/r/appmesh_virtual_node.html.markdown": [
    {
      old: "The Terraform state associated with existing resources will automatically be migrated.",
      new: "The state associated with existing resources will automatically be migrated.",
    },
  ],
  "website/docs/r/appmesh_virtual_router.html.markdown": [
    {
      old: "These resource can be imported using `terraform import`.",
      new: "These resource can be imported using `import`.",
    },
    {
      old: "The Terraform state associated with existing resources will automatically be migrated.",
      new: "The state associated with existing resources will automatically be migrated.",
    },
  ],
  "website/docs/r/apprunner_custom_domain_association.html.markdown": [
    {
      old: "* `dns_target` - App Runner subdomain of the App Runner service. The custom domain name is mapped to this target name. Attribute only available if resource created (not imported) with Terraform.",
      new: "* `dns_target` - App Runner subdomain of the App Runner service. The custom domain name is mapped to this target name. Attribute only available if resource created (not imported) with this provider.",
    },
  ],
  "website/docs/r/appsync_api_key.html.markdown": [
    {
      old: '* `description` - (Optional) API key description. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) API key description. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/appsync_graphql_api.html.markdown": [
    {
      old: "* `schema` - (Optional) Schema definition, in GraphQL schema language format. Terraform cannot perform drift detection of this configuration.",
      new: "* `schema` - (Optional) Schema definition, in GraphQL schema language format. This provider cannot perform drift detection of this configuration.",
    },
  ],
  "website/docs/r/athena_database.html.markdown": [
    {
      old: "Certain resource arguments, like `encryption_configuration` and `bucket`, do not have an API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `encryption_configuration` and `bucket`, do not have an API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use [`ignore_changes`](https://www.terraform.io/docs/configuration/meta-arguments/lifecycle.html#ignore_changes) to hide the difference, e.g.,",
    },
  ],
  "website/docs/r/autoscaling_attachment.html.markdown": [
    {
      old: "~> **NOTE on Auto Scaling Groups and ASG Attachments:** Terraform currently provides",
      new: "~> **NOTE on Auto Scaling Groups and ASG Attachments:** This provider currently provides",
    },
  ],
  "website/docs/r/autoscaling_group.html.markdown": [
    {
      old: "~> **NOTE on Auto Scaling Groups and ASG Attachments:** Terraform currently provides",
      new: "~> **NOTE on Auto Scaling Groups and ASG Attachments:** This provider currently provides",
    },
    {
      old: "  [duration](https://golang.org/pkg/time/#ParseDuration) that Terraform should",
      new: "  this provider to skip all Capacity Waiting behavior.",
    },
    {
      old: "Terraform will also wait for the correct number of healthy instances before",
      new: 'This provider considers an instance "healthy" when the ASG reports `HealthStatus:',
    },
    {
      old: "reason, the Terraform apply will time out, and the ASG will be marked as",
      new: "As with ASG Capacity, this provider will wait for up to `wait_for_capacity_timeout`",
    },
  ],
  "website/docs/r/autoscaling_lifecycle_hook.html.markdown": [
    {
      old: "~> **NOTE:** Terraform has two types of ways you can add lifecycle hooks - via",
      new: "~> **NOTE:** This provider has two types of ways you can add lifecycle hooks - via",
    },
    {
      old: '  name                 = "terraform-test-foobar5"',
      new: '  name                 = "test-foobar5"',
    },
  ],
  "website/docs/r/autoscaling_notification.html.markdown": [
    {
      old: '  name = "foobar1-terraform-test"',
      new: '  name = "foobar1-test"',
    },
    {
      old: '  name = "barfoo-terraform-test"',
      new: '  name = "barfoo-test"',
    },
  ],
  "website/docs/r/autoscaling_policy.html.markdown": [
    {
      old: "> **Hands-on:** Try the Manage AWS Auto Scaling Groups tutorial on HashiCorp Learn.",
      new: "> **Hands-on:** Try the [Manage AWS Auto Scaling Groups](https://learn.hashicorp.com/tutorials/terraform/aws-asg?utm_source=WEBSITE&utm_medium=WEB_IO&utm_offer=ARTICLE_PAGE&utm_content=DOCS) tutorial on HashiCorp Learn.",
    },
    {
      old: '  name                   = "foobar3-terraform-test"',
      new: '  name                   = "foobar3-test"',
    },
    {
      old: '  name                      = "foobar3-terraform-test"',
      new: '  name                      = "foobar3-test"',
    },
  ],
  "website/docs/r/autoscaling_schedule.html.markdown": [
    {
      old: '  name                      = "terraform-test-foobar5"',
      new: '  name                      = "test-foobar5"',
    },
  ],
  "website/docs/r/cloudcontrolapi_resource.html.markdown": [
    {
      old: "* `desired_state` - (Required) JSON string matching the CloudFormation resource type schema with desired configuration. Terraform configuration expressions can be converted into JSON using the `jsonencode()` function.",
      new: "* `desired_state` - (Required) JSON string matching the CloudFormation resource type schema with desired configuration. Terraform configuration expressions can be converted into JSON using the [`jsonencode()` function](https://www.terraform.io/docs/language/functions/jsonencode.html).",
    },
  ],
  "website/docs/r/cloudformation_stack_set_instance.html.markdown": [
    {
      old: "~> **NOTE:** To retain the Stack during Terraform resource destroy, ensure `retain_stack = true` has been successfully applied into the Terraform state first. This must be completed _before_ an apply that would destroy the resource.",
      new: "~> **NOTE:** To retain the Stack during resource destroy, ensure `retain_stack` has been set to `true` in the state first. This must be completed _before_ a deployment that would destroy the resource.",
    },
    {
      old: "* `retain_stack` - (Optional) During Terraform resource destroy, remove Instance from StackSet while keeping the Stack and its associated resources. Must be enabled in Terraform state _before_ destroy operation to take effect. You cannot reassociate a retained Stack or add an existing, saved Stack to a new StackSet. Defaults to `false`.",
      new: "* `retain_stack` - (Optional) During resource destroy, remove Instance from StackSet while keeping the Stack and its associated resources. Must be enabled in the state _before_ destroy operation to take effect. You cannot reassociate a retained Stack or add an existing, saved Stack to a new StackSet. Defaults to `false`.",
    },
  ],
  "website/docs/r/cloudformation_type.html.markdown": [
    {
      old: "~> **NOTE:** The destroy operation of this resource marks the version as deprecated. If this was the only `LIVE` version, the type is marked as deprecated. Enable the resource `lifecycle` configuration block `create_before_destroy` argument in this resource configuration to properly order redeployments in Terraform.",
      new: "~> **NOTE:** The destroy operation of this resource marks the version as deprecated. If this was the only `LIVE` version, the type is marked as deprecated. Enable the [resource `lifecycle` configuration block `create_before_destroy` argument](https://www.terraform.io/language/meta-arguments/lifecycle#create_before_destroy) in this resource configuration to properly order redeployments in Terraform.",
    },
  ],
  "website/docs/r/cloudfront_distribution.html.markdown": [
    {
      old: "    deleting it when destroying the resource through Terraform. If this is set,",
      new: "    deleting it when destroying the resource. If this is set,",
    },
  ],
  "website/docs/r/cloudfront_origin_access_identity.html.markdown": [
    {
      old: "[`aws_s3_bucket`][4] bucket policy, causing spurious diffs in Terraform. If",
      new: "`aws_s3_bucket` bucket policy, causing spurious diffs. If",
    },
  ],
  "website/docs/r/cloudfront_public_key.html.markdown": [
    {
      old: "* `name` - (Optional) The name for the public key. By default generated by Terraform.",
      new: "* `name` - (Optional) The name for the public key. By default generated by this provider.",
    },
  ],
  "website/docs/r/cloudwatch_composite_alarm.html.markdown": [
    {
      old: "~> **NOTE:** An alarm (composite or metric) cannot be destroyed when there are other composite alarms depending on it. This can lead to a cyclical dependency on update, as Terraform will unsuccessfully attempt to destroy alarms before updating the rule. Consider using `depends_on`, references to alarm names, and two-stage updates.",
      new: "~> **NOTE:** An alarm (composite or metric) cannot be destroyed when there are other composite alarms depending on it. This can lead to a cyclical dependency on update, as the provider will unsuccessfully attempt to destroy alarms before updating the rule. Consider using `depends_on`, references to alarm names, and two-stage updates.",
    },
  ],
  "website/docs/r/cloudwatch_event_bus_policy.html.markdown": [
    {
      old: "* `policy` - (Required) The text of the policy. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Required) The text of the policy. For more information about building AWS IAM policy documents with Terraform, see the [AWS IAM Policy Document Guide](https://learn.hashicorp.com/terraform/aws/iam-policy).",
    },
  ],
  "website/docs/r/cloudwatch_event_rule.html.markdown": [
    {
      old: "* `name` - (Optional) The name of the rule. If omitted, Terraform will assign a random, unique name. Conflicts with `name_prefix`.",
      new: "* `name` - (Optional) The name of the rule. If omitted, this provider will assign a random, unique name. Conflicts with `name_prefix`.",
    },
  ],
  "website/docs/r/cloudwatch_event_target.html.markdown": [
    {
      old: '  name        = "terraform-kinesis-test"',
      new: '  name        = "kinesis-test"',
    },
  ],
  "website/docs/r/cloudwatch_log_group.html.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) The name of the log group. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) The name of the log group. If omitted, this provider will assign a random, unique name.",
    },
  ],
  "website/docs/r/cloudwatch_metric_alarm.html.markdown": [
    {
      old: '  alarm_name                = "terraform-test-foobar5"',
      new: '  alarm_name                = "test-foobar5"',
    },
    {
      old: '  name                   = "foobar3-terraform-test"',
      new: '  name                   = "foobar3-test"',
    },
    {
      old: '  alarm_name          = "terraform-test-foobar5"',
      new: '  alarm_name          = "test-foobar5"',
    },
    {
      old: '  alarm_name                = "terraform-test-foobar"',
      new: '  alarm_name                = "test-foobar"',
    },
  ],
  "website/docs/r/codebuild_project.html.markdown": [
    {
      old: "* `image` - (Required) Docker image to use for this build project. Valid values include [Docker images provided by CodeBuild](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html) (e.g `aws/codebuild/standard:2.0`), [Docker Hub images](https://hub.docker.com/) (e.g., `hashicorp/terraform:latest`), and full Docker repository URIs such as those for ECR (e.g., `137112412989.dkr.ecr.us-west-2.amazonaws.com/amazonlinux:latest`).",
      new: "* `image` - (Required) Docker image to use for this build project. Valid values include [Docker images provided by CodeBuild](https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-available.html) (e.g `aws/codebuild/standard:2.0`), [Docker Hub images](https://hub.docker.com/) (e.g., `nginx/nginx:latest`), and full Docker repository URIs such as those for ECR (e.g., `137112412989.dkr.ecr.us-west-2.amazonaws.com/amazonlinux:latest`).",
    },
  ],
  "website/docs/r/codebuild_webhook.html.markdown": [
    {
      old: "When working with [Bitbucket](https://bitbucket.org) and [GitHub](https://github.com) source CodeBuild webhooks, the CodeBuild service will automatically create (on `aws_codebuild_webhook` resource creation) and delete (on `aws_codebuild_webhook` resource deletion) the Bitbucket/GitHub repository webhook using its granted OAuth permissions. This behavior cannot be controlled by Terraform.",
      new: "When working with [Bitbucket](https://bitbucket.org) and [GitHub](https://github.com) source CodeBuild webhooks, the CodeBuild service will automatically create (on `aws_codebuild_webhook` resource creation) and delete (on `aws_codebuild_webhook` resource deletion) the Bitbucket/GitHub repository webhook using its granted OAuth permissions. This behavior cannot be controlled by this provider.",
    },
    {
      old: "~> **Note:** The AWS account that Terraform uses to create this resource *must* have authorized CodeBuild to access Bitbucket/GitHub's OAuth API in each applicable region. This is a manual step that must be done *before* creating webhooks with this resource. If OAuth is not configured, AWS will return an error similar to `ResourceNotFoundException: Could not find access token for server type github`. More information can be found in the CodeBuild User Guide for [Bitbucket](https://docs.aws.amazon.com/codebuild/latest/userguide/sample-bitbucket-pull-request.html) and [GitHub](https://docs.aws.amazon.com/codebuild/latest/userguide/sample-github-pull-request.html).",
      new: "~> **Note:** The AWS account that this provider uses to create this resource *must* have authorized CodeBuild to access Bitbucket/GitHub's OAuth API in each applicable region. This is a manual step that must be done *before* creating webhooks with this resource. If OAuth is not configured, AWS will return an error similar to `ResourceNotFoundException: Could not find access token for server type github`. More information can be found in the CodeBuild User Guide for [Bitbucket](https://docs.aws.amazon.com/codebuild/latest/userguide/sample-bitbucket-pull-request.html) and [GitHub](https://docs.aws.amazon.com/codebuild/latest/userguide/sample-github-pull-request.html).",
    },
    {
      old: "~> **Note:** The `secret` attribute is only set on resource creation, so if the secret is manually rotated, terraform will not pick up the change on subsequent runs.  In that case, the webhook resource should be tainted and re-created to get the secret back in sync.",
      new: "~> **Note:** The `secret` attribute is only set on resource creation, so if the secret is manually rotated, this provider will not pick up the change on subsequent runs.  In that case, the webhook resource should be tainted and re-created to get the secret back in sync.",
    },
  ],
  "website/docs/r/codedeploy_deployment_group.html.markdown": [
    {
      old: "~> **NOTE on blue/green deployments:** When using `green_fleet_provisioning_option` with the `COPY_AUTO_SCALING_GROUP` action, CodeDeploy will create a new ASG with a different name. This ASG is _not_ managed by terraform and will conflict with existing configuration and state. You may want to use a different approach to managing deployments that involve multiple ASG, such as `DISCOVER_EXISTING` with separate blue and green ASG.",
      new: "~> **NOTE on blue/green deployments:** When using `green_fleet_provisioning_option` with the `COPY_AUTO_SCALING_GROUP` action, CodeDeploy will create a new ASG with a different name. This ASG is _not_ managed by this provider and will conflict with existing configuration and state. You may want to use a different approach to managing deployments that involve multiple ASG, such as `DISCOVER_EXISTING` with separate blue and green ASG.",
    },
  ],
  "website/docs/r/cognito_user_group.html.markdown": [
    {
      old: '  description  = "Managed by Terraform"',
      new: '  description  = "Managed by Pulumi"',
    },
  ],
  "website/docs/r/cognito_user_pool.markdown": [
    {
      old: "~> **NOTE:** When defining an `attribute_data_type` of `String` or `Number`, the respective attribute constraints configuration block (e.g `string_attribute_constraints` or `number_attribute_constraints`) is **required** to prevent recreation of the Terraform resource. This requirement is true for both standard (e.g., name, email) and custom schema attributes.",
      new: "~> **NOTE:** When defining an `attribute_data_type` of `String` or `Number`, the respective attribute constraints configuration block (e.g `string_attribute_constraints` or `number_attribute_contraints`) is **required** to prevent recreation of the resource. This requirement is true for both standard (e.g. name, email) and custom schema attributes.",
    },
    {
      old: "The [standard attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#cognito-user-pools-standard-attributes) have the following defaults. Note that attributes which match the default values are not stored in Terraform state when importing.",
      new: "The [standard attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html#cognito-user-pools-standard-attributes) have the following defaults. Note that attributes which match the default values are not stored in the provider state when importing.",
    },
  ],
  "website/docs/r/datasync_agent.html.markdown": [
    {
      old: "~> **NOTE:** One of `activation_key` or `ip_address` must be provided for resource creation (agent activation). Neither is required for resource import. If using `ip_address`, Terraform must be able to make an HTTP (port 80) GET request to the specified IP address from where it is running. The agent will turn off that HTTP server after activation.",
      new: "~> **NOTE:** One of `activation_key` or `ip_address` must be provided for resource creation (agent activation). Neither is required for resource import. If using `ip_address`, this provider must be able to make an HTTP (port 80) GET request to the specified IP address from where it is running. The agent will turn off that HTTP server after activation.",
    },
    {
      old: "* `activation_key` - (Optional) DataSync Agent activation key during resource creation. Conflicts with `ip_address`. If an `ip_address` is provided instead, Terraform will retrieve the `activation_key` as part of the resource creation.",
      new: "* `activation_key` - (Optional) DataSync Agent activation key during resource creation. Conflicts with `ip_address`. If an `ip_address` is provided instead, the provider will retrieve the `activation_key` as part of the resource creation.",
    },
    {
      old: "* `ip_address` - (Optional) DataSync Agent IP address to retrieve activation key during resource creation. Conflicts with `activation_key`. DataSync Agent must be accessible on port 80 from where Terraform is running.",
      new: "* `ip_address` - (Optional) DataSync Agent IP address to retrieve activation key during resource creation. Conflicts with `activation_key`. DataSync Agent must be accessible on port 80 from where the provider is running.",
    },
  ],
  "website/docs/r/datasync_task.html.markdown": [
    {
      old: "Manages an AWS DataSync Task, which represents a configuration for synchronization. Starting an execution of these DataSync Tasks (actually synchronizing files) is performed outside of this Terraform resource.",
      new: "Manages an AWS DataSync Task, which represents a configuration for synchronization. Starting an execution of these DataSync Tasks (actually synchronizing files) is performed outside of this resource.",
    },
  ],
  "website/docs/r/db_event_subscription.html.markdown": [
    {
      old: "* `name` - (Optional) The name of the DB event subscription. By default generated by Terraform.",
      new: "* `name` - (Optional) The name of the DB event subscription. By default generated by this provider.",
    },
  ],
  "website/docs/r/db_instance.html.markdown": [
    {
      old: "of this, Terraform may report a difference in its planning phase because a",
      new: "of this, this provider may report a difference in its planning phase because a",
    },
  ],
  "website/docs/r/db_option_group.html.markdown": [
    {
      old: '  name                     = "option-group-test-terraform"',
      new: '  name                     = "option-group-test"',
    },
    {
      old: '  option_group_description = "Terraform Option Group"',
      new: '  option_group_description = "Option Group"',
    },
    {
      old: "* `name` - (Optional, Forces new resource) The name of the option group. If omitted, Terraform will assign a random, unique name. Must be lowercase, to match as it is stored in AWS.",
      new: "* `name` - (Optional, Forces new resource) The name of the option group. If omitted, this provider will assign a random, unique name. Must be lowercase, to match as it is stored in AWS.",
    },
    {
      old: '* `option_group_description` - (Optional) The description of the option group. Defaults to "Managed by Terraform".',
      new: '* `option_group_description` - (Optional) The description of the option group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/db_parameter_group.html.markdown": [
    {
      old: "> **Hands-on:** For an example of the `aws_db_parameter_group` in use, follow the Manage AWS RDS Instances tutorial on HashiCorp Learn.",
      new: "> **Hands-on:** For an example of the `aws_db_parameter_group` in use, follow the [Manage AWS RDS Instances](https://learn.hashicorp.com/tutorials/terraform/aws-rds?in=terraform/aws&utm_source=WEBSITE&utm_medium=WEB_IO&utm_offer=ARTICLE_PAGE&utm_content=DOCS) tutorial on HashiCorp Learn.",
    },
    {
      old: "* `name` - (Optional, Forces new resource) The name of the DB parameter group. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) The name of the DB parameter group. If omitted, this provider will assign a random, unique name.",
    },
    {
      old: '* `description` - (Optional, Forces new resource) The description of the DB parameter group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional, Forces new resource) The description of the DB parameter group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/db_proxy_default_target_group.html.markdown": [
    {
      old: "The `aws_db_proxy_default_target_group` behaves differently from normal resources, in that Terraform does not _create_ or _destroy_ this resource, since it implicitly exists as part of an RDS DB Proxy. On Terraform resource creation it is automatically imported and on resource destruction, Terraform performs no actions in RDS.",
      new: "The `aws_db_proxy_default_target_group` behaves differently from normal resources, in that the provider does not _create_ or _destroy_ this resource, since it implicitly exists as part of an RDS DB Proxy. On the provider resource creation it is automatically imported and on resource destruction, the provider performs no actions in RDS.",
    },
  ],
  "website/docs/r/db_security_group.html.markdown": [
    {
      old: "!> **WARNING:** With the retirement of EC2-Classic the `aws_db_security_group` resource has been deprecated and will be removed in a future version. Any existing resources can be removed from Terraform state using the `terraform state rm` command.",
      new: "!> **WARNING:** With the retirement of EC2-Classic the `aws_db_security_group` resource has been deprecated and will be removed in a future version. Any existing resources can be removed from [Terraform state](https://www.terraform.io/language/state) using the [`terraform state rm`](https://www.terraform.io/cli/commands/state/rm#command-state-rm) command.",
    },
    {
      old: '* `description` - (Optional) The description of the DB security group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the DB security group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/db_subnet_group.html.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) The name of the DB subnet group. If omitted, Terraform will assign a random, unique name.",
      new: '* `description` - (Optional) The description of the DB subnet group. Defaults to "Managed by Pulumi".',
    },
    {
      old: '* `description` - (Optional) The description of the DB subnet group. Defaults to "Managed by Terraform".',
      new: "* `tags` - (Optional) A map of tags to assign to the resource. .If configured with a provider `default_tags` configuration block present, tags with matching keys will overwrite those defined at the provider-level.",
    },
  ],
  "website/docs/r/default_network_acl.html.markdown": [
    {
      old: '~> **NOTE:** This is an advanced resource with special caveats. Please read this document in its entirety before using this resource. The `aws_default_network_acl` behaves differently from normal resources. Terraform does not _create_ this resource but instead attempts to "adopt" it into management.',
      new: '~> **NOTE:** This is an advanced resource with special caveats. Please read this document in its entirety before using this resource. The `aws_default_network_acl` behaves differently from normal resources. This provider does not _create_ this resource but instead attempts to "adopt" it into management.',
    },
    {
      old: "Every VPC has a default network ACL that can be managed but not destroyed. When Terraform first adopts the Default Network ACL, it **immediately removes all rules in the ACL**. It then proceeds to create any rules specified in the configuration. This step is required so that only the rules specified in the configuration are created.",
      new: "Every VPC has a default network ACL that can be managed but not destroyed. When the provider first adopts the Default Network ACL, it **immediately removes all rules in the ACL**. It then proceeds to create any rules specified in the configuration. This step is required so that only the rules specified in the configuration are created.",
    },
    {
      old: "The following config gives the Default Network ACL the same rules that AWS includes but pulls the resource under management by Terraform. This means that any ACL rules added or changed will be detected as drift.",
      new: "The following config gives the Default Network ACL the same rules that AWS includes but pulls the resource under management by this provider. This means that any ACL rules added or changed will be detected as drift.",
    },
    {
      old: "Each AWS VPC comes with a Default Network ACL that cannot be deleted. The `aws_default_network_acl` allows you to manage this Network ACL, but Terraform cannot destroy it. Removing this resource from your configuration will remove it from your statefile and management, **but will not destroy the Network ACL.** All Subnets associations and ingress or egress rules will be left as they are at the time of removal. You can resume managing them via the AWS Console.",
      new: "Each AWS VPC comes with a Default Network ACL that cannot be deleted. The `aws_default_network_acl` allows you to manage this Network ACL, but the provider cannot destroy it. Removing this resource from your configuration will remove it from your statefile and management, **but will not destroy the Network ACL.** All Subnets associations and ingress or egress rules will be left as they are at the time of removal. You can resume managing them via the AWS Console.",
    },
  ],
  "website/docs/r/default_route_table.html.markdown": [
    {
      old: '~> **NOTE:** This is an advanced resource with special caveats. Please read this document in its entirety before using this resource. The `aws_default_route_table` resource behaves differently from normal resources. Terraform does not _create_ this resource but instead attempts to "adopt" it into management. **Do not** use both `aws_default_route_table` to manage a default route table **and** `aws_main_route_table_association` with the same VPC due to possible route conflicts. See [aws_main_route_table_association][tf-main-route-table-association] documentation for more details.',
      new: '~> **NOTE:** This is an advanced resource with special caveats. Please read this document in its entirety before using this resource. The `aws_default_route_table` resource behaves differently from normal resources. This provider does not _create_ this resource but instead attempts to "adopt" it into management. **Do not** use both `aws_default_route_table` to manage a default route table **and** `aws_main_route_table_association` with the same VPC due to possible route conflicts. See aws_main_route_table_association documentation for more details.',
    },
    {
      old: "Every VPC has a default route table that can be managed but not destroyed. When Terraform first adopts a default route table, it **immediately removes all defined routes**. It then proceeds to create any routes specified in the configuration. This step is required so that only the routes specified in the configuration exist in the default route table.",
      new: "Every VPC has a default route table that can be managed but not destroyed. When the provider first adopts a default route table, it **immediately removes all defined routes**. It then proceeds to create any routes specified in the configuration. This step is required so that only the routes specified in the configuration exist in the default route table.",
    },
    {
      old: "For more information, see the Amazon VPC User Guide on [Route Tables](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html). For information about managing normal route tables in Terraform, see `aws_route_table`.",
      new: "For more information, see the Amazon VPC User Guide on [Route Tables](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html). For information about managing normal route tables in this provider, see `aws_route_table`.",
    },
  ],
  "website/docs/r/default_security_group.html.markdown": [
    {
      old: '~> **NOTE:** This is an advanced resource with special caveats. Please read this document in its entirety before using this resource. The `aws_default_security_group` resource behaves differently from normal resources. Terraform does not _create_ this resource but instead attempts to "adopt" it into management.',
      new: '~> **NOTE:** This is an advanced resource with special caveats. Please read this document in its entirety before using this resource. The `aws_default_security_group` resource behaves differently from normal resources. This provider does not _create_ this resource but instead attempts to "adopt" it into management.',
    },
    {
      old: "When Terraform first begins managing the default security group, it **immediately removes all ingress and egress rules in the Security Group**. It then creates any rules specified in the configuration. This way only the rules specified in the configuration are created.",
      new: "When the provider first begins managing the default security group, it **immediately removes all ingress and egress rules in the Security Group**. It then creates any rules specified in the configuration. This way only the rules specified in the configuration are created.",
    },
    {
      old: "The following config gives the default security group the same rules that AWS provides by default but under management by Terraform. This means that any ingress or egress rules added or changed will be detected as drift.",
      new: "The following config gives the default security group the same rules that AWS provides by default but under management by this provider. This means that any ingress or egress rules added or changed will be detected as drift.",
    },
  ],
  "website/docs/r/default_subnet.html.markdown": [
    {
      old: 'The `aws_default_subnet` resource behaves differently from normal resources in that if a default subnet exists in the specified Availability Zone, Terraform does not _create_ this resource, but instead "adopts" it into management.',
      new: 'The `aws_default_subnet` resource behaves differently from normal resources in that if a default subnet exists in the specified Availability Zone, this provider does not _create_ this resource, but instead "adopts" it into management.',
    },
    {
      old: "If no default subnet exists, Terraform creates a new default subnet.",
      new: "If no default subnet exists, this provider creates a new default subnet.",
    },
    {
      old: "By default, `terraform destroy` does not delete the default subnet but does remove the resource from Terraform state.",
      new: "By default, `pulumi destroy` does not delete the default subnet but does remove the resource from the state.",
    },
  ],
  "website/docs/r/default_vpc.html.markdown": [
    {
      old: 'The `aws_default_vpc` resource behaves differently from normal resources in that if a default VPC exists, Terraform does not _create_ this resource, but instead "adopts" it into management.',
      new: 'The `aws_default_vpc` resource behaves differently from normal resources in that if a default VPC exists, this provider does not _create_ this resource, but instead "adopts" it into management.',
    },
    {
      old: "By default, `terraform destroy` does not delete the default VPC but does remove the resource from Terraform state.",
      new: "By default, `pulumi destroy` does not delete the default VPC but does remove the resource from the state.",
    },
  ],
  "website/docs/r/default_vpc_dhcp_options.html.markdown": [
    {
      old: 'Terraform does not _create_ this resource, but instead "adopts" it',
      new: 'this provider does not _create_ this resource, but instead "adopts" it',
    },
    {
      old: "but Terraform cannot destroy it. Removing this resource from your configuration",
      new: "but this provider cannot destroy it. Removing this resource from your configuration",
    },
  ],
  "website/docs/r/dlm_lifecycle_policy.markdown": [
    {
      old: "~> Note: You cannot have overlapping lifecycle policies that share the same `target_tags`. Terraform is unable to detect this at plan time but it will fail during apply.",
      new: "~> Note: You cannot have overlapping lifecycle policies that share the same `target_tags`. This provider is unable to detect this at plan time but it will fail during apply.",
    },
  ],
  "website/docs/r/docdb_cluster.html.markdown": [
    {
      old: "window. Because of this, Terraform may report a difference in its planning",
      new: "window. Because of this, this provider may report a difference in its planning",
    },
  ],
  "website/docs/r/docdb_cluster_instance.html.markdown": [
    {
      old: "* `identifier` - (Optional, Forces new resource) The identifier for the DocDB instance, if omitted, Terraform will assign a random, unique identifier.",
      new: "* `identifier` - (Optional, Forces new resource) The identifier for the DocDB instance, if omitted, this provider will assign a random, unique identifier.",
    },
  ],
  "website/docs/r/docdb_cluster_parameter_group.html.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) The name of the documentDB cluster parameter group. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) The name of the documentDB cluster parameter group. If omitted, this provider will assign a random, unique name.",
    },
    {
      old: '* `description` - (Optional, Forces new resource) The description of the documentDB cluster parameter group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional, Forces new resource) The description of the documentDB cluster parameter group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/docdb_global_cluster.html.markdown": [
    {
      old: "Certain resource arguments, like `source_db_cluster_identifier`, do not have an API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.",
      new: "Certain resource arguments, like `source_db_cluster_identifier`, do not have an API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use [`ignore_changes`](https://www.terraform.io/docs/configuration/meta-arguments/lifecycle.html#ignore_changes) to hide the difference, e.g.",
    },
  ],
  "website/docs/r/docdb_subnet_group.html.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) The name of the docDB subnet group. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) The name of the docDB subnet group. If omitted, this provider will assign a random, unique name.",
    },
    {
      old: '* `description` - (Optional) The description of the docDB subnet group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the docDB subnet group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/dx_hosted_private_virtual_interface_accepter.html.markdown": [
    {
      old: "However, Terraform only allows the Direct Connect hosted private virtual interface to be deleted from the allocator's side",
      new: "However, this provider only allows the Direct Connect hosted private virtual interface to be deleted from the allocator's side",
    },
  ],
  "website/docs/r/dx_hosted_public_virtual_interface_accepter.html.markdown": [
    {
      old: "However, Terraform only allows the Direct Connect hosted public virtual interface to be deleted from the allocator's side",
      new: "However, this provider only allows the Direct Connect hosted public virtual interface to be deleted from the allocator's side",
    },
  ],
  "website/docs/r/dx_hosted_transit_virtual_interface_accepter.html.markdown": [
    {
      old: "-> **NOTE:** AWS allows a Direct Connect hosted transit virtual interface to be deleted from either the allocator's or accepter's side. However, Terraform only allows the Direct Connect hosted transit virtual interface to be deleted from the allocator's side by removing the corresponding `aws_dx_hosted_transit_virtual_interface` resource from your configuration. Removing a `aws_dx_hosted_transit_virtual_interface_accepter` resource from your configuration will remove it from your statefile and management, **but will not delete the Direct Connect virtual interface.**",
      new: "-> **NOTE:** AWS allows a Direct Connect hosted transit virtual interface to be deleted from either the allocator's or accepter's side. However, this provider only allows the Direct Connect hosted transit virtual interface to be deleted from the allocator's side by removing the corresponding `aws_dx_hosted_transit_virtual_interface` resource from your configuration. Removing a `aws_dx_hosted_transit_virtual_interface_accepter` resource from your configuration will remove it from your statefile and management, **but will not delete the Direct Connect virtual interface.**",
    },
  ],
  "website/docs/r/dx_lag.html.markdown": [
    {
      old: "~> *NOTE:* When creating a LAG, if no existing connection is specified, Direct Connect will create a connection and Terraform will remove this unmanaged connection during resource creation.",
      new: "~> *NOTE:* When creating a LAG, if no existing connection is specified, Direct Connect will create a connection and this provider will remove this unmanaged connection during resource creation.",
    },
  ],
  "website/docs/r/ebs_encryption_by_default.html.markdown": [
    {
      old: "~> **NOTE:** Removing this Terraform resource disables default EBS encryption.",
      new: "~> **NOTE:** Removing this resource disables default EBS encryption.",
    },
  ],
  "website/docs/r/ec2_availability_zone_group.html.markdown": [
    {
      old: "~> **NOTE:** This is an advanced Terraform resource. Terraform will automatically assume management of the EC2 Availability Zone Group without import and perform no actions on removal from configuration.",
      new: "~> **NOTE:** This is an advanced resource. The provider will automatically assume management of the EC2 Availability Zone Group without import and perform no actions on removal from configuration.",
    },
  ],
  "website/docs/r/ec2_client_vpn_endpoint.html.markdown": [
    {
      old: "~> **NOTE on Client VPN endpoint target network security groups:** Terraform provides both a standalone Client VPN endpoint network association resource with a (deprecated) `security_groups` argument and a Client VPN endpoint resource with a `security_group_ids` argument. Do not specify security groups in both resources. Doing so will cause a conflict and will overwrite the target network security group association.",
      new: "~> **NOTE on Client VPN endpoint target network security groups:** this provider provides both a standalone Client VPN endpoint network association resource with a (deprecated) `security_groups` argument and a Client VPN endpoint resource with a `security_group_ids` argument. Do not specify security groups in both resources. Doing so will cause a conflict and will overwrite the target network security group association.",
    },
    {
      old: '  description            = "terraform-clientvpn-example"',
      new: '  description            = "clientvpn-example"',
    },
  ],
  "website/docs/r/ec2_client_vpn_network_association.html.markdown": [
    {
      old: "~> **NOTE on Client VPN endpoint target network security groups:** Terraform provides both a standalone Client VPN endpoint network association resource with a (deprecated) `security_groups` argument and a Client VPN endpoint resource with a `security_group_ids` argument. Do not specify security groups in both resources. Doing so will cause a conflict and will overwrite the target network security group association.",
      new: "~> **NOTE on Client VPN endpoint target network security groups:** Terraform provides both a standalone Client VPN endpoint network association resource with a (deprecated) `security_groups` argument and a [Client VPN endpoint](ec2_client_vpn_endpoint.html) resource with a `security_group_ids` argument. Do not specify security groups in both resources. Doing so will cause a conflict and will overwrite the target network security group association.",
    },
  ],
  "website/docs/r/ec2_tag.html.markdown": [
    {
      old: "Manages an individual EC2 resource tag. This resource should only be used in cases where EC2 resources are created outside Terraform (e.g., AMIs), being shared via Resource Access Manager (RAM), or implicitly created by other means (e.g., Transit Gateway VPN Attachments).",
      new: "Manages an individual EC2 resource tag. This resource should only be used in cases where EC2 resources are created outside the provider (e.g. AMIs), being shared via Resource Access Manager (RAM), or implicitly created by other means (e.g. Transit Gateway VPN Attachments).",
    },
    {
      old: "~> **NOTE:** This tagging resource should not be combined with the Terraform resource for managing the parent resource. For example, using `aws_vpc` and `aws_ec2_tag` to manage tags of the same VPC will cause a perpetual difference where the `aws_vpc` resource will try to remove the tag being added by the `aws_ec2_tag` resource.",
      new: "~> **NOTE:** This tagging resource should not be combined with the providers resource for managing the parent resource. For example, using `aws_vpc` and `aws_ec2_tag` to manage tags of the same VPC will cause a perpetual difference where the `aws_vpc` resource will try to remove the tag being added by the `aws_ec2_tag` resource.",
    },
  ],
  "website/docs/r/ec2_traffic_mirror_filter.html.markdown": [
    {
      old: '  description      = "traffic mirror filter - terraform example"',
      new: '  description      = "traffic mirror filter - example"',
    },
  ],
  "website/docs/r/ec2_traffic_mirror_filter_rule.html.markdown": [
    {
      old: '  description      = "traffic mirror filter - terraform example"',
      new: '  description      = "traffic mirror filter - example"',
    },
  ],
  "website/docs/r/ec2_traffic_mirror_session.html.markdown": [
    {
      old: '  description      = "traffic mirror filter - terraform example"',
      new: '  description      = "traffic mirror filter - example"',
    },
    {
      old: '  description              = "traffic mirror session - terraform example"',
      new: '  description              = "traffic mirror session - example"',
    },
  ],
  "website/docs/r/ecr_lifecycle_policy.html.markdown": [
    {
      old: "~> **NOTE:** The AWS ECR API seems to reorder rules based on `rulePriority`. If you define multiple rules that are not sorted in ascending `rulePriority` order in the Terraform code, the resource will be flagged for recreation every `terraform plan`.",
      new: "~> **NOTE:** The AWS ECR API seems to reorder rules based on `rulePriority`. If you define multiple rules that are not sorted in ascending `rulePriority` order in the this provider code, the resource will be flagged for recreation every deployment.",
    },
  ],
  "website/docs/r/ecr_registry_policy.html.markdown": [
    {
      old: "* `policy` - (Required) The policy document. This is a JSON formatted string. For more information about building IAM policy documents with Terraform, see the AWS IAM Policy Document Guide",
      new: "* `policy` - (Required) The policy document. This is a JSON formatted string. For more information about building IAM policy documents with Terraform, see the [AWS IAM Policy Document Guide](https://learn.hashicorp.com/terraform/aws/iam-policy)",
    },
  ],
  "website/docs/r/ecr_repository_policy.html.markdown": [
    {
      old: "* `policy` - (Required) The policy document. This is a JSON formatted string. For more information about building IAM policy documents with Terraform, see the AWS IAM Policy Document Guide",
      new: "* `policy` - (Required) The policy document. This is a JSON formatted string.",
    },
  ],
  "website/docs/r/ecrpublic_repository_policy.html.markdown": [
    {
      old: "* `policy` - (Required) The policy document. This is a JSON formatted string. For more information about building IAM policy documents with Terraform, see the AWS IAM Policy Document Guide",
      new: "* `policy` - (Required) The policy document. This is a JSON formatted string. For more information about building IAM policy documents with Terraform, see the [AWS IAM Policy Document Guide](https://learn.hashicorp.com/terraform/aws/iam-policy)",
    },
  ],
  "website/docs/r/ecs_account_setting_default.html.markdown": [
    {
      old: '~> **NOTE:** Your AWS account may not support disabling `containerInstanceLongArnFormat`, `serviceLongArnFormat`, and `taskLongArnFormat`. If your account does not support disabling these, "destroying" this resource will not disable the setting nor cause a Terraform error. However, the AWS Provider will log an AWS error: `InvalidParameterException: You can no longer disable Long Arn settings`.',
      new: '~> **NOTE:** Your AWS account may not support disabling `containerInstanceLongArnFormat`, `serviceLongArnFormat`, and `taskLongArnFormat`. If your account does not support disabling these, "destroying" this resource will not disable the setting nor cause a provider error. However, the AWS Provider will log an AWS error: `InvalidParameterException: You can no longer disable Long Arn settings`.',
    },
  ],
  "website/docs/r/ecs_capacity_provider.html.markdown": [
    {
      old: "~> **NOTE:** Associating an ECS Capacity Provider to an Auto Scaling Group will automatically add the `AmazonECSManaged` tag to the Auto Scaling Group. This tag should be included in the `aws_autoscaling_group` resource configuration to prevent Terraform from removing it in subsequent executions as well as ensuring the `AmazonECSManaged` tag is propagated to all EC2 Instances in the Auto Scaling Group if `min_size` is above 0 on creation. Any EC2 Instances in the Auto Scaling Group without this tag must be manually be updated, otherwise they may cause unexpected scaling behavior and metrics.",
      new: "~> **NOTE:** Associating an ECS Capacity Provider to an Auto Scaling Group will automatically add the `AmazonECSManaged` tag to the Auto Scaling Group. This tag should be included in the `aws_autoscaling_group` resource configuration to prevent the provider from removing it in subsequent executions as well as ensuring the `AmazonECSManaged` tag is propagated to all EC2 Instances in the Auto Scaling Group if `min_size` is above 0 on creation. Any EC2 Instances in the Auto Scaling Group without this tag must be manually be updated, otherwise they may cause unexpected scaling behavior and metrics.",
    },
  ],
  "website/docs/r/ecs_cluster.html.markdown": [
    {
      old: "~> **NOTE on Clusters and Cluster Capacity Providers:** Terraform provides both a standalone `aws_ecs_cluster_capacity_providers` resource, as well as allowing the capacity providers and default strategies to be managed in-line by the `aws_ecs_cluster` resource. You cannot use a Cluster with in-line capacity providers in conjunction with the Capacity Providers resource, nor use more than one Capacity Providers resource with a single Cluster, as doing so will cause a conflict and will lead to mutual overwrites.",
      new: "~> **NOTE on Clusters and Cluster Capacity Providers:** this provider provides both a standalone `aws_ecs_cluster_capacity_providers` resource, as well as allowing the capacity providers and default strategies to be managed in-line by the `aws_ecs_cluster` resource. You cannot use a Cluster with in-line capacity providers in conjunction with the Capacity Providers resource, nor use more than one Capacity Providers resource with a single Cluster, as doing so will cause a conflict and will lead to mutual overwrites.",
    },
  ],
  "website/docs/r/ecs_cluster_capacity_providers.html.markdown": [
    {
      old: "~> **NOTE on Clusters and Cluster Capacity Providers:** Terraform provides both a standalone `aws_ecs_cluster_capacity_providers` resource, as well as allowing the capacity providers and default strategies to be managed in-line by the `aws_ecs_cluster` resource. You cannot use a Cluster with in-line capacity providers in conjunction with the Capacity Providers resource, nor use more than one Capacity Providers resource with a single Cluster, as doing so will cause a conflict and will lead to mutual overwrites.",
      new: "~> **NOTE on Clusters and Cluster Capacity Providers:** Terraform provides both a standalone `aws_ecs_cluster_capacity_providers` resource, as well as allowing the capacity providers and default strategies to be managed in-line by the [`aws_ecs_cluster`](/docs/providers/aws/r/ecs_cluster.html) resource. You cannot use a Cluster with in-line capacity providers in conjunction with the Capacity Providers resource, nor use more than one Capacity Providers resource with a single Cluster, as doing so will cause a conflict and will lead to mutual overwrites.",
    },
  ],
  "website/docs/r/ecs_service.html.markdown": [
    {
      old: "You can utilize the generic Terraform resource lifecycle configuration block with `ignore_changes` to create an ECS service with an initial count of running instances, then ignore any changes to that count caused externally (e.g., Application Autoscaling).",
      new: "You can use [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to create an ECS service with an initial count of running instances, then ignore any changes to that count caused externally (e.g. Application Autoscaling).",
    },
    {
      old: "  # Optional: Allow external changes without Terraform plan difference",
      new: "  # Optional: Allow external changes without this provider plan difference",
    },
    {
      old: "* `wait_for_steady_state` - (Optional) If `true`, Terraform will wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.",
      new: "* `wait_for_steady_state` - (Optional) If `true`, this provider will wait for the service to reach a steady state (like [`aws ecs wait services-stable`](https://docs.aws.amazon.com/cli/latest/reference/ecs/wait/services-stable.html)) before continuing. Default `false`.",
    },
    {
      old: "-> **Version note:** Multiple `load_balancer` configuration block support was added in Terraform AWS Provider version 2.22.0. This allows configuration of [ECS service support for multiple target groups](https://aws.amazon.com/about-aws/whats-new/2019/07/amazon-ecs-services-now-support-multiple-load-balancer-target-groups/).",
      new: "-> **Version note:** Multiple `load_balancer` configuration block support was added in version 2.22.0 of the provider. This allows configuration of [ECS service support for multiple target groups](https://aws.amazon.com/about-aws/whats-new/2019/07/amazon-ecs-services-now-support-multiple-load-balancer-target-groups/).",
    },
  ],
  "website/docs/r/ecs_task_definition.html.markdown": [
    {
      old: '~> **NOTE:** Proper escaping is required for JSON field values containing quotes (`"`) such as `environment` values. If directly setting the JSON, they should be escaped as `\\"` in the JSON,  e.g., `"value": "I \\"love\\" escaped quotes"`. If using a Terraform variable value, they should be escaped as `\\\\\\"` in the variable, e.g., `value = "I \\\\\\"love\\\\\\" escaped quotes"` in the variable and `"value": "${var.myvariable}"` in the JSON.',
      new: '~> **NOTE:** Proper escaping is required for JSON field values containing quotes (`"`) such as `environment` values. If directly setting the JSON, they should be escaped as `\\"` in the JSON,  e.g., `"value": "I \\"love\\" escaped quotes"`. If using a variable value, they should be escaped as `\\\\\\"` in the variable, e.g., `value = "I \\\\\\"love\\\\\\" escaped quotes"` in the variable and `"value": "${var.myvariable}"` in the JSON.',
    },
  ],
  "website/docs/r/ecs_task_set.html.markdown": [
    {
      old: "You can utilize the generic Terraform resource lifecycle configuration block with `ignore_changes` to create an ECS service with an initial count of running instances, then ignore any changes to that count caused externally (e.g. Application Autoscaling).",
      new: "You can utilize the generic Terraform resource [lifecycle configuration block](https://www.terraform.io/docs/configuration/meta-arguments/lifecycle.html) with `ignore_changes` to create an ECS service with an initial count of running instances, then ignore any changes to that count caused externally (e.g. Application Autoscaling).",
    },
  ],
  "website/docs/r/efs_file_system.html.markdown": [
    {
      old: "system creation. By default generated by Terraform. See [Elastic File System](http://docs.aws.amazon.com/efs/latest/ug/)",
      new: "system creation. By default generated by this provider. See [Elastic File System]",
    },
  ],
  "website/docs/r/efs_mount_target.html.markdown": [
    {
      old: "and VPC resource in Terraform for more information.",
      new: "for more information.",
    },
  ],
  "website/docs/r/eks_node_group.html.markdown": [
    {
      old: "You can utilize the generic Terraform resource lifecycle configuration block with `ignore_changes` to create an EKS Node Group with an initial size of running instances, then ignore any changes to that count caused externally (e.g., Application Autoscaling).",
      new: "You can utilize [ignoreChanges](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) create an EKS Node Group with an initial size of running instances, then ignore any changes to that count caused externally (e.g. Application Autoscaling).",
    },
    {
      old: "* `ami_type` - (Optional) Type of Amazon Machine Image (AMI) associated with the EKS Node Group. See the [AWS documentation](https://docs.aws.amazon.com/eks/latest/APIReference/API_Nodegroup.html#AmazonEKS-Type-Nodegroup-amiType) for valid values. Terraform will only perform drift detection if a configuration value is provided.",
      new: "* `capacity_type` - (Optional) Type of capacity associated with the EKS Node Group. Valid values: `ON_DEMAND`, `SPOT`. This provider will only perform drift detection if a configuration value is provided.",
    },
    {
      old: "* `capacity_type` - (Optional) Type of capacity associated with the EKS Node Group. Valid values: `ON_DEMAND`, `SPOT`. Terraform will only perform drift detection if a configuration value is provided.",
      new: "* `disk_size` - (Optional) Disk size in GiB for worker nodes. Defaults to `20`. This provider will only perform drift detection if a configuration value is provided.",
    },
  ],
  "website/docs/r/elastic_beanstalk_application_version.html.markdown": [
    {
      old: '  description = "application version created by terraform"',
      new: '  description = "application version"',
    },
  ],
  "website/docs/r/elastic_beanstalk_environment.html.markdown": [
    {
      old: "  [duration](https://golang.org/pkg/time/#ParseDuration) that Terraform should",
      new: "  [duration](https://golang.org/pkg/time/#ParseDuration) that this provider should",
    },
  ],
  "website/docs/r/elasticache_cluster.html.markdown": [
    {
      old: "it is applied in the next maintenance window. Because of this, Terraform may report",
      new: "it is applied in the next maintenance window. Because of this, this provider may report",
    },
  ],
  "website/docs/r/elasticache_global_replication_group.html.markdown": [
    {
      old: "The global replication group depends on the primary group existing. Secondary replication groups depend on the global replication group. Terraform dependency management will handle this transparently using resource value references.",
      new: "The global replication group depends on the primary group existing. Secondary replication groups depend on the global replication group. the provider dependency management will handle this transparently using resource value references.",
    },
  ],
  "website/docs/r/elasticache_parameter_group.html.markdown": [
    {
      old: "~> **NOTE:** Attempting to remove the `reserved-memory` parameter when `family` is set to `redis2.6` or `redis2.8` may show a perpetual difference in Terraform due to an ElastiCache API limitation. Leave that parameter configured with any value to workaround the issue.",
      new: "~> **NOTE:** Attempting to remove the `reserved-memory` parameter when `family` is set to `redis2.6` or `redis2.8` may show a perpetual difference in this provider due to an ElastiCache API limitation. Leave that parameter configured with any value to workaround the issue.",
    },
    {
      old: '* `description` - (Optional) The description of the ElastiCache parameter group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the ElastiCache parameter group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/elasticache_replication_group.html.markdown": [
    {
      old: "of this, Terraform may report a difference in its planning phase because the",
      new: "of this, this provider may report a difference in its planning phase because the",
    },
    {
      old: "* Otherwise for fine grained control of the underlying cache clusters, they can be added or removed with the `aws_elasticache_cluster` resource and its `replication_group_id` attribute. In this situation, you will need to utilize the lifecycle configuration block with `ignore_changes` to prevent perpetual differences during Terraform plan with the `num_cache_cluster` attribute.",
      new: "* Otherwise for fine grained control of the underlying cache clusters, they can be added or removed with the `aws_elasticache_cluster` resource and its `replication_group_id` attribute. In this situation, you will need to utilize [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to prevent perpetual differences with the `number_cache_cluster` attribute.",
    },
  ],
  "website/docs/r/elasticache_security_group.html.markdown": [
    {
      old: "!> **WARNING:** With the retirement of EC2-Classic the `aws_elasticache_security_group` resource has been deprecated and will be removed in a future version. Any existing resources can be removed from Terraform state using the `terraform state rm` command.",
      new: "!> **WARNING:** With the retirement of EC2-Classic the `aws_elasticache_security_group` resource has been deprecated and will be removed in a future version. Any existing resources can be removed from [Terraform state](https://www.terraform.io/language/state) using the [`terraform state rm`](https://www.terraform.io/cli/commands/state/rm#command-state-rm) command.",
    },
    {
      old: '* `description` – (Optional) description for the cache security group. Defaults to "Managed by Terraform".',
      new: '* `description` – (Optional) description for the cache security group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/elasticache_subnet_group.html.markdown": [
    {
      old: '* `description` – (Optional) Description for the cache subnet group. Defaults to "Managed by Terraform".',
      new: '* `description` – (Optional) Description for the cache subnet group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/elasticsearch_domain.html.markdown": [
    {
      old: "  Terraform resource for managing an AWS Elasticsearch Domain.",
      new: "  Provides a resource for managing an AWS Elasticsearch Domain.",
    },
    {
      old: '  description = "Managed by Terraform"',
      new: '  description = "Managed by Pulumi"',
    },
  ],
  "website/docs/r/elastictranscoder_preset.html.markdown": [
    {
      old: '    id                = "Terraform Test"',
      new: '    id                = "Test"',
    },
  ],
  "website/docs/r/elb.html.markdown": [
    {
      old: "~> **NOTE on ELB Instances and ELB Attachments:** Terraform currently",
      new: "~> **NOTE on ELB Instances and ELB Attachments:** This provider currently",
    },
    {
      old: '  name               = "foobar-terraform-elb"',
      new: '  name               = "foobar-elb"',
    },
    {
      old: '    Name = "foobar-terraform-elb"',
      new: '    Name = "foobar-elb"',
    },
    {
      old: "* `name` - (Optional) The name of the ELB. By default generated by Terraform.",
      new: "* `name` - (Optional) The name of the ELB. By default generated by this provider.",
    },
  ],
  "website/docs/r/elb_attachment.html.markdown": [
    {
      old: "~> **NOTE on ELB Instances and ELB Attachments:** Terraform currently provides",
      new: "~> **NOTE on ELB Instances and ELB Attachments:** This provider currently provides",
    },
  ],
  "website/docs/r/emr_cluster.html.markdown": [
    {
      old: "The `aws_emr_cluster` resource typically requires two IAM roles, one for the EMR Cluster to use as a service, and another to place on your Cluster Instances to interact with AWS from those instances. The suggested role policy template for the EMR service is `AmazonElasticMapReduceRole`, and `AmazonElasticMapReduceforEC2Role` for the EC2 profile. See the [Getting Started](https://docs.aws.amazon.com/ElasticMapReduce/latest/ManagementGuide/emr-gs-launch-sample-cluster.html) guide for more information on these IAM roles. There is also a fully-bootable example Terraform configuration at the bottom of this page.",
      new: "The `aws_emr_cluster` resource typically requires two IAM roles, one for the EMR Cluster to use as a service, and another to place on your Cluster Instances to interact with AWS from those instances. The suggested role policy template for the EMR service is `AmazonElasticMapReduceRole`, and `AmazonElasticMapReduceforEC2Role` for the EC2 profile. See the [Getting Started](https://docs.aws.amazon.com/ElasticMapReduce/latest/ManagementGuide/emr-gs-launch-sample-cluster.html) guide for more information on these IAM roles.",
    },
    {
      old: "[Debug logging in EMR](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-debugging.html) is implemented as a step. It is highly recommended that you utilize the lifecycle configuration block with `ignore_changes` if other steps are being managed outside of Terraform.",
      new: "[Debug logging in EMR](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-debugging.html) is implemented as a step. It is highly recommended that you utilize the resource options configuration with `ignoreChanges` if other steps are being managed outside of this provider.",
    },
    {
      old: "* `step` - (Optional) List of steps to run when creating the cluster. See below. It is highly recommended to utilize the lifecycle configuration block with `ignore_changes` if other steps are being managed outside of Terraform. This argument is processed in attribute-as-blocks mode.",
      new: "* `step` - (Optional) List of steps to run when creating the cluster. See below. It is highly recommended to utilize the lifecycle resource options block with `ignoreChanges` if other steps are being managed outside of this provider.",
    },
    {
      old: "~> **NOTE on EMR-Managed security groups:** These security groups will have any missing inbound or outbound access rules added and maintained by AWS, to ensure proper communication between instances in a cluster. The EMR service will maintain these rules for groups provided in `emr_managed_master_security_group` and `emr_managed_slave_security_group`; attempts to remove the required rules may succeed, only for the EMR service to re-add them in a matter of minutes. This may cause Terraform to fail to destroy an environment that contains an EMR cluster, because the EMR service does not revoke rules added on deletion, leaving a cyclic dependency between the security groups that prevents their deletion. To avoid this, use the `revoke_rules_on_delete` optional attribute for any Security Group used in `emr_managed_master_security_group` and `emr_managed_slave_security_group`. See [Amazon EMR-Managed Security Groups](http://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-man-sec-groups.html) for more information about the EMR-managed security group rules.",
      new: "~> **NOTE on EMR-Managed security groups:** These security groups will have any missing inbound or outbound access rules added and maintained by AWS, to ensure proper communication between instances in a cluster. The EMR service will maintain these rules for groups provided in `emr_managed_master_security_group` and `emr_managed_slave_security_group`; attempts to remove the required rules may succeed, only for the EMR service to re-add them in a matter of minutes. This may cause this provider to fail to destroy an environment that contains an EMR cluster, because the EMR service does not revoke rules added on deletion, leaving a cyclic dependency between the security groups that prevents their deletion. To avoid this, use the `revoke_rules_on_delete` optional attribute for any Security Group used in `emr_managed_master_security_group` and `emr_managed_slave_security_group`. See [Amazon EMR-Managed Security Groups](http://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-man-sec-groups.html) for more information about the EMR-managed security group rules.",
    },
    {
      old: "* `ad_domain_join_password` - (Optional) Active Directory password for `ad_domain_join_user`. Terraform cannot perform drift detection of this configuration.",
      new: "* `ad_domain_join_password` - (Optional) Active Directory password for `ad_domain_join_user`. This provider cannot perform drift detection of this configuration.",
    },
    {
      old: "* `ad_domain_join_user` - (Optional) Required only when establishing a cross-realm trust with an Active Directory domain. A user with sufficient privileges to join resources to the domain. Terraform cannot perform drift detection of this configuration.",
      new: "* `ad_domain_join_user` - (Optional) Required only when establishing a cross-realm trust with an Active Directory domain. A user with sufficient privileges to join resources to the domain. This provider cannot perform drift detection of this configuration.",
    },
    {
      old: "* `cross_realm_trust_principal_password` - (Optional) Required only when establishing a cross-realm trust with a KDC in a different realm. The cross-realm principal password, which must be identical across realms. Terraform cannot perform drift detection of this configuration.",
      new: "* `cross_realm_trust_principal_password` - (Optional) Required only when establishing a cross-realm trust with a KDC in a different realm. The cross-realm principal password, which must be identical across realms. This provider cannot perform drift detection of this configuration.",
    },
    {
      old: "* `kdc_admin_password` - (Required) Password used within the cluster for the kadmin service on the cluster-dedicated KDC, which maintains Kerberos principals, password policies, and keytabs for the cluster. Terraform cannot perform drift detection of this configuration.",
      new: "* `kdc_admin_password` - (Required) Password used within the cluster for the kadmin service on the cluster-dedicated KDC, which maintains Kerberos principals, password policies, and keytabs for the cluster. This provider cannot perform drift detection of this configuration.",
    },
    {
      old: "* `instance_count` - (Optional) Target number of instances for the instance group. Must be 1 or 3. Defaults to 1. Launching with multiple master nodes is only supported in EMR version 5.23.0+, and requires this resource's `core_instance_group` to be configured. Public (Internet accessible) instances must be created in VPC subnets that have map public IP on launch enabled. Termination protection is automatically enabled when launched with multiple master nodes and Terraform must have the `termination_protection = false` configuration applied before destroying this resource.",
      new: "* `instance_count` - (Optional) Target number of instances for the instance group. Must be 1 or 3. Defaults to 1. Launching with multiple master nodes is only supported in EMR version 5.23.0+, and requires this resource's `core_instance_group` to be configured. Public (Internet accessible) instances must be created in VPC subnets that have map public IP on launch enabled. Termination protection is automatically enabled when launched with multiple master nodes and this provider must have the `termination_protection = false` configuration applied before destroying this resource.",
    },
  ],
  "website/docs/r/emr_instance_fleet.html.markdown": [
    {
      old: "Terraform will resize any Instance Fleet to zero when destroying the resource.",
      new: "the provider will resize any Instance Fleet to zero when destroying the resource.",
    },
  ],
  "website/docs/r/emr_instance_group.html.markdown": [
    {
      old: "Terraform will resize any Instance Group to zero when destroying the resource.",
      new: "this provider will resize any Instance Group to zero when destroying the resource.",
    },
  ],
  "website/docs/r/emr_security_configuration.html.markdown": [
    {
      old: "* `name` - (Optional) The name of the EMR Security Configuration. By default generated by Terraform.",
      new: "* `name` - (Optional) The name of the EMR Security Configuration. By default generated by this provider.",
    },
  ],
  "website/docs/r/fsx_lustre_file_system.html.markdown": [
    {
      old: "Certain resource arguments, like `security_group_ids`, do not have a FSx API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `security_group_ids`, do not have a FSx API method for reading the information after creation. If the argument is set in the provider configuration on an imported resource, this provider will always show a difference. To workaround this behavior, either omit the argument from the provider configuration or use [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to hide the difference, e.g.",
    },
  ],
  "website/docs/r/fsx_ontap_file_system.html.markdown": [
    {
      old: "Certain resource arguments, like `security_group_ids`, do not have a FSx API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `security_group_ids`, do not have a FSx API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use [`ignore_changes`](https://www.terraform.io/docs/configuration/meta-arguments/lifecycle.html#ignore_changes) to hide the difference, e.g.,",
    },
  ],
  "website/docs/r/fsx_ontap_storage_virtual_machine.html.markdown": [
    {
      old: "Certain resource arguments, like `svm_admin_password` and the `self_managed_active_directory` configuation block `password`, do not have a FSx API method for reading the information after creation. If these arguments are set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `svm_admin_password` and the `self_managed_active_directory` configuation block `password`, do not have a FSx API method for reading the information after creation. If these arguments are set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use [`ignore_changes`](https://www.terraform.io/docs/configuration/meta-arguments/lifecycle.html#ignore_changes) to hide the difference, e.g.,",
    },
  ],
  "website/docs/r/fsx_openzfs_file_system.html.markdown": [
    {
      old: "Certain resource arguments, like `security_group_ids`, do not have a FSx API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `security_group_ids`, do not have a FSx API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use [`ignore_changes`](https://www.terraform.io/docs/configuration/meta-arguments/lifecycle.html#ignore_changes) to hide the difference, e.g.,",
    },
  ],
  "website/docs/r/fsx_windows_file_system.html.markdown": [
    {
      old: "Certain resource arguments, like `security_group_ids` and the `self_managed_active_directory` configuation block `password`, do not have a FSx API method for reading the information after creation. If these arguments are set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `security_group_ids` and the `self_managed_active_directory` configuation block `password`, do not have a FSx API method for reading the information after creation. If these arguments are set in the provider configuration on an imported resource, the povider will always show a difference. To workaround this behavior, either omit the argument from the configuration or use [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to hide the difference, e.g.",
    },
  ],
  "website/docs/r/glacier_vault_lock.html.markdown": [
    {
      old: "~> **NOTE:** This resource allows you to test Glacier Vault Lock policies by setting the `complete_lock` argument to `false`. When testing policies in this manner, the Glacier Vault Lock automatically expires after 24 hours and Terraform will show this resource as needing recreation after that time. To permanently apply the policy, set the `complete_lock` argument to `true`. When changing `complete_lock` to `true`, it is expected the resource will show as recreating.",
      new: "~> **NOTE:** This resource allows you to test Glacier Vault Lock policies by setting the `complete_lock` argument to `false`. When testing policies in this manner, the Glacier Vault Lock automatically expires after 24 hours and this provider will show this resource as needing recreation after that time. To permanently apply the policy, set the `complete_lock` argument to `true`. When changing `complete_lock` to `true`, it is expected the resource will show as recreating.",
    },
    {
      old: "!> **WARNING:** Once a Glacier Vault Lock is completed, it is immutable. The deletion of the Glacier Vault Lock is not be possible and attempting to remove it from Terraform will return an error. Set the `ignore_deletion_error` argument to `true` and apply this configuration before attempting to delete this resource via Terraform or use `terraform state rm` to remove this resource from Terraform management.",
      new: "!> **WARNING:** Once a Glacier Vault Lock is completed, it is immutable. The deletion of the Glacier Vault Lock is not be possible and attempting to remove it from this provider will return an error. Set the `ignore_deletion_error` argument to `true` and apply this configuration before attempting to delete this resource via this provider or remove this resource from this provider's management.",
    },
    {
      old: "* `complete_lock` - (Required) Boolean whether to permanently apply this Glacier Lock Policy. Once completed, this cannot be undone. If set to `false`, the Glacier Lock Policy remains in a testing mode for 24 hours. After that time, the Glacier Lock Policy is automatically removed by Glacier and the Terraform resource will show as needing recreation. Changing this from `false` to `true` will show as resource recreation, which is expected. Changing this from `true` to `false` is not possible unless the Glacier Vault is recreated at the same time.",
      new: "* `complete_lock` - (Required) Boolean whether to permanently apply this Glacier Lock Policy. Once completed, this cannot be undone. If set to `false`, the Glacier Lock Policy remains in a testing mode for 24 hours. After that time, the Glacier Lock Policy is automatically removed by Glacier and the this provider resource will show as needing recreation. Changing this from `false` to `true` will show as resource recreation, which is expected. Changing this from `true` to `false` is not possible unless the Glacier Vault is recreated at the same time.",
    },
    {
      old: "* `ignore_deletion_error` - (Optional) Allow Terraform to ignore the error returned when attempting to delete the Glacier Lock Policy. This can be used to delete or recreate the Glacier Vault via Terraform, for example, if the Glacier Vault Lock policy permits that action. This should only be used in conjunction with `complete_lock` being set to `true`.",
      new: "* `ignore_deletion_error` - (Optional) Allow this provider to ignore the error returned when attempting to delete the Glacier Lock Policy. This can be used to delete or recreate the Glacier Vault via this provider, for example, if the Glacier Vault Lock policy permits that action. This should only be used in conjunction with `complete_lock` being set to `true`.",
    },
  ],
  "website/docs/r/globalaccelerator_endpoint_group.html.markdown": [
    {
      old: "* `health_check_path` - (Optional) If the protocol is HTTP/S, then this specifies the path that is the destination for health check targets. The default value is slash (`/`). Terraform will only perform drift detection of its value when present in a configuration.",
      new: "* `health_check_path` - (Optional) If the protocol is HTTP/S, then this specifies the path that is the destination for health check targets. The default value is slash (`/`). the provider will only perform drift detection of its value when present in a configuration.",
    },
    {
      old: "Terraform will only perform drift detection of its value when present in a configuration.",
      new: "  the provider will only perform drift detection of its value when present in a configuration.",
    },
    {
      old: "**Note:** When client IP address preservation is enabled, the Global Accelerator service creates an EC2 Security Group in the VPC named `GlobalAccelerator` that must be deleted (potentially outside of Terraform) before the VPC will successfully delete. If this EC2 Security Group is not deleted, Terraform will retry the VPC deletion for a few minutes before reporting a `DependencyViolation` error. This cannot be resolved by re-running Terraform.",
      new: "**Note:** When client IP address preservation is enabled, the Global Accelerator service creates an EC2 Security Group in the VPC named `GlobalAccelerator` that must be deleted (potentially outside of the provider) before the VPC will successfully delete. If this EC2 Security Group is not deleted, the provider will retry the VPC deletion for a few minutes before reporting a `DependencyViolation` error. This cannot be resolved by re-running the provider.",
    },
  ],
  "website/docs/r/guardduty_detector.html.markdown": [
    {
      old: "* `finding_publishing_frequency` - (Optional) Specifies the frequency of notifications sent for subsequent finding occurrences. If the detector is a GuardDuty member account, the value is determined by the GuardDuty primary account and cannot be modified, otherwise defaults to `SIX_HOURS`. For standalone and GuardDuty primary accounts, it must be configured in Terraform to enable drift detection. Valid values for standalone and primary accounts: `FIFTEEN_MINUTES`, `ONE_HOUR`, `SIX_HOURS`. See [AWS Documentation](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_cloudwatch.html#guardduty_findings_cloudwatch_notification_frequency) for more information.",
      new: "* `finding_publishing_frequency` - (Optional) Specifies the frequency of notifications sent for subsequent finding occurrences. If the detector is a GuardDuty member account, the value is determined by the GuardDuty primary account and cannot be modified, otherwise defaults to `SIX_HOURS`. For standalone and GuardDuty primary accounts, it must be configured in this provider to enable drift detection. Valid values for standalone and primary accounts: `FIFTEEN_MINUTES`, `ONE_HOUR`, `SIX_HOURS`. See [AWS Documentation](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_cloudwatch.html#guardduty_findings_cloudwatch_notification_frequency) for more information.",
    },
  ],
  "website/docs/r/guardduty_member.html.markdown": [
    {
      old: "* `invite` - (Optional) Boolean whether to invite the account to GuardDuty as a member. Defaults to `false`. To detect if an invitation needs to be (re-)sent, the Terraform state value is `true` based on a `relationship_status` of `Disabled`, `Enabled`, `Invited`, or `EmailVerificationInProgress`.",
      new: "* `invite` - (Optional) Boolean whether to invite the account to GuardDuty as a member. Defaults to `false`. To detect if an invitation needs to be (re-)sent, the this provider state value is `true` based on a `relationship_status` of `Disabled`, `Enabled`, `Invited`, or `EmailVerificationInProgress`.",
    },
  ],
  "website/docs/r/guardduty_organization_configuration.html.markdown": [
    {
      old: "~> **NOTE:** This is an advanced Terraform resource. Terraform will automatically assume management of the GuardDuty Organization Configuration without import and perform no actions on removal from the Terraform configuration.",
      new: "~> **NOTE:** This is an advanced resource. The provider will automatically assume management of the GuardDuty Organization Configuration without import and perform no actions on removal from the resource configuration.",
    },
  ],
  "website/docs/r/iam_instance_profile.html.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) Name of the instance profile. If omitted, Terraform will assign a random, unique name. Conflicts with `name_prefix`. Can be a string of characters consisting of upper and lowercase alphanumeric characters and these special characters: `_`, `+`, `=`, `,`, `.`, `@`, `-`. Spaces are not allowed.",
      new: "* `name` - (Optional, Forces new resource) Name of the instance profile. If omitted, this provider will assign a random, unique name. Conflicts with `name_prefix`. Can be a string of characters consisting of upper and lowercase alphanumeric characters and these special characters: `_`, `+`, `=`, `,`, `.`, `@`, `-`. Spaces are not allowed.",
    },
  ],
  "website/docs/r/iam_policy_attachment.html.markdown": [
    {
      old: "!> **WARNING:** The aws_iam_policy_attachment resource creates **exclusive** attachments of IAM policies. Across the entire AWS account, all of the users/roles/groups to which a single policy is attached must be declared by a single aws_iam_policy_attachment resource. This means that even any users/roles/groups that have the attached policy via any other mechanism (including other Terraform resources) will have that attached policy revoked by this resource. Consider `aws_iam_role_policy_attachment`, `aws_iam_user_policy_attachment`, or `aws_iam_group_policy_attachment` instead. These resources do not enforce exclusive attachment of an IAM policy.",
      new: "!> **WARNING:** The aws_iam_policy_attachment resource creates **exclusive** attachments of IAM policies. Across the entire AWS account, all of the users/roles/groups to which a single policy is attached must be declared by a single aws_iam_policy_attachment resource. This means that even any users/roles/groups that have the attached policy via any other mechanism (including other resources managed by this provider) will have that attached policy revoked by this resource. Consider `aws_iam_role_policy_attachment`, `aws_iam_user_policy_attachment`, or `aws_iam_group_policy_attachment` instead. These resources do not enforce exclusive attachment of an IAM policy.",
    },
    {
      old: "~> **NOTE:** For a given role, this resource is incompatible with using the `aws_iam_role` resource `managed_policy_arns` argument. When using that argument and this resource, both will attempt to manage the role's managed policy attachments and Terraform will show a permanent difference.",
      new: "~> **NOTE:** For a given role, this resource is incompatible with using the `aws_iam_role` resource `managed_policy_arns` argument. When using that argument and this resource, both will attempt to manage the role's managed policy attachments and the provider will show a permanent difference.",
    },
  ],
  "website/docs/r/iam_role.html.markdown": [
    {
      old: "* `managed_policy_arns` - (Optional) Set of exclusive IAM managed policy ARNs to attach to the IAM role. If this attribute is not configured, Terraform will ignore policy attachments to this resource. When configured, Terraform will align the role's managed policy attachments with this set by attaching or detaching managed policies. Configuring an empty set (i.e., `managed_policy_arns = []`) will cause Terraform to remove _all_ managed policy attachments.",
      new: "* `name` - (Optional, Forces new resource) Friendly name of the role. If omitted, the provider will assign a random, unique name. See [IAM Identifiers](https://docs.aws.amazon.com/IAM/latest/UserGuide/Using_Identifiers.html) for more information.",
    },
  ],
  "website/docs/r/iam_role_policy.html.markdown": [
    {
      old: "~> **NOTE:** For a given role, this resource is incompatible with using the `aws_iam_role` resource `inline_policy` argument. When using that argument and this resource, both will attempt to manage the role's inline policies and Terraform will show a permanent difference.",
      new: "~> **NOTE:** For a given role, this resource is incompatible with using the `aws_iam_role` resource `inline_policy` argument. When using that argument and this resource, both will attempt to manage the role's inline policies and the provider will show a permanent difference.",
    },
  ],
  "website/docs/r/iam_role_policy_attachment.markdown": [
    {
      old: "~> **NOTE:** For a given role, this resource is incompatible with using the `aws_iam_role` resource `managed_policy_arns` argument. When using that argument and this resource, both will attempt to manage the role's managed policy attachments and Terraform will show a permanent difference.",
      new: "~> **NOTE:** For a given role, this resource is incompatible with using the `aws_iam_role` resource `managed_policy_arns` argument. When using that argument and this resource, both will attempt to manage the role's managed policy attachments and the provider will show a permanent difference.",
    },
  ],
  "website/docs/r/iam_user.html.markdown": [
    {
      old: "  has non-Terraform-managed IAM access keys, login profile or MFA devices. Without `force_destroy`",
      new: "  has non-provider-managed IAM access keys, login profile or MFA devices. Without `force_destroy`",
    },
    {
      old: "  a user with non-Terraform-managed access keys and login profile will fail to be destroyed.",
      new: "  a user with non-provider-managed access keys and login profile will fail to be destroyed.",
    },
  ],
  "website/docs/r/iam_user_login_profile.html.markdown": [
    {
      old: "Manages an IAM User Login Profile with limited support for password creation during Terraform resource creation. Uses PGP to encrypt the password for safe transport to the user. PGP keys can be obtained from Keybase.",
      new: "Manages an IAM User Login Profile with limited support for password creation during this provider resource creation. Uses PGP to encrypt the password for safe transport to the user. PGP keys can be obtained from Keybase.",
    },
    {
      old: "-> To reset an IAM User login password via Terraform, you can use the `terraform taint` command or change any of the arguments.",
      new: "-> To reset an IAM User login password via this provider, you can use delete and recreate this resource or change any of the arguments.",
    },
    {
      old: "* `key_fingerprint` - The fingerprint of the PGP key used to encrypt the password. Only available if password was handled on Terraform resource creation, not import.",
      new: "* `key_fingerprint` - The fingerprint of the PGP key used to encrypt the password. Only available if password was handled on this provider resource creation, not import.",
    },
    {
      old: "   for example: `terraform output password | base64 --decode | keybase pgp decrypt`.",
      new: "   for example: `pulumi stack output password | base64 --decode | keybase pgp decrypt`.",
    },
    {
      old: "Since Terraform has no method to read the PGP or password information during import, use the Terraform resource `lifecycle` configuration block `ignore_changes` argument to ignore them unless password recreation is desiredE.g.,",
      new: "Since this provider has no method to read the PGP or password information during import, use [`ignore_changes` argument](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to ignore them unless password recreation is desired. e.g.",
    },
  ],
  "website/docs/r/iam_user_policy.html.markdown": [
    {
      old: '  # Terraform\'s "jsonencode" function converts a',
      new: "",
    },
    {
      old: "* `policy` - (Required) The policy document. This is a JSON formatted string. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `name` - (Optional) The name of the policy. If omitted, this provider will assign a random, unique name.",
    },
  ],
  "website/docs/r/imagebuilder_component.html.markdown": [
    {
      old: "* `data` - (Optional) Inline YAML string with data of the component. Exactly one of `data` and `uri` can be specified. Terraform will only perform drift detection of its value when present in a configuration.",
      new: "* `data` - (Optional) Inline YAML string with data of the component. Exactly one of `data` and `uri` can be specified. the provider will only perform drift detection of its value when present in a configuration.",
    },
    {
      old: "Certain resource arguments, such as `uri`, cannot be read via the API and imported into Terraform. Terraform will display a difference for these arguments the first run after import if declared in the Terraform configuration for an imported resource.",
      new: "Certain resource arguments, such as `uri`, cannot be read via the API and imported into the provider. The provider will display a difference for these arguments the first run after import if declared in the the provider configuration for an imported resource.",
    },
  ],
  "website/docs/r/instance.html.markdown": [
    {
      old: "* `credit_specification` - (Optional) Configuration block for customizing the credit specification of the instance. See [Credit Specification](#credit-specification) below for more details. Terraform will only perform drift detection of its value when present in a configuration. Removing this configuration on existing instances will only stop managing it. It will not change the configuration back to the default for the instance type.",
      new: "* `credit_specification` - (Optional) Configuration block for customizing the credit specification of the instance. See [Credit Specification](#credit-specification) below for more details. This provider will only perform drift detection of its value when present in a configuration. Removing this configuration on existing instances will only stop managing it. It will not change the configuration back to the default for the instance type.",
    },
    {
      old: "~> **NOTE:** Currently, changes to the `ebs_block_device` configuration of _existing_ resources cannot be automatically detected by Terraform. To manage changes and attachments of an EBS block to an instance, use the `aws_ebs_volume` and `aws_volume_attachment` resources instead. If you use `ebs_block_device` on an `aws_instance`, Terraform will assume management over the full set of non-root EBS block devices for the instance, treating additional block devices as drift. For this reason, `ebs_block_device` cannot be mixed with external `aws_ebs_volume` and `aws_volume_attachment` resources for a given instance.",
      new: "~> **NOTE:** Currently, changes to the `ebs_block_device` configuration of _existing_ resources cannot be automatically detected by this provider. To manage changes and attachments of an EBS block to an instance, use the `aws_ebs_volume` and `aws_volume_attachment` resources instead. If you use `ebs_block_device` on an `aws_instance`, this provider will assume management over the full set of non-root EBS block devices for the instance, treating additional block devices as drift. For this reason, `ebs_block_device` cannot be mixed with external `aws_ebs_volume` and `aws_volume_attachment` resources for a given instance.",
    },
  ],
  "website/docs/r/kinesis_analytics_application.html.markdown": [
    {
      old: '  name        = "terraform-kinesis-test"',
      new: '  name        = "kinesis-test"',
    },
  ],
  "website/docs/r/kinesis_firehose_delivery_stream.html.markdown": [
    {
      old: '  name        = "terraform-kinesis-firehose-extended-s3-test-stream"',
      new: '  name        = "kinesis-firehose-extended-s3-test-stream"',
    },
    {
      old: '  name        = "terraform-kinesis-firehose-test-stream"',
      new: '  name        = "kinesis-firehose-test-stream"',
    },
    {
      old: '  name        = "terraform-kinesis-firehose-es"',
      new: '  name        = "kinesis-firehose-es"',
    },
  ],
  "website/docs/r/kinesis_stream.html.markdown": [
    {
      old: '  name             = "terraform-kinesis-test"',
      new: '  name             = "kinesis-test"',
    },
    {
      old: "$ terraform import aws_kinesis_stream.test_stream terraform-kinesis-test",
      new: "$ terraform import aws_kinesis_stream.test_stream kinesis-test",
    },
  ],
  "website/docs/r/kinesis_video_stream.html.markdown": [
    {
      old: '  name                    = "terraform-kinesis-video-stream"',
      new: '  name                    = "kinesis-video-stream"',
    },
    {
      old: '    Name = "terraform-kinesis-video-stream"',
      new: '    Name = "kinesis-video-stream"',
    },
  ],
  "website/docs/r/kms_alias.html.markdown": [
    {
      old: "but API (hence Terraform too) allows you to create as many aliases as",
      new: "but API (hence this provider too) allows you to create as many aliases as",
    },
  ],
  "website/docs/r/kms_grant.html.markdown": [
    {
      old: "* `grantee_principal` - (Required, Forces new resources) The principal that is given permission to perform the operations that the grant permits in ARN format. Note that due to eventual consistency issues around IAM principals, terraform's state may not always be refreshed to reflect what is true in AWS.",
      new: "* `grantee_principal` - (Required, Forces new resources) The principal that is given permission to perform the operations that the grant permits in ARN format. Note that due to eventual consistency issues around IAM principals, the providers's state may not always be refreshed to reflect what is true in AWS.",
    },
    {
      old: "* `retiring_principal` - (Optional, Forces new resources) The principal that is given permission to retire the grant by using RetireGrant operation in ARN format. Note that due to eventual consistency issues around IAM principals, terraform's state may not always be refreshed to reflect what is true in AWS.",
      new: "* `retiring_principal` - (Optional, Forces new resources) The principal that is given permission to retire the grant by using RetireGrant operation in ARN format. Note that due to eventual consistency issues around IAM principals, the providers's state may not always be refreshed to reflect what is true in AWS.",
    },
  ],
  "website/docs/r/kms_key.html.markdown": [
    {
      old: "* `policy` - (Optional) A valid policy JSON document. Although this is a key policy, not an IAM policy, an `aws_iam_policy_document`, in the form that designates a principal, can be used. For more information about building policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Optional) A valid policy JSON document. Although this is a key policy, not an IAM policy, an `aws_iam_policy_document`, in the form that designates a principal, can be used.",
    },
  ],
  "website/docs/r/kms_replica_external_key.html.markdown": [
    {
      old: "For more information about building policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "For more information about building policy documents with Terraform, see the [AWS IAM Policy Document Guide](https://learn.hashicorp.com/terraform/aws/iam-policy).",
    },
  ],
  "website/docs/r/kms_replica_key.html.markdown": [
    {
      old: "For more information about building policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "For more information about building policy documents with Terraform, see the [AWS IAM Policy Document Guide](https://learn.hashicorp.com/terraform/aws/iam-policy).",
    },
  ],
  "website/docs/r/lambda_function.html.markdown": [
    {
      old: '~> **NOTE:** Due to [AWS Lambda improved VPC networking changes that began deploying in September 2019](https://aws.amazon.com/blogs/compute/announcing-improved-vpc-networking-for-aws-lambda-functions/), EC2 subnets and security groups associated with Lambda Functions can take up to 45 minutes to successfully delete. Terraform AWS Provider version 2.31.0 and later automatically handles this increased timeout, however prior versions require setting the customizable deletion timeouts of those Terraform resources to 45 minutes (`delete = "45m"`). AWS and HashiCorp are working together to reduce the amount of time required for resource deletion and updates can be tracked in this [GitHub issue](https://github.com/hashicorp/terraform-provider-aws/issues/10329).',
      new: "~> **NOTE:** Due to [AWS Lambda improved VPC networking changes that began deploying in September 2019](https://aws.amazon.com/blogs/compute/announcing-improved-vpc-networking-for-aws-lambda-functions/), EC2 subnets and security groups associated with Lambda Functions can take up to 45 minutes to successfully delete.",
    },
  ],
  "website/docs/r/lambda_function_event_invoke_config.html.markdown": [
    {
      old: "~> **NOTE:** At least one of `on_failure` or `on_success` must be configured when using this configuration block, otherwise remove it completely to prevent perpetual differences in Terraform runs.",
      new: "~> **NOTE:** At least one of `on_failure` or `on_success` must be configured when using this configuration block, otherwise remove it completely to prevent perpetual differences in provider runs.",
    },
  ],
  "website/docs/r/lambda_invocation.html.markdown": [
    {
      old: "* `triggers` - (Optional) Map of arbitrary keys and values that, when changed, will trigger a re-invocation. To force a re-invocation without changing these keys/values, use the `terraform taint` command.",
      new: "* `triggers` - (Optional) Map of arbitrary keys and values that, when changed, will trigger a re-invocation. To force a re-invocation without changing these keys/values, use the [`terraform taint` command](https://www.terraform.io/docs/commands/taint.html).",
    },
  ],
  "website/docs/r/launch_configuration.html.markdown": [
    {
      old: "Web Service API. In order to update a Launch Configuration, Terraform will",
      new: "Web Service API. In order to update a Launch Configuration, this provider will",
    },
    {
      old: '  name_prefix   = "terraform-lc-example-"',
      new: '  name_prefix   = "lc-example-"',
    },
    {
      old: '  name                 = "terraform-asg-example"',
      new: '  name                 = "asg-example"',
    },
    {
      old: "With this setup Terraform generates a unique name for your Launch",
      new: "With this setup this provider generates a unique name for your Launch",
    },
    {
      old: "for more information or how to launch [Spot Instances][3] with Terraform.",
      new: "for more information or how to launch [Spot Instances][3] with this provider.",
    },
    {
      old: '  name                 = "terraform-asg-example"',
      new: '  name                 = "asg-example"',
    },
    {
      old: "  this blank, Terraform will auto-generate a unique name. Conflicts with `name_prefix`.",
      new: "  this blank, this provider will auto-generate a unique name. Conflicts with `name_prefix`.",
    },
    {
      old: "cannot currently be detected by Terraform. After updating to block device",
      new: "cannot currently be detected by this provider. After updating to block device",
    },
    {
      old: "$ terraform import aws_launch_configuration.as_conf terraform-lg-123456",
      new: "$ terraform import aws_launch_configuration.as_conf lg-123456",
    },
  ],
  "website/docs/r/lb.html.markdown": [
    {
      old: "Terraform will autogenerate a name beginning with `tf-lb`.",
      new: "this provider will autogenerate a name beginning with `tf-lb`.",
    },
    {
      old: "   the AWS API. This will prevent Terraform from deleting the load balancer. Defaults to `false`.",
      new: "   the AWS API. This will prevent this provider from deleting the load balancer. Defaults to `false`.",
    },
  ],
  "website/docs/r/lb_listener_rule.html.markdown": [
    {
      old: '      values = ["my-service.*.terraform.io"]',
      new: '      values = ["my-service.*.mycompany.io"]',
    },
  ],
  "website/docs/r/lb_target_group.html.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) Name of the target group. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) Name of the target group. If omitted, this provider will assign a random, unique name.",
    },
  ],
  "website/docs/r/licensemanager_license_configuration.markdown": [
    {
      old: "~> **Note:** Removing the `license_count` attribute is not supported by the License Manager API - use `terraform taint aws_licensemanager_license_configuration.<id>` to recreate the resource instead.",
      new: "~> **Note:** Removing the `license_count` attribute is not supported by the License Manager API - recreate the resource instead.",
    },
  ],
  "website/docs/r/lightsail_key_pair.html.markdown": [
    {
      old: "name will be generated by Terraform",
      new: "name will be generated by this provider",
    },
  ],
  "website/docs/r/media_store_container_policy.html.markdown": [
    {
      old: "* `policy` - (Required) The contents of the policy. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Required) The contents of the policy.",
    },
  ],
  "website/docs/r/mq_broker.html.markdown": [
    {
      old: "~> **NOTE:** Changes to an MQ Broker can occur when you change a parameter, such as `configuration` or `user`, and are reflected in the next maintenance window. Because of this, Terraform may report a difference in its planning phase because a modification has not yet taken place. You can use the `apply_immediately` flag to instruct the service to apply the change immediately (see documentation below). Using `apply_immediately` can result in a brief downtime as the broker reboots.",
      new: "~> **NOTE:** Changes to an MQ Broker can occur when you change a parameter, such as `configuration` or `user`, and are reflected in the next maintenance window. Because of this, the provider may report a difference in its planning phase because a modification has not yet taken place. You can use the `apply_immediately` flag to instruct the service to apply the change immediately (see documentation below). Using `apply_immediately` can result in a brief downtime as the broker reboots.",
    },
  ],
  "website/docs/r/msk_cluster.html.markdown": [
    {
      old: "  Terraform resource for managing an AWS Managed Streaming for Kafka cluster.",
      new: "  Provider resource for managing an AWS Managed Streaming for Kafka cluster",
    },
    {
      old: '  name        = "terraform-kinesis-firehose-msk-broker-logs-stream"',
      new: '  name        = "kinesis-firehose-msk-broker-logs-stream"',
    },
  ],
  "website/docs/r/msk_configuration.html.markdown": [
    {
      old: "  Terraform resource for managing an Amazon Managed Streaming for Kafka configuration",
      new: "  this provider resource for managing an Amazon Managed Streaming for Kafka configuration",
    },
  ],
  "website/docs/r/neptune_cluster.html.markdown": [
    {
      old: "window. Because of this, Terraform may report a difference in its planning",
      new: "window. Because of this, this provider may report a difference in its planning",
    },
    {
      old: "* `cluster_identifier` - (Optional, Forces new resources) The cluster identifier. If omitted, Terraform will assign a random, unique identifier.",
      new: "* `cluster_identifier` - (Optional, Forces new resources) The cluster identifier. If omitted, this provider will assign a random, unique identifier.",
    },
  ],
  "website/docs/r/neptune_cluster_instance.html.markdown": [
    {
      old: "* `identifier` - (Optional, Forces new resource) The identifier for the neptune instance, if omitted, Terraform will assign a random, unique identifier.",
      new: "* `identifier` - (Optional, Forces new resource) The identifier for the neptune instance, if omitted, this provider will assign a random, unique identifier.",
    },
  ],
  "website/docs/r/neptune_cluster_parameter_group.html.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) The name of the neptune cluster parameter group. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) The name of the neptune cluster parameter group. If omitted, this provider will assign a random, unique name.",
    },
    {
      old: '* `description` - (Optional) The description of the neptune cluster parameter group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the neptune cluster parameter group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/neptune_event_subscription.html.markdown": [
    {
      old: "* `name` - (Optional) The name of the Neptune event subscription. By default generated by Terraform.",
      new: "* `name` - (Optional) The name of the Neptune event subscription. By default generated by this provider.",
    },
  ],
  "website/docs/r/neptune_parameter_group.html.markdown": [
    {
      old: '* `description` - (Optional) The description of the Neptune parameter group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the Neptune parameter group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/neptune_subnet_group.html.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) The name of the neptune subnet group. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) The name of the neptune subnet group. If omitted, this provider will assign a random, unique name.",
    },
    {
      old: '* `description` - (Optional) The description of the neptune subnet group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the neptune subnet group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/network_acl.html.markdown": [
    {
      old: "~> **NOTE on Network ACLs and Network ACL Rules:** Terraform currently",
      new: "~> **NOTE on Network ACLs and Network ACL Rules:** This provider currently",
    },
    {
      old: "~> **NOTE on Network ACLs and Network ACL Associations:** Terraform provides both a standalone network ACL association",
      new: "~> **NOTE on Network ACLs and Network ACL Associations:** Terraform provides both a standalone [network ACL association](network_acl_association.html)",
    },
  ],
  "website/docs/r/network_acl_rule.html.markdown": [
    {
      old: "~> **NOTE on Network ACLs and Network ACL Rules:** Terraform currently",
      new: "~> **NOTE on Network ACLs and Network ACL Rules:** This provider currently",
    },
    {
      old: "If importing a rule previously provisioned by Terraform, the `PROTOCOL` must be the input value used at creation time.",
      new: "If importing a rule previously provisioned by the provider, the `PROTOCOL` must be the input value used at creation time.",
    },
  ],
  "website/docs/r/network_interface_sg_attachment.html.markdown": [
    {
      old: "~> **NOTE on instances, interfaces, and security groups:** Terraform currently",
      new: "~> **NOTE on instances, interfaces, and security groups:** This provider currently",
    },
  ],
  "website/docs/r/opsworks_application.html.markdown": [
    {
      old: "* `password` - (Optional) Password to use when authenticating to the source. Terraform cannot perform drift detection of this configuration.",
      new: "* `password` - (Optional) Password to use when authenticating to the source. This provider cannot perform drift detection of this configuration.",
    },
    {
      old: "* `ssh_key` - (Optional) SSH key to use when authenticating to the source. Terraform cannot perform drift detection of this configuration.",
      new: "* `ssh_key` - (Optional) SSH key to use when authenticating to the source. This provider cannot perform drift detection of this configuration.",
    },
  ],
  "website/docs/r/opsworks_instance.html.markdown": [
    {
      old: "resources cannot be automatically detected by Terraform. After making updates",
      new: "resources cannot be automatically detected by this provider. After making updates",
    },
  ],
  "website/docs/r/opsworks_stack.html.markdown": [
    {
      old: '    Name = "foobar-terraform-stack"',
      new: '    Name = "foobar-stack"',
    },
    {
      old: "* `ssh_key` - (Optional) SSH key to use when authenticating to the source. Terraform cannot perform drift detection of this configuration.",
      new: "* `password` - (Optional) Password to use when authenticating to the source. The provider cannot perform drift detection of this configuration.",
    },
  ],
  "website/docs/r/organizations_account.html.markdown": [
    {
      old: "~> **Note:** By default, deleting this Terraform resource will only remove an AWS account from an organization. You must set the `close_on_deletion` flag to true to close the account. It is worth noting that quotas are enforced when using the `close_on_deletion` argument, which can produce a [CLOSE_ACCOUNT_QUOTA_EXCEEDED](https://docs.aws.amazon.com/organizations/latest/APIReference/API_CloseAccount.html) error, and require you to close the account manually.",
      new: "~> **Note:** By default, deleting this resource will only remove an AWS account from an organization. You must set the `close_on_deletion` flag to true to close the account. It is worth noting that quotas are enforced when using the `close_on_deletion` argument, which can produce a [CLOSE_ACCOUNT_QUOTA_EXCEEDED](https://docs.aws.amazon.com/organizations/latest/APIReference/API_CloseAccount.html) error, and require you to close the account manually.",
    },
    {
      old: "* `role_name` - (Optional) The name of an IAM role that Organizations automatically preconfigures in the new member account. This role trusts the root account, allowing users in the root account to assume the role, as permitted by the root account administrator. The role has administrator permissions in the new member account. The Organizations API provides no method for reading this information after account creation, so Terraform cannot perform drift detection on its value and will always show a difference for a configured value after import unless `ignore_changes` is used.",
      new: "* `role_name` - (Optional) The name of an IAM role that Organizations automatically preconfigures in the new member account. This role trusts the root account, allowing users in the root account to assume the role, as permitted by the root account administrator. The role has administrator permissions in the new member account. The Organizations API provides no method for reading this information after account creation, so the provider cannot perform drift detection on its value and will always show a difference for a configured value after import unless `ignoreChanges` is used.",
    },
    {
      old: "Certain resource arguments, like `role_name`, do not have an Organizations API method for reading the information after account creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `role_name`, do not have an Organizations API method for reading the information after account creation. If the argument is set in the this provider configuration on an imported resource, this provider will always show a difference. To workaround this behavior, either omit the argument from the this provider configuration or use [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to hide the difference, e.g.",
    },
  ],
  "website/docs/r/organizations_organization.html.markdown": [
    {
      old: '!> **WARNING:** When migrating from a `feature_set` of `CONSOLIDATED_BILLING` to `ALL`, the Organization account owner will received an email stating the following: "You started the process to enable all features for your AWS organization. As part of that process, all member accounts that joined your organization by invitation must approve the change. You don’t need approval from member accounts that you directly created from within your AWS organization." After all member accounts have accepted the invitation, the Organization account owner must then finalize the changes via the [AWS Console](https://console.aws.amazon.com/organizations/home#/organization/settings/migration-progress). Until these steps are performed, Terraform will perpetually show a difference, and the `DescribeOrganization` API will continue to show the `FeatureSet` as `CONSOLIDATED_BILLING`. See the [AWS Organizations documentation](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_org_support-all-features.html) for more information.',
      new: '!> **WARNING:** When migrating from a `feature_set` of `CONSOLIDATED_BILLING` to `ALL`, the Organization account owner will received an email stating the following: "You started the process to enable all features for your AWS organization. As part of that process, all member accounts that joined your organization by invitation must approve the change. You don’t need approval from member accounts that you directly created from within your AWS organization." After all member accounts have accepted the invitation, the Organization account owner must then finalize the changes via the [AWS Console](https://console.aws.amazon.com/organizations/home#/organization/settings/migration-progress). Until these steps are performed, the provider will perpetually show a difference, and the `DescribeOrganization` API will continue to show the `FeatureSet` as `CONSOLIDATED_BILLING`. See the [AWS Organizations documentation](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_org_support-all-features.html) for more information.',
    },
  ],
  "website/docs/r/pinpoint_app.markdown": [
    {
      old: "* `name` - (Optional) The application name. By default generated by Terraform",
      new: "* `name` - (Optional) The application name. By default generated by this provider",
    },
  ],
  "website/docs/r/qldb_ledger.html.markdown": [
    {
      old: "~> **NOTE:** Deletion protection is enabled by default. To successfully delete this resource via Terraform, `deletion_protection = false` must be applied before attempting deletion.",
      new: "~> **NOTE:** Deletion protection is enabled by default. To successfully delete this resource via this provider, `deletion_protection = false` must be applied before attempting deletion.",
    },
  ],
  "website/docs/r/ram_resource_share_accepter.markdown": [
    {
      old: "This configuration provides an example of using multiple Terraform AWS providers to configure two different AWS accounts. In the _sender_ account, the configuration creates a `aws_ram_resource_share` and uses a data source in the _receiver_ account to create a `aws_ram_principal_association` resource with the _receiver's_ account ID. In the _receiver_ account, the configuration accepts the invitation to share resources with the `aws_ram_resource_share_accepter`.",
      new: "This configuration provides an example of using multiple AWS providers to configure two different AWS accounts. In the _sender_ account, the configuration creates a `aws_ram_resource_share` and uses a data source in the _receiver_ account to create a `aws_ram_principal_association` resource with the _receiver's_ account ID. In the _receiver_ account, the configuration accepts the invitation to share resources with the `aws_ram_resource_share_accepter`.",
    },
  ],
  "website/docs/r/rds_cluster.html.markdown": [
    {
      old: "window. Because of this, Terraform may report a difference in its planning",
      new: "window. Because of this, this provider may report a difference in its planning",
    },
  ],
  "website/docs/r/rds_cluster_instance.html.markdown": [
    {
      old: "~> **NOTE:** Deletion Protection from the RDS service can only be enabled at the cluster level, not for individual cluster instances. You can still add the `prevent_destroy` lifecycle behavior to your Terraform resource configuration if you desire protection from accidental deletion.",
      new: "~> **NOTE:** Deletion Protection from the RDS service can only be enabled at the cluster level, not for individual cluster instances. You can still add the [`protect` CustomResourceOption](https://www.pulumi.com/docs/intro/concepts/programming-model/#protect) to this resource configuration if you desire protection from accidental deletion.",
    },
    {
      old: "* `identifier` - (Optional, Forces new resource) The identifier for the RDS instance, if omitted, Terraform will assign a random, unique identifier.",
      new: "* `identifier` - (Optional, Forces new resource) The indentifier for the RDS instance, if omitted, this provider will assign a random, unique identifier.",
    },
  ],
  "website/docs/r/rds_cluster_parameter_group.markdown": [
    {
      old: "* `name` - (Optional, Forces new resource) The name of the DB cluster parameter group. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) The name of the DB cluster parameter group. If omitted, this provider will assign a random, unique name.",
    },
    {
      old: '* `description` - (Optional) The description of the DB cluster parameter group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the DB cluster parameter group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/rds_global_cluster.html.markdown": [
    {
      old: "  # Terraform will begin showing it as a difference. Do not configure:",
      new: "  # will begin showing it as a difference. Do not configure:",
    },
    {
      old: "* `source_db_cluster_identifier` - (Optional) Amazon Resource Name (ARN) to use as the primary DB Cluster of the Global Cluster on creation. Terraform cannot perform drift detection of this value.",
      new: "* `source_db_cluster_identifier` - (Optional) Amazon Resource Name (ARN) to use as the primary DB Cluster of the Global Cluster on creation. The provider cannot perform drift detection of this value.",
    },
    {
      old: "* `storage_encrypted` - (Optional, Forces new resources) Specifies whether the DB cluster is encrypted. The default is `false` unless `source_db_cluster_identifier` is specified and encrypted. Terraform will only perform drift detection if a configuration value is provided.",
      new: "* `storage_encrypted` - (Optional, Forces new resources) Specifies whether the DB cluster is encrypted. The default is `false` unless `source_db_cluster_identifier` is specified and encrypted. The provider will only perform drift detection if a configuration value is provided.",
    },
    {
      old: "Certain resource arguments, like `force_destroy`, only exist within Terraform. If the argument is set in the Terraform configuration on an imported resource, Terraform will show a difference on the first plan after import to update the state value. This change is safe to apply immediately so the state matches the desired configuration.",
      new: "Certain resource arguments, like `force_destroy`, only exist within this provider. If the argument is set in the the provider configuration on an imported resource, This provider will show a difference on the first plan after import to update the state value. This change is safe to apply immediately so the state matches the desired configuration.",
    },
    {
      old: "Certain resource arguments, like `source_db_cluster_identifier`, do not have an API method for reading the information after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `source_db_cluster_identifier`, do not have an API method for reading the information after creation. If the argument is set in the provider configuration on an imported resource, the provider will always show a difference. To workaround this behavior, either omit the argument from the the provider configuration or use `ignore_changes` to hide the difference, e.g.",
    },
  ],
  "website/docs/r/redshift_parameter_group.html.markdown": [
    {
      old: '  name   = "parameter-group-test-terraform"',
      new: '  name   = "parameter-group-test"',
    },
    {
      old: '* `description` - (Optional) The description of the Redshift parameter group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the Redshift parameter group. Defaults to "Managed by Pulumi".',
    },
    {
      old: "$ terraform import aws_redshift_parameter_group.paramgroup1 parameter-group-test-terraform",
      new: "$ terraform import aws_redshift_parameter_group.paramgroup1 parameter-group-test",
    },
  ],
  "website/docs/r/redshift_security_group.html.markdown": [
    {
      old: "!> **WARNING:** With the retirement of EC2-Classic the `aws_redshift_security_group` resource has been deprecated and will be removed in a future version. Any existing resources can be removed from Terraform state using the `terraform state rm` command.",
      new: "!> **WARNING:** With the retirement of EC2-Classic the `aws_redshift_security_group` resource has been deprecated and will be removed in a future version. Any existing resources can be removed from [Terraform state](https://www.terraform.io/language/state) using the [`terraform state rm`](https://www.terraform.io/cli/commands/state/rm#command-state-rm) command.",
    },
    {
      old: '* `description` - (Optional) The description of the Redshift security group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the Redshift security group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/redshift_snapshot_schedule.html.markdown": [
    {
      old: "* `identifier` - (Optional, Forces new resource) The snapshot schedule identifier. If omitted, Terraform will assign a random, unique identifier.",
      new: "* `identifier` - (Optional, Forces new resource) The snapshot schedule identifier. If omitted, this provider will assign a random, unique identifier.",
    },
  ],
  "website/docs/r/redshift_subnet_group.html.markdown": [
    {
      old: '* `description` - (Optional) The description of the Redshift Subnet group. Defaults to "Managed by Terraform".',
      new: '* `description` - (Optional) The description of the Redshift Subnet group. Defaults to "Managed by Pulumi".',
    },
  ],
  "website/docs/r/route.html.markdown": [
    {
      old: "~> **NOTE on Route Tables and Routes:** Terraform currently provides both a standalone Route resource and a Route Table resource with routes defined in-line. At this time you cannot use a Route Table with in-line routes in conjunction with any Route resources. Doing so will cause a conflict of rule settings and will overwrite rules.",
      new: "~> **NOTE on Route Tables and Routes:** This provider currently",
    },
  ],
  "website/docs/r/route53_delegation_set.html.markdown": [
    {
      old: '  name              = "hashicorp.com"',
      new: '  name              = "mydomain.com"',
    },
    {
      old: '  name              = "terraform.io"',
      new: '  name              = "coolcompany.io"',
    },
  ],
  "website/docs/r/route53_health_check.html.markdown": [
    {
      old: '  alarm_name          = "terraform-test-foobar5"',
      new: '  alarm_name          = "test-foobar5"',
    },
  ],
  "website/docs/r/route53_record.html.markdown": [
    {
      old: '  name               = "foobar-terraform-elb"',
      new: '  name               = "foobar-elb"',
    },
    {
      old: "When creating Route 53 zones, the `NS` and `SOA` records for the zone are automatically created. Enabling the `allow_overwrite` argument will allow managing these records in a single Terraform run without the requirement for `terraform import`.",
      new: "When creating Route 53 zones, the `NS` and `SOA` records for the zone are automatically created. Enabling the `allow_overwrite` argument will allow managing these records in a single deployment without the requirement for `import`.",
    },
    {
      old: "* `allow_overwrite` - (Optional) Allow creation of this record in Terraform to overwrite an existing record, if any. This does not affect the ability to update the record in Terraform and does not prevent other resources within Terraform or manual Route 53 changes outside Terraform from overwriting this record. `false` by default. This configuration is not recommended for most environments.",
      new: "* `allow_overwrite` - (Optional) Allow creation of this record to overwrite an existing record, if any. This does not affect the ability to update the record using this provider and does not prevent other resources within this provider or manual Route 53 changes outside this provider from overwriting this record. `false` by default. This configuration is not recommended for most environments.",
    },
  ],
  "website/docs/r/route53_zone.html.markdown": [
    {
      old: "~> **NOTE:** Terraform provides both exclusive VPC associations defined in-line in this resource via `vpc` configuration blocks and a separate Zone VPC Association resource. At this time, you cannot use in-line VPC associations in conjunction with any `aws_route53_zone_association` resources with the same zone ID otherwise it will cause a perpetual difference in plan output. You can optionally use the generic Terraform resource lifecycle configuration block with `ignore_changes` to manage additional associations via the `aws_route53_zone_association` resource.",
      new: "~> **NOTE:** This provider provides both exclusive VPC associations defined in-line in this resource via `vpc` configuration blocks and a separate `Zone VPC Association resource. At this time, you cannot use in-line VPC associations in conjunction with any `aws_route53_zone_association` resources with the same zone ID otherwise it will cause a perpetual difference in plan output. You can optionally use [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to manage additional associations via the `aws_route53_zone_association` resource.",
    },
    {
      old: "* `comment` - (Optional) A comment for the hosted zone. Defaults to 'Managed by Terraform'.",
      new: "* `comment` - (Optional) A comment for the hosted zone. Defaults to 'Managed by Pulumi'.",
    },
    {
      old: "* `force_destroy` - (Optional) Whether to destroy all records (possibly managed outside of Terraform) in the zone when destroying the zone.",
      new: "* `force_destroy` - (Optional) Whether to destroy all records (possibly managed outside of this provider) in the zone when destroying the zone.",
    },
  ],
  "website/docs/r/route53_zone_association.html.markdown": [
    {
      old: "~> **NOTE:** Terraform provides both this standalone Zone VPC Association resource and exclusive VPC associations defined in-line in the `aws_route53_zone` resource via `vpc` configuration blocks. At this time, you cannot use those in-line VPC associations in conjunction with this resource and the same zone ID otherwise it will cause a perpetual difference in plan output. You can optionally use the generic Terraform resource lifecycle configuration block with `ignore_changes` in the `aws_route53_zone` resource to manage additional associations via this resource.",
      new: "~> **NOTE:** This provider provides both this standalone Zone VPC Association resource and exclusive VPC associations defined in-line in the `aws_route53_zone` resource via `vpc` configuration blocks. At this time, you cannot use those in-line VPC associations in conjunction with this resource and the same zone ID otherwise it will cause a perpetual difference in plan output. You can optionally use [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) in the `aws_route53_zone` resource to manage additional associations via this resource.",
    },
    {
      old: "If the VPC is in a different region than the Terraform AWS Provider region configuration, the VPC Region can be added to the endE.g.,",
      new: "If the VPC is in a different region than the provider region configuration, the VPC Region can be added to the end. e.g.",
    },
  ],
  "website/docs/r/route_table.html.markdown": [
    {
      old: "~> **NOTE on Route Tables and Routes:** Terraform currently",
      new: "~> **NOTE on Route Tables and Routes:** This provider currently",
    },
  ],
  "website/docs/r/s3_access_point.html.markdown": [
    {
      old: "~> **NOTE on Access Points and Access Point Policies:** Terraform provides both a standalone Access Point Policy resource and an Access Point resource with a resource policy defined in-line. You cannot use an Access Point with in-line resource policy in conjunction with an Access Point Policy resource. Doing so will cause a conflict of policies and will overwrite the access point's resource policy.",
      new: "~> **NOTE on Access Points and Access Point Policies:** This provider provides both a standalone Access Point Policy resource and an Access Point resource with a resource policy defined in-line. You cannot use an Access Point with in-line resource policy in conjunction with an Access Point Policy resource. Doing so will cause a conflict of policies and will overwrite the access point's resource policy.",
    },
    {
      old: "-> Advanced usage: To use a custom API endpoint for this Terraform resource, use the `s3control` endpoint provider configuration, not the `s3` endpoint provider configuration.",
      new: "-> Advanced usage: To use a custom API endpoint for this resource, use the `s3control` endpoint provider configuration), not the `s3` endpoint provider configuration.",
    },
    {
      old: "* `account_id` - (Optional) AWS account ID for the owner of the bucket for which you want to create an access point. Defaults to automatically determined account ID of the Terraform AWS provider.",
      new: "* `account_id` - (Optional) AWS account ID for the owner of the bucket for which you want to create an access point. Defaults to automatically determined account ID of the AWS provider.",
    },
  ],
  "website/docs/r/s3_account_public_access_block.html.markdown": [
    {
      old: "-> Advanced usage: To use a custom API endpoint for this Terraform resource, use the `s3control` endpoint provider configuration, not the `s3` endpoint provider configuration.",
      new: "-> Advanced usage: To use a custom API endpoint for this resource, use the `s3control` endpoint provider configuration, not the `s3` endpoint provider configuration.",
    },
    {
      old: "* `account_id` - (Optional) AWS account ID to configure. Defaults to automatically determined account ID of the Terraform AWS provider.",
      new: "* `account_id` - (Optional) AWS account ID to configure. Defaults to automatically determined account ID of the this provider AWS provider.",
    },
  ],
  "website/docs/r/s3_bucket.html.markdown": [
    {
      old: "* `bucket` - (Optional, Forces new resource) The name of the bucket. If omitted, Terraform will assign a random, unique name. Must be lowercase and less than or equal to 63 characters in length. A full list of bucket naming rules [may be found here](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html).",
      new: "* `website` - (Optional) A configuration of the [S3 bucket website](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html). See [Website](#website) below for details. This provider will only perform drift detection if a configuration value is provided.",
    },
    {
      old: "* `cors_rule` - (Optional, **Deprecated**) A rule of [Cross-Origin Resource Sharing](https://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html). See [CORS rule](#cors-rule) below for details. Terraform will only perform drift detection if a configuration value is provided. Use the resource `aws_s3_bucket_cors_configuration` instead.",
      new: "~> **NOTE:** Currently, changes to the `cors_rule` configuration of _existing_ resources cannot be automatically detected by this provider. To manage changes of CORS rules to an S3 bucket, use the `aws_s3_bucket_cors_configuration` resource instead. If you use `cors_rule` on an `aws_s3_bucket`, this provider will assume management over the full set of CORS rules for the S3 bucket, treating additional CORS rules as drift. For this reason, `cors_rule` cannot be mixed with the external `aws_s3_bucket_cors_configuration` resource for a given S3 bucket.",
    },
    {
      old: "* `versioning` - (Optional, **Deprecated**) A configuration of the [S3 bucket versioning state](https://docs.aws.amazon.com/AmazonS3/latest/dev/Versioning.html). See [Versioning](#versioning) below for details. Terraform will only perform drift detection if a configuration value is provided. Use the resource `aws_s3_bucket_versioning` instead.",
      new: "~> **NOTE:** Currently, changes to the `lifecycle_rule` configuration of _existing_ resources cannot be automatically detected by this provider. To manage changes of Lifecycle rules to an S3 bucket, use the `aws_s3_bucket_lifecycle_configuration` resource instead. If you use `lifecycle_rule` on an `aws_s3_bucket`, this provider will assume management over the full set of Lifecycle rules for the S3 bucket, treating additional Lifecycle rules as drift. For this reason, `lifecycle_rule` cannot be mixed with the external `aws_s3_bucket_lifecycle_configuration` resource for a given S3 bucket.",
    },
  ],
  "website/docs/r/s3_bucket_object.html.markdown": [
    {
      old: '* `etag` - (Optional) Triggers updates when the value changes. The only meaningful value is `filemd5("path/to/file")` (Terraform 0.11.12 or later) or `${md5(file("path/to/file"))}` (Terraform 0.11.11 or earlier). This attribute is not compatible with KMS encryption, `kms_key_id` or `server_side_encryption = "aws:kms"` (see `source_hash` instead).',
      new: "* `kms_key_id` - (Optional) ARN of the KMS Key to use for object encryption. If the S3 Bucket has server-side encryption enabled, that value will automatically be used. If referencing the `aws_kms_key` resource, use the `arn` attribute. If referencing the `aws_kms_alias` data source or resource, use the `target_key_arn` attribute. This provider will only perform drift detection if a configuration value is provided.",
    },
  ],
  "website/docs/r/s3_bucket_policy.html.markdown": [
    {
      old: "* `policy` - (Required) The text of the policy. Although this is a bucket policy rather than an IAM policy, the `aws_iam_policy_document` data source may be used, so long as it specifies a principal. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide. Note: Bucket policies are limited to 20 KB in size.",
      new: "* `policy` - (Required) The text of the policy. Although this is a bucket policy rather than an IAM policy, the `aws_iam_policy_document` data source may be used, so long as it specifies a principal. Note: Bucket policies are limited to 20 KB in size.",
    },
  ],
  "website/docs/r/s3control_access_point_policy.html.markdown": [
    {
      old: "~> **NOTE on Access Points and Access Point Policies:** Terraform provides both a standalone Access Point Policy resource and an Access Point resource with a resource policy defined in-line. You cannot use an Access Point with in-line resource policy in conjunction with an Access Point Policy resource. Doing so will cause a conflict of policies and will overwrite the access point's resource policy.",
      new: "~> **NOTE on Access Points and Access Point Policies:** Terraform provides both a standalone Access Point Policy resource and an [Access Point](s3_access_point.html) resource with a resource policy defined in-line. You cannot use an Access Point with in-line resource policy in conjunction with an Access Point Policy resource. Doing so will cause a conflict of policies and will overwrite the access point's resource policy.",
    },
  ],
  "website/docs/r/s3control_bucket_lifecycle_configuration.html.markdown": [
    {
      old: "~> **NOTE:** Each S3 Control Bucket can only have one Lifecycle Configuration. Using multiple of this resource against the same S3 Control Bucket will result in perpetual differences each Terraform run.",
      new: "~> **NOTE:** Each S3 Control Bucket can only have one Lifecycle Configuration. Using multiple of this resource against the same S3 Control Bucket will result in perpetual differences each provider run.",
    },
  ],
  "website/docs/r/s3control_bucket_policy.html.markdown": [
    {
      old: "* `policy` - (Required) JSON string of the resource policy. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Required) JSON string of the resource policy.",
    },
  ],
  "website/docs/r/s3control_multi_region_access_point.html.markdown": [
    {
      old: "* `account_id` - (Optional) The AWS account ID for the owner of the buckets for which you want to create a Multi-Region Access Point. Defaults to automatically determined account ID of the Terraform AWS provider.",
      new: "* `account_id` - (Optional) The AWS account ID for the owner of the buckets for which you want to create a Multi-Region Access Point. Defaults to automatically determined account ID of the AWS provider.",
    },
  ],
  "website/docs/r/sagemaker_endpoint_configuration.html.markdown": [
    {
      old: "* `name` - (Optional) The name of the endpoint configuration. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional) The name of the endpoint configuration. If omitted, this provider will assign a random, unique name.",
    },
    {
      old: "* `variant_name` - (Optional) The name of the variant. If omitted, Terraform will assign a random, unique name.",
      new: "* `variant_name` - (Optional) The name of the variant. If omitted, this provider will assign a random, unique name.",
    },
  ],
  "website/docs/r/sagemaker_model.html.markdown": [
    {
      old: "* `name` - (Optional) The name of the model (must be unique). If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional) The name of the model (must be unique). If omitted, this provider will assign a random, unique name.",
    },
  ],
  "website/docs/r/sagemaker_notebook_instance_lifecycle_configuration.html.markdown":
    [
      {
        old: "* `name` - (Optional) The name of the lifecycle configuration (must be unique). If omitted, Terraform will assign a random, unique name.",
        new: "* `name` - (Optional) The name of the lifecycle configuration (must be unique). If omitted, this provider will assign a random, unique name.",
      },
    ],
  "website/docs/r/secretsmanager_secret.html.markdown": [
    {
      old: '* `policy` - (Optional) Valid JSON document representing a [resource policy](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-based-policies.html). For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide. Removing `policy` from your configuration or setting `policy` to null or an empty string (i.e., `policy = ""`) _will not_ delete the policy since it could have been set by `aws_secretsmanager_secret_policy`. To delete the `policy`, set it to `"{}"` (an empty JSON document).',
      new: '* `policy` - (Optional) Valid JSON document representing a [resource policy](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-based-policies.html). Removing `policy` from your configuration or setting `policy` to null or an empty string (i.e., `policy = ""`) _will not_ delete the policy since it could have been set by `aws_secretsmanager_secret_policy`. To delete the `policy`, set it to `"{}"` (an empty JSON document).',
    },
  ],
  "website/docs/r/secretsmanager_secret_policy.html.markdown": [
    {
      old: '* `policy` - (Required) Valid JSON document representing a [resource policy](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-based-policies.html). For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide. Unlike `aws_secretsmanager_secret`, where `policy` can be set to `"{}"` to delete the policy, `"{}"` is not a valid policy since `policy` is required.',
      new: '* `policy` - (Required) Valid JSON document representing a [resource policy](https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_resource-based-policies.html). Unlike `aws_secretsmanager_secret`, where `policy` can be set to `"{}"` to delete the policy, `"{}"` is not a valid policy since `policy` is required.',
    },
  ],
  "website/docs/r/secretsmanager_secret_version.html.markdown": [
    {
      old: "~> **NOTE:** If the `AWSCURRENT` staging label is present on this version during resource deletion, that label cannot be removed and will be skipped to prevent errors when fully deleting the secret. That label will leave this secret version active even after the resource is deleted from Terraform unless the secret itself is deleted. Move the `AWSCURRENT` staging label before or after deleting this resource from Terraform to fully trigger version deprecation if necessary.",
      new: "~> **NOTE:** If the `AWSCURRENT` staging label is present on this version during resource deletion, that label cannot be removed and will be skipped to prevent errors when fully deleting the secret. That label will leave this secret version active even after the resource is deleted from this provider unless the secret itself is deleted. Move the `AWSCURRENT` staging label before or after deleting this resource from this provider to fully trigger version deprecation if necessary.",
    },
  ],
  "website/docs/r/security_group.html.markdown": [
    {
      old: "~> **NOTE on Security Groups and Security Group Rules:** Terraform currently",
      new: "~> **NOTE on Security Groups and Security Group Rules:** This provider currently",
    },
    {
      old: '~> **NOTE:** Due to [AWS Lambda improved VPC networking changes that began deploying in September 2019](https://aws.amazon.com/blogs/compute/announcing-improved-vpc-networking-for-aws-lambda-functions/), security groups associated with Lambda Functions can take up to 45 minutes to successfully delete. Terraform AWS Provider version 2.31.0 and later automatically handles this increased timeout, however prior versions require setting the [customizable deletion timeout](#timeouts) to 45 minutes (`delete = "45m"`). AWS and HashiCorp are working together to reduce the amount of time required for resource deletion and updates can be tracked in this [GitHub issue](https://github.com/hashicorp/terraform-provider-aws/issues/10329).',
      new: "~> **NOTE:** Due to [AWS Lambda improved VPC networking changes that began deploying in September 2019](https://aws.amazon.com/blogs/compute/announcing-improved-vpc-networking-for-aws-lambda-functions/), security groups associated with Lambda Functions can take up to 45 minutes to successfully delete.",
    },
    {
      old: "~> **NOTE on Egress rules:** By default, AWS creates an `ALLOW ALL` egress rule when creating a new Security Group inside of a VPC. When creating a new Security Group inside a VPC, **Terraform will remove this default rule**, and require you specifically re-create it if you desire that rule. We feel this leads to fewer surprises in terms of controlling your egress rules. If you desire this rule to be in place, you can use this `egress` block:",
      new: "~> **NOTE on Egress rules:** By default, AWS creates an `ALLOW ALL` egress rule when creating a new Security Group inside of a VPC. When creating a new Security Group inside a VPC, **this provider will remove this default rule**, and require you specifically re-create it if you desire that rule. We feel this leads to fewer surprises in terms of controlling your egress rules. If you desire this rule to be in place, you can use this `egress` block:",
    },
    {
      old: "Security Group's Name [cannot be edited after the resource is created](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-security-groups.html#creating-security-group). In fact, the `name` and `name-prefix` arguments force the creation of a new Security Group resource when they change value. In that case, Terraform first deletes the existing Security Group resource and then it creates a new one. If the existing Security Group is associated to a Network Interface resource, the deletion cannot complete. The reason is that Network Interface resources cannot be left with no Security Group attached and the new one is not yet available at that point.",
      new: "Security Group's Name [cannot be edited after the resource is created](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-security-groups.html#creating-security-group). In fact, the `name` and `name-prefix` arguments force the creation of a new Security Group resource when they change value. In that case, this provider first deletes the existing Security Group resource and then it creates a new one. If the existing Security Group is associated to a Network Interface resource, the deletion cannot complete. The reason is that Network Interface resources cannot be left with no Security Group attached and the new one is not yet available at that point.",
    },
    {
      old: '* `description` - (Optional, Forces new resource) Security group description. Defaults to `Managed by Terraform`. Cannot be `""`. **NOTE**: This field maps to the AWS `GroupDescription` attribute, for which there is no Update API. If you\'d like to classify your security groups in a way that can be updated, use `tags`.',
      new: "* `ingress` - (Optional) Configuration block for egress rules. Can be specified multiple times for each ingress rule. Each ingress block supports fields documented below.",
    },
  ],
  "website/docs/r/security_group_rule.html.markdown": [
    {
      old: "~> **NOTE on Security Groups and Security Group Rules:** Terraform currently",
      new: "~> **NOTE on Security Groups and Security Group Rules:** This provider currently",
    },
    {
      old: '~> **NOTE:** Setting `protocol = "all"` or `protocol = -1` with `from_port` and `to_port` will result in the EC2 API creating a security group rule with all ports open. This API behavior cannot be controlled by Terraform and may generate warnings in the future.',
      new: '~> **NOTE:** Setting `protocol = "all"` or `protocol = -1` with `from_port` and `to_port` will result in the EC2 API creating a security group rule with all ports open. This API behavior cannot be controlled by this provider and may generate warnings in the future.',
    },
    {
      old: "Not all rule permissions (e.g., not all of a rule's CIDR blocks) need to be imported for Terraform to manage rule permissions. However, importing some of a rule's permissions but not others, and then making changes to the rule will result in the creation of an additional rule to capture the updated permissions. Rule permissions that were not imported are left intact in the original rule.",
      new: "Not all rule permissions (e.g., not all of a rule's CIDR blocks) need to be imported for this provider to manage rule permissions. However, importing some of a rule's permissions but not others, and then making changes to the rule will result in the creation of an additional rule to capture the updated permissions. Rule permissions that were not imported are left intact in the original rule.",
    },
  ],
  "website/docs/r/securityhub_organization_configuration.markdown": [
    {
      old: "~> **NOTE:** This resource requires an `aws_securityhub_organization_admin_account` to be configured (not necessarily with Terraform). More information about managing Security Hub in an organization can be found in the [Managing administrator and member accounts](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html) documentation",
      new: "~> **NOTE:** This resource requires an `aws_securityhub_organization_admin_account` to be configured (not necessarily with this provider). More information about managing Security Hub in an organization can be found in the [Managing administrator and member accounts](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-accounts.html) documentation",
    },
    {
      old: "~> **NOTE:** This is an advanced Terraform resource. Terraform will automatically assume management of the Security Hub Organization Configuration without import and perform no actions on removal from the Terraform configuration.",
      new: "~> **NOTE:** This is an advanced resource. This provider will automatically assume management of the Security Hub Organization Configuration without import and perform no actions on removal from the configuration.",
    },
  ],
  "website/docs/r/service_discovery_service.html.markdown": [
    {
      old: '  name        = "example.terraform.local"',
      new: '  name        = "example.mydomain.local"',
    },
    {
      old: '  name        = "example.terraform.com"',
      new: '  name        = "example.mydomain.com"',
    },
  ],
  "website/docs/r/servicequotas_service_quota.html.markdown": [
    {
      old: "~> *NOTE* This resource does not require explicit import and will assume management of an existing service quota on Terraform resource creation.",
      new: "~> *NOTE* This resource does not require explicit import and will assume management of an existing service quota on resource creation.",
    },
  ],
  "website/docs/r/ses_domain_dkim.html.markdown": [
    {
      old: "  when the domain is hosted in Route 53 and managed by Terraform.",
      new: "  when the domain is hosted in Route 53 and managed by this provider.",
    },
  ],
  "website/docs/r/ses_domain_identity.html.markdown": [
    {
      old: "  when the domain is hosted in Route 53 and managed by Terraform.  Find out",
      new: "  when the domain is hosted in Route 53 and managed by this provider.  Find out",
    },
  ],
  "website/docs/r/ses_identity_policy.html.markdown": [
    {
      old: "* `policy` - (Required) JSON string of the policy. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Required) JSON string of the policy.",
    },
  ],
  "website/docs/r/signer_signing_profile.html.markdown": [
    {
      old: "* `name` - (Optional) A unique signing profile name. By default generated by Terraform. Signing profile names are immutable and cannot be reused after canceled.",
      new: "* `name` - (Optional) A unique signing profile name. By default generated by the provider. Signing profile names are immutable and cannot be reused after canceled.",
    },
    {
      old: "* `name_prefix` - (Optional) A signing profile name prefix. Terraform will generate a unique suffix. Conflicts with `name`.",
      new: "* `name_prefix` - (Optional) A signing profile name prefix. The provider will generate a unique suffix. Conflicts with `name`.",
    },
  ],
  "website/docs/r/signer_signing_profile_permission.html.markdown": [
    {
      old: "* `statement_id` - (Optional) A unique statement identifier. By default generated by Terraform.",
      new: "* `statement_id` - (Optional) A unique statement identifier. By default generated by the provider.",
    },
    {
      old: "* `statement_id_prefix` - (Optional) A statement identifier prefix. Terraform will generate a unique suffix. Conflicts with `statement_id`.",
      new: "* `statement_id_prefix` - (Optional) A statement identifier prefix. The provider will generate a unique suffix. Conflicts with `statement_id`.",
    },
  ],
  "website/docs/r/sns_platform_application.html.markdown": [
    {
      old: "* `platform_credential` - (Required) Application Platform credential. See [Credential][1] for type of credential required for platform. The value of this attribute when stored into the Terraform state is only a hash of the real value, so therefore it is not practical to use this as an attribute for other resources.",
      new: "* `platform_credential` - (Required) Application Platform credential. See [Credential][1] for type of credential required for platform. The value of this attribute when stored into the state is only a hash of the real value, so therefore it is not practical to use this as an attribute for other resources.",
    },
    {
      old: "* `platform_principal` - (Optional) Application Platform principal. See [Principal][2] for type of principal required for platform. The value of this attribute when stored into the Terraform state is only a hash of the real value, so therefore it is not practical to use this as an attribute for other resources.",
      new: "* `platform_principal` - (Optional) Application Platform principal. See [Principal][2] for type of principal required for platform. The value of this attribute when stored into the state is only a hash of the real value, so therefore it is not practical to use this as an attribute for other resources.",
    },
  ],
  "website/docs/r/sns_topic_policy.html.markdown": [
    {
      old: "~> **NOTE:** If a Principal is specified as just an AWS account ID rather than an ARN, AWS silently converts it to the ARN for the root user, causing future terraform plans to differ. To avoid this problem, just specify the full ARN, e.g., `arn:aws:iam::123456789012:root`",
      new: "~> **NOTE:** If a Principal is specified as just an AWS account ID rather than an ARN, AWS silently converts it to the ARN for the root user, causing future deployments to differ. To avoid this problem, just specify the full ARN, e.g. `arn:aws:iam::123456789012:root`",
    },
    {
      old: "* `policy` - (Required) The fully-formed AWS policy as JSON. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Required) The fully-formed AWS policy as JSON.",
    },
  ],
  "website/docs/r/sns_topic_subscription.html.markdown": [
    {
      old: "Provides a resource for subscribing to SNS topics. Requires that an SNS topic exist for the subscription to attach to. This resource allows you to automatically place messages sent to SNS topics in SQS queues, send them as HTTP(S) POST requests to a given endpoint, send SMS messages, or notify devices / applications. The most likely use case for Terraform users will probably be SQS queues.",
      new: "Provides a resource for subscribing to SNS topics. Requires that an SNS topic exist for the subscription to attach to. This resource allows you to automatically place messages sent to SNS topics in SQS queues, send them as HTTP(S) POST requests to a given endpoint, send SMS messages, or notify devices / applications. The most likely use case for provider users will probably be SQS queues.",
    },
    {
      old: "~> **NOTE:** If the SNS topic and SQS queue are in different AWS regions, the `aws_sns_topic_subscription` must use an AWS provider that is in the same region as the SNS topic. If the `aws_sns_topic_subscription` uses a provider with a different region than the SNS topic, Terraform will fail to create the subscription.",
      new: "~> **NOTE:** If the SNS topic and SQS queue are in different AWS regions, the `aws_sns_topic_subscription` must use an AWS provider that is in the same region as the SNS topic. If the `aws_sns_topic_subscription` uses a provider with a different region than the SNS topic, this provider will fail to create the subscription.",
    },
    {
      old: "~> **NOTE:** Setup of cross-account subscriptions from SNS topics to SQS queues requires Terraform to have access to BOTH accounts.",
      new: "~> **NOTE:** Setup of cross-account subscriptions from SNS topics to SQS queues requires the provider to have access to BOTH accounts.",
    },
    {
      old: "~> **NOTE:** If an SNS topic and SQS queue are in different AWS accounts but the same region, the `aws_sns_topic_subscription` must use the AWS provider for the account with the SQS queue. If `aws_sns_topic_subscription` uses a Provider with a different account than the SQS queue, Terraform creates the subscription but does not keep state and tries to re-create the subscription at every `apply`.",
      new: "~> **NOTE:** If an SNS topic and SQS queue are in different AWS accounts but the same region, the `aws_sns_topic_subscription` must use the AWS provider for the account with the SQS queue. If `aws_sns_topic_subscription` uses a Provider with a different account than the SQS queue, this provider creates the subscription but does not keep state and tries to re-create the subscription at every `apply`.",
    },
    {
      old: "~> **NOTE:** You cannot unsubscribe to a subscription that is pending confirmation. If you use `email`, `email-json`, or `http`/`https` (without auto-confirmation enabled), until the subscription is confirmed (e.g., outside of Terraform), AWS does not allow Terraform to delete / unsubscribe the subscription. If you `destroy` an unconfirmed subscription, Terraform will remove the subscription from its state but the subscription will still exist in AWS. However, if you delete an SNS topic, SNS [deletes all the subscriptions](https://docs.aws.amazon.com/sns/latest/dg/sns-delete-subscription-topic.html) associated with the topic. Also, you can import a subscription after confirmation and then have the capability to delete it.",
      new: "~> **NOTE:** You cannot unsubscribe to a subscription that is pending confirmation. If you use `email`, `email-json`, or `http`/`https` (without auto-confirmation enabled), until the subscription is confirmed (e.g., outside of this provider), AWS does not allow this provider to delete / unsubscribe the subscription. If you `destroy` an unconfirmed subscription, this provider will remove the subscription from its state but the subscription will still exist in AWS. However, if you delete an SNS topic, SNS [deletes all the subscriptions](https://docs.aws.amazon.com/sns/latest/dg/sns-delete-subscription-topic.html) associated with the topic. Also, you can import a subscription after confirmation and then have the capability to delete it.",
    },
    {
      old: '  endpoint  = "arn:aws:sqs:us-west-2:432981146916:terraform-queue-too"',
      new: '  endpoint  = "arn:aws:sqs:us-west-2:432981146916:queue-too"',
    },
    {
      old: '    role-name    = "service/service-hashicorp-terraform"',
      new: '    role-name    = "service/service"',
    },
    {
      old: '    role-name  = "service/service-hashicorp-terraform"',
      new: '    role-name  = "service/service"',
    },
    {
      old: "* `sqs` - Delivers JSON-encoded messages. `endpoint` is the ARN of an Amazon SQS queue (e.g., `arn:aws:sqs:us-west-2:123456789012:terraform-queue-too`).",
      new: "* `sqs` - Delivers JSON-encoded messages. `endpoint` is the ARN of an Amazon SQS queue (e.g., `arn:aws:sqs:us-west-2:123456789012:sample-queue-too`).",
    },
    {
      old: '~> **NOTE:** If an `aws_sns_topic_subscription` uses a partially-supported protocol and the subscription is not confirmed, either through automatic confirmation or means outside of Terraform (e.g., clicking on a "Confirm Subscription" link in an email), Terraform cannot delete / unsubscribe the subscription. Attempting to `destroy` an unconfirmed subscription will remove the `aws_sns_topic_subscription` from Terraform\'s state but **_will not_** remove the subscription from AWS. The `pending_confirmation` attribute provides confirmation status.',
      new: '~> **NOTE:** If an `aws_sns_topic_subscription` uses a partially-supported protocol and the subscription is not confirmed, either through automatic confirmation or means outside of this provider (e.g., clicking on a "Confirm Subscription" link in an email), this provider cannot delete / unsubscribe the subscription. Attempting to `destroy` an unconfirmed subscription will remove the `aws_sns_topic_subscription` from this provider\'s state but **_will not_** remove the subscription from AWS. The `pending_confirmation` attribute provides confirmation status.',
    },
  ],
  "website/docs/r/spot_fleet_request.html.markdown": [
    {
      old: "~> **NOTE:** Terraform does not support the functionality where multiple `subnet_id` or `availability_zone` parameters can be specified in the same",
      new: "~> **NOTE:** This provider does not support the functionality where multiple `subnet_id` or `availability_zone` parameters can be specified in the same",
    },
    {
      old: "* `wait_for_fulfillment` - (Optional; Default: false) If set, Terraform will",
      new: "* `wait_for_fulfillment` - (Optional; Default: false) If set, this provider will",
    },
  ],
  "website/docs/r/spot_instance_request.html.markdown": [
    {
      old: "By default Terraform creates Spot Instance Requests with a `persistent` type,",
      new: "By default this provider creates Spot Instance Requests with a `persistent` type,",
    },
    {
      old: "On destruction, Terraform will make an attempt to terminate the associated Spot",
      new: "On destruction, this provider will make an attempt to terminate the associated Spot",
    },
    {
      old: "differently than other Terraform resources. Most importantly: there is __no",
      new: "differently than other resources. Most importantly: there is __no",
    },
    {
      old: "* `wait_for_fulfillment` - (Optional; Default: false) If set, Terraform will",
      new: "* `wait_for_fulfillment` - (Optional; Default: false) If set, this provider will",
    },
  ],
  "website/docs/r/sqs_queue.html.markdown": [
    {
      old: 'resource "aws_sqs_queue" "terraform_queue" {',
      new: 'resource "aws_sqs_queue" "queue" {',
    },
    {
      old: '  name                      = "terraform-example-queue"',
      new: '  name                      = "example-queue"',
    },
    {
      old: "    deadLetterTargetArn = aws_sqs_queue.terraform_queue_deadletter.arn",
      new: "    deadLetterTargetArn = aws_sqs_queue.queue_deadletter.arn",
    },
    {
      old: 'resource "aws_sqs_queue" "terraform_queue" {',
      new: 'resource "aws_sqs_queue" "queue" {',
    },
    {
      old: '  name                        = "terraform-example-queue.fifo"',
      new: '  name                        = "example-queue.fifo"',
    },
    {
      old: 'resource "aws_sqs_queue" "terraform_queue" {',
      new: 'resource "aws_sqs_queue" "queue" {',
    },
    {
      old: '  name                              = "terraform-example-queue"',
      new: '  name                              = "example-queue"',
    },
    {
      old: "* `name` - (Optional) The name of the queue. Queue names must be made up of only uppercase and lowercase ASCII letters, numbers, underscores, and hyphens, and must be between 1 and 80 characters long. For a FIFO (first-in-first-out) queue, the name must end with the `.fifo` suffix. If omitted, Terraform will assign a random, unique name. Conflicts with `name_prefix`",
      new: "* `name` - (Optional) The name of the queue. Queue names must be made up of only uppercase and lowercase ASCII letters, numbers, underscores, and hyphens, and must be between 1 and 80 characters long. For a FIFO (first-in-first-out) queue, the name must end with the `.fifo` suffix. If omitted, this provider will assign a random, unique name. Conflicts with `name_prefix`",
    },
    {
      old: "* `policy` - (Optional) The JSON policy for the SQS queue. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Optional) The JSON policy for the SQS queue.",
    },
  ],
  "website/docs/r/sqs_queue_policy.html.markdown": [
    {
      old: "* `policy` - (Required) The JSON policy for the SQS queue. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Required) The JSON policy for the SQS queue.",
    },
  ],
  "website/docs/r/ssm_activation.html.markdown": [
    {
      old: "* `expiration_date` - (Optional) UTC timestamp in [RFC3339 format](https://tools.ietf.org/html/rfc3339#section-5.8) by which this activation request should expire. The default value is 24 hours from resource creation time. Terraform will only perform drift detection of its value when present in a configuration.",
      new: "* `expiration_date` - (Optional) UTC timestamp in [RFC3339 format](https://tools.ietf.org/html/rfc3339#section-5.8) by which this activation request should expire. The default value is 24 hours from resource creation time. This provider will only perform drift detection of its value when present in a configuration.",
    },
  ],
  "website/docs/r/ssm_document.html.markdown": [
    {
      old: "The `attachments_source` argument does not have an SSM API method for reading the attachment information detail after creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "The `attachments_source` argument does not have an SSM API method for reading the attachment information detail after creation. If the argument is set in the provider configuration on an imported resource, this provider will always show a difference. To workaround this behavior, either omit the argument from the configuration or use [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to hide the difference, e.g.",
    },
  ],
  "website/docs/r/ssm_parameter.html.markdown": [
    {
      old: "* `overwrite` - (Optional) Overwrite an existing parameter. If not specified, will default to `false` if the resource has not been created by terraform to avoid overwrite of existing resource and will default to `true` otherwise (terraform lifecycle rules should then be used to manage the update behavior).",
      new: "* `value` - (Optional, exactly one of `value` or `insecure_value` is required) Value of the parameter. This value is always marked as sensitive in the plan output, regardless of `type`.",
    },
  ],
  "website/docs/r/storagegateway_cache.html.markdown": [
    {
      old: "~> **NOTE:** The Storage Gateway API provides no method to remove a cache disk. Destroying this Terraform resource does not perform any Storage Gateway actions.",
      new: "~> **NOTE:** The Storage Gateway API provides no method to remove a cache disk. Destroying this resource does not perform any Storage Gateway actions.",
    },
  ],
  "website/docs/r/storagegateway_cached_iscsi_volume.html.markdown": [
    {
      old: "~> **NOTE:** These examples are referencing the `aws_storagegateway_cache` resource `gateway_arn` attribute to ensure Terraform properly adds cache before creating the volume. If you are not using this method, you may need to declare an expicit dependency (e.g., via `depends_on = [aws_storagegateway_cache.example]`) to ensure proper ordering.",
      new: "~> **NOTE:** These examples are referencing the `aws_storagegateway_cache` resource `gateway_arn` attribute to ensure this provider properly adds cache before creating the volume. If you are not using this method, you may need to declare an expicit dependency (e.g. via `depends_on = [aws_storagegateway_cache.example]`) to ensure proper ordering.",
    },
  ],
  "website/docs/r/storagegateway_gateway.html.markdown": [
    {
      old: "~> **NOTE:** One of `activation_key` or `gateway_ip_address` must be provided for resource creation (gateway activation). Neither is required for resource import. If using `gateway_ip_address`, Terraform must be able to make an HTTP (port 80) GET request to the specified IP address from where it is running.",
      new: "~> **NOTE:** One of `activation_key` or `gateway_ip_address` must be provided for resource creation (gateway activation). Neither is required for resource import. If using `gateway_ip_address`, this provider must be able to make an HTTP (port 80) GET request to the specified IP address from where it is running.",
    },
    {
      old: "* `gateway_ip_address` - (Optional) Gateway IP address to retrieve activation key during resource creation. Conflicts with `activation_key`. Gateway must be accessible on port 80 from where Terraform is running. Additional information is available in the [Storage Gateway User Guide](https://docs.aws.amazon.com/storagegateway/latest/userguide/get-activation-key.html).",
      new: "* `gateway_ip_address` - (Optional) Gateway IP address to retrieve activation key during resource creation. Conflicts with `activation_key`. Gateway must be accessible on port 80 from where this provider is running. Additional information is available in the [Storage Gateway User Guide](https://docs.aws.amazon.com/storagegateway/latest/userguide/get-activation-key.html).",
    },
    {
      old: "* `gateway_vpc_endpoint` - (Optional) VPC endpoint address to be used when activating your gateway. This should be used when your instance is in a private subnet. Requires HTTP access from client computer running terraform. More info on what ports are required by your VPC Endpoint Security group in [Activating a Gateway in a Virtual Private Cloud](https://docs.aws.amazon.com/storagegateway/latest/userguide/gateway-private-link.html).",
      new: "* `gateway_vpc_endpoint` - (Optional) VPC endpoint address to be used when activating your gateway. This should be used when your instance is in a private subnet. Requires HTTP access from client computer running this provider. More info on what ports are required by your VPC Endpoint Security group in [Activating a Gateway in a Virtual Private Cloud](https://docs.aws.amazon.com/storagegateway/latest/userguide/gateway-private-link.html).",
    },
    {
      old: "* `medium_changer_type` - (Optional) Type of medium changer to use for tape gateway. Terraform cannot detect drift of this argument. Valid values: `STK-L700`, `AWS-Gateway-VTL`, `IBM-03584L32-0402`.",
      new: "* `medium_changer_type` - (Optional) Type of medium changer to use for tape gateway. This provider cannot detect drift of this argument. Valid values: `STK-L700`, `AWS-Gateway-VTL`, `IBM-03584L32-0402`.",
    },
    {
      old: "* `smb_guest_password` - (Optional) Guest password for Server Message Block (SMB) file shares. Only valid for `FILE_S3` and `FILE_FSX_SMB` gateway types. Must be set before creating `GuestAccess` authentication SMB file shares. Terraform can only detect drift of the existence of a guest password, not its actual value from the gateway. Terraform can however update the password with changing the argument.",
      new: "* `smb_guest_password` - (Optional) Guest password for Server Message Block (SMB) file shares. Only valid for `FILE_S3` and `FILE_FSX_SMB` gateway types. Must be set before creating `GuestAccess` authentication SMB file shares. This provider can only detect drift of the existence of a guest password, not its actual value from the gateway. This provider can however update the password with changing the argument.",
    },
    {
      old: "* `tape_drive_type` - (Optional) Type of tape drive to use for tape gateway. Terraform cannot detect drift of this argument. Valid values: `IBM-ULT3580-TD5`.",
      new: "* `tape_drive_type` - (Optional) Type of tape drive to use for tape gateway. This provider cannot detect drift of this argument. Valid values: `IBM-ULT3580-TD5`.",
    },
    {
      old: "~> **NOTE** It is not possible to unconfigure this setting without recreating the gateway. Also, Terraform can only detect drift of the `domain_name` argument from the gateway.",
      new: "~> **NOTE** It is not possible to unconfigure this setting without recreating the gateway. Also, this provider can only detect drift of the `domain_name` argument from the gateway.",
    },
    {
      old: "Certain resource arguments, like `gateway_ip_address` do not have a Storage Gateway API method for reading the information after creation, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `gateway_ip_address` do not have a Storage Gateway API method for reading the information after creation, either omit the argument from the provider configuration or use `ignoreChanges` to hide the difference.",
    },
  ],
  "website/docs/r/storagegateway_upload_buffer.html.markdown": [
    {
      old: "~> **NOTE:** The Storage Gateway API provides no method to remove an upload buffer disk. Destroying this Terraform resource does not perform any Storage Gateway actions.",
      new: "~> **NOTE:** The Storage Gateway API provides no method to remove an upload buffer disk. Destroying this resource does not perform any Storage Gateway actions.",
    },
  ],
  "website/docs/r/storagegateway_working_storage.html.markdown": [
    {
      old: "~> **NOTE:** The Storage Gateway API provides no method to remove a working storage disk. Destroying this Terraform resource does not perform any Storage Gateway actions.",
      new: "~> **NOTE:** The Storage Gateway API provides no method to remove a working storage disk. Destroying this resource does not perform any Storage Gateway actions.",
    },
  ],
  "website/docs/r/subnet.html.markdown": [
    {
      old: '~> **NOTE:** Due to [AWS Lambda improved VPC networking changes that began deploying in September 2019](https://aws.amazon.com/blogs/compute/announcing-improved-vpc-networking-for-aws-lambda-functions/), subnets associated with Lambda Functions can take up to 45 minutes to successfully delete. Terraform AWS Provider version 2.31.0 and later automatically handles this increased timeout, however prior versions require setting the [customizable deletion timeout](#timeouts) to 45 minutes (`delete = "45m"`). AWS and HashiCorp are working together to reduce the amount of time required for resource deletion and updates can be tracked in this [GitHub issue](https://github.com/hashicorp/terraform-provider-aws/issues/10329).',
      new: "~> **NOTE:** Due to [AWS Lambda improved VPC networking changes that began deploying in September 2019](https://aws.amazon.com/blogs/compute/announcing-improved-vpc-networking-for-aws-lambda-functions/), subnets associated with Lambda Functions can take up to 45 minutes to successfully delete.",
    },
  ],
  "website/docs/r/swf_domain.html.markdown": [
    {
      old: '  description                                 = "Terraform SWF Domain"',
      new: '  description                                 = "SWF Domain"',
    },
    {
      old: "* `name` - (Optional, Forces new resource) The name of the domain. If omitted, Terraform will assign a random, unique name.",
      new: "* `name` - (Optional, Forces new resource) The name of the domain. If omitted, this provider will assign a random, unique name.",
    },
  ],
  "website/docs/r/synthetics_canary.html.markdown": [
    {
      old: "~> **NOTE:** When you create a canary, AWS creates supporting implicit resources. See the Amazon CloudWatch Synthetics documentation on [DeleteCanary](https://docs.aws.amazon.com/AmazonSynthetics/latest/APIReference/API_DeleteCanary.html) for a full list. Neither AWS nor Terraform deletes these implicit resources automatically when the canary is deleted. Before deleting a canary, ensure you have all the information about the canary that you need to delete the implicit resources using Terraform shell commands, the AWS Console, or AWS CLI.",
      new: "~> **NOTE:** When you create a canary, AWS creates supporting implicit resources. See the Amazon CloudWatch Synthetics documentation on [DeleteCanary](https://docs.aws.amazon.com/AmazonSynthetics/latest/APIReference/API_DeleteCanary.html) for a full list. Neither AWS nor this provider deletes these implicit resources automatically when the canary is deleted. Before deleting a canary, ensure you have all the information about the canary that you need to delete the implicit resources using the AWS Console, or AWS CLI.",
    },
  ],
  "website/docs/r/transfer_server.html.markdown": [
    {
      old: "Certain resource arguments, such as `host_key`, cannot be read via the API and imported into Terraform. Terraform will display a difference for these arguments the first run after import if declared in the Terraform configuration for an imported resource.",
      new: "Certain resource arguments, such as `host_key`, cannot be read via the API and imported into the provider. This provider will display a difference for these arguments the first run after import if declared in the provider configuration for an imported resource.",
    },
  ],
  "website/docs/r/transfer_user.html.markdown": [
    {
      old: "* `policy` - (Optional) An IAM JSON policy document that scopes down user access to portions of their Amazon S3 bucket. IAM variables you can use inside this policy include `${Transfer:UserName}`, `${Transfer:HomeDirectory}`, and `${Transfer:HomeBucket}`. Since the IAM variable syntax matches Terraform's interpolation syntax, they must be escaped inside Terraform configuration strings (`$${Transfer:UserName}`).  These are evaluated on-the-fly when navigating the bucket.",
      new: "* `policy` - (Optional) An IAM JSON policy document that scopes down user access to portions of their Amazon S3 bucket. IAM variables you can use inside this policy include `${Transfer:UserName}`, `${Transfer:HomeDirectory}`, and `${Transfer:HomeBucket}`. These are evaluated on-the-fly when navigating the bucket.",
    },
  ],
  "website/docs/r/volume_attachment.html.markdown": [
    {
      old: "~> **NOTE on EBS block devices:** If you use `ebs_block_device` on an `aws_instance`, Terraform will assume management over the full set of non-root EBS block devices for the instance, and treats additional block devices as drift. For this reason, `ebs_block_device` cannot be mixed with external `aws_ebs_volume` + `aws_volume_attachment` resources for a given instance.",
      new: "~> **NOTE on EBS block devices:** If you use `ebs_block_device` on an `aws_instance`, this provider will assume management over the full set of non-root EBS block devices for the instance, and treats additional block devices as drift. For this reason, `ebs_block_device` cannot be mixed with external `aws_ebs_volume` + `aws_volume_attachment` resources for a given instance.",
    },
    {
      old: "time, and instead just remove the attachment from Terraform state. This is",
      new: "time, and instead just remove the attachment from this provider state. This is",
    },
  ],
  "website/docs/r/vpc_endpoint.html.markdown": [
    {
      old: "~> **NOTE The `dns_entry` output is a list of maps:** Terraform interpolation support for lists of maps requires the `lookup` and `[]` until full support of lists of maps is available",
      new: "~> **NOTE The `dns_entry` output is a list of maps:** This provider interpolation support for lists of maps requires the `lookup` and `[]` until full support of lists of maps is available",
    },
    {
      old: "* `policy` - (Optional) A policy to attach to the endpoint that controls access to the service. This is a JSON formatted string. Defaults to full access. All `Gateway` and some `Interface` endpoints support policies - see the [relevant AWS documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-access.html) for more details. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Optional) A policy to attach to the endpoint that controls access to the service. This is a JSON formatted string. Defaults to full access. All `Gateway` and some `Interface` endpoints support policies - see the [relevant AWS documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-access.html) for more details.",
    },
  ],
  "website/docs/r/vpc_endpoint_policy.html.markdown": [
    {
      old: "* `policy` - (Optional) A policy to attach to the endpoint that controls access to the service. Defaults to full access. All `Gateway` and some `Interface` endpoints support policies - see the [relevant AWS documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-access.html) for more details. For more information about building AWS IAM policy documents with Terraform, see the AWS IAM Policy Document Guide.",
      new: "* `policy` - (Optional) A policy to attach to the endpoint that controls access to the service. Defaults to full access. All `Gateway` and some `Interface` endpoints support policies - see the [relevant AWS documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints-access.html) for more details. For more information about building AWS IAM policy documents with Terraform, see the [AWS IAM Policy Document Guide](https://learn.hashicorp.com/terraform/aws/iam-policy).",
    },
  ],
  "website/docs/r/vpc_endpoint_service.html.markdown": [
    {
      old: "~> **NOTE on VPC Endpoint Services and VPC Endpoint Service Allowed Principals:** Terraform provides",
      new: "~> **NOTE on VPC Endpoint Services and VPC Endpoint Service Allowed Principals:** This provider provides",
    },
  ],
  "website/docs/r/vpc_endpoint_service_allowed_principal.html.markdown": [
    {
      old: "~> **NOTE on VPC Endpoint Services and VPC Endpoint Service Allowed Principals:** Terraform provides",
      new: "~> **NOTE on VPC Endpoint Services and VPC Endpoint Service Allowed Principals:** This provider provides",
    },
  ],
  "website/docs/r/vpc_endpoint_subnet_association.html.markdown": [
    {
      old: "~> **NOTE on VPC Endpoints and VPC Endpoint Subnet Associations:** Terraform provides",
      new: "~> **NOTE on VPC Endpoints and VPC Endpoint Subnet Associations:** This provider provides",
    },
  ],
  "website/docs/r/vpc_peering_connection.html.markdown": [
    {
      old: "~> **NOTE on VPC Peering Connections and VPC Peering Connection Options:** Terraform provides",
      new: "~> **NOTE on VPC Peering Connections and VPC Peering Connection Options:** This provider provides",
    },
  ],
  "website/docs/r/vpc_peering_connection_accepter.html.markdown": [
    {
      old: "However, Terraform only allows the VPC Peering Connection to be deleted from the requester's side",
      new: "However, this provider only allows the VPC Peering Connection to be deleted from the requester's side",
    },
    {
      old: "Certain resource arguments, like `auto_accept`, do not have an EC2 API method for reading the information after peering connection creation. If the argument is set in the Terraform configuration on an imported resource, Terraform will always show a difference. To workaround this behavior, either omit the argument from the Terraform configuration or use `ignore_changes` to hide the difference, e.g.,",
      new: "Certain resource arguments, like `auto_accept`, do not have an EC2 API method for reading the information after peering connection creation. If the argument is set in the provider configuration on an imported resource, this provder will always show a difference. To workaround this behavior, either omit the argument from the configuration or use [`ignoreChanges`](https://www.pulumi.com/docs/intro/concepts/programming-model/#ignorechanges) to hide the difference, e.g.",
    },
  ],
  "website/docs/r/vpc_peering_connection_options.html.markdown": [
    {
      old: "~> **NOTE on VPC Peering Connections and VPC Peering Connection Options:** Terraform provides",
      new: "~> **NOTE on VPC Peering Connections and VPC Peering Connection Options:** This provider provides",
    },
  ],
  "website/docs/r/worklink_fleet.html.markdown": [
    {
      old: '  name = "terraform-example"',
      new: '  name = "example"',
    },
    {
      old: "~> **NOTE:** `network` cannot be removed without force recreating by `terraform taint`.",
      new: "~> **NOTE:** `network` is cannot removed without force recreating.",
    },
    {
      old: "~> **NOTE:** `identity_provider` cannot be removed without force recreating by `terraform taint`.",
      new: "~> **NOTE:** `identity_provider` cannot be removed without force recreating.",
    },
  ],
  "website/docs/r/worklink_website_certificate_authority_association.html.markdown":
    [
      {
        old: '  name = "terraform-example"',
        new: '  name = "example"',
      },
    ],
  "website/docs/r/xray_encryption_config.html.markdown": [
    {
      old: "~> **NOTE:** Removing this resource from Terraform has no effect to the encryption configuration within X-Ray.",
      new: "~> **NOTE:** Removing this resource from the provider has no effect to the encryption configuration within X-Ray.",
    },
  ],
};
