import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const outputDirectory = join('apps', 'extension', '.output');
const manifestPath = join(outputDirectory, 'chrome-mv3', 'manifest.json');
const expectedPermissions = ['activeTab', 'scripting', 'storage'];
const forbiddenArtifactEntries = [
  /(^|\/)\.env(?:\.|$)/u,
  /\.log$/u,
  /\.map$/u,
  /(^|\/)(?:test|tests|__tests__)(?:\/|$)/u,
  /\.(?:spec|test)\.[cm]?[jt]sx?$/u,
];

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert(manifest.manifest_version === 3, 'The generated manifest must use Manifest V3.');
assert(
  arraysEqual([...manifest.permissions].sort(), [...expectedPermissions].sort()),
  `Unexpected manifest permissions: ${JSON.stringify(manifest.permissions)}`,
);
assert(
  !Array.isArray(manifest.host_permissions) || manifest.host_permissions.length === 0,
  'Persistent host permissions are prohibited in v0.1.',
);
assert(
  !Array.isArray(manifest.content_scripts) || manifest.content_scripts.length === 0,
  'Static content scripts are prohibited in v0.1; use activeTab injection.',
);

const zipFiles = readdirSync(outputDirectory).filter((fileName) =>
  fileName.endsWith('-chrome.zip'),
);
assert(zipFiles.length === 1, `Expected one Chrome zip, found ${zipFiles.length}.`);

const zipPath = join(outputDirectory, zipFiles[0]);
const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

for (const entry of entries) {
  assert(
    !forbiddenArtifactEntries.some((pattern) => pattern.test(entry)),
    `Forbidden release artifact entry: ${entry}`,
  );
}

console.log(`Verified ${zipPath} with ${entries.length} packaged entries.`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
