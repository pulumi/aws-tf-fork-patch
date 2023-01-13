import { replaceLinks, LinkStripConfig } from "./docsLinkStripping";

function testReplace(content: string, domains?: LinkStripConfig) {
  return replaceLinks(content, {
    allowedDomains: new Set(domains?.allowedDomains),
    blockedDomains: new Set(domains?.blockedDomains),
    allowedGitHubOrgs: new Set(domains?.allowedGitHubOrgs),
    blockedGitHubOrgs: new Set(domains?.blockedGitHubOrgs),
  });
}

const stripped = `Some linked content`;

test("relative link", () => {
  const content = `Some [linked](/relative-link) content`;
  expect(testReplace(content)).toEqual(stripped);
});

test("anchor link", () => {
  const content = `Some [linked](#anchor) content`;
  expect(testReplace(content)).toEqual(content);
});

test("root link", () => {
  const content = `Some [linked](/) content`;
  expect(testReplace(content)).toEqual(stripped);
});

test("allowed github repo", () => {
  const content = `Some [linked](https://github.com/pulumi/test) content`;
  const replaced = testReplace(content, { allowedGitHubOrgs: ["pulumi"] });
  expect(replaced).toEqual(content);
});

test("blocked github repo", () => {
  const content = `Some [linked](https://github.com/pulumi/test) content`;
  const replaced = testReplace(content, { blockedGitHubOrgs: ["pulumi"] });
  expect(replaced).toEqual(stripped);
});

test("allowed domain", () => {
  const content = `Some [linked](https://domain.test) content`;
  const replaced = testReplace(content, { allowedDomains: ["domain.test"] });
  expect(replaced).toEqual(content);
});

test("blocked domain", () => {
  const content = `Some [linked](https://domain.test) content`;
  const replaced = testReplace(content, { blockedDomains: ["domain.test"] });
  expect(replaced).toEqual(stripped);
});
