// Bumps the app version in `package.json` and `src/constants/version.ts`.
// Usage:
//   node scripts/bump-version.mjs [patch|minor]   (default: patch)
// Run automatically by the commit-msg hook, or manually via `npm run version:bump`.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const bumpType = process.argv[2] ?? 'patch';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = resolve(root, 'package.json');
const versionTsPath = resolve(root, 'src', 'constants', 'version.ts');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const prev = pkg.version;

const [major, minor, patch] = prev.split('.').map(Number);
if (![major, minor, patch].every(Number.isFinite)) {
    console.error(`bump-version: invalid version "${prev}" in package.json`);
    process.exit(1);
}

let next;
if (bumpType === 'minor') {
    next = `${major}.${minor + 1}.0`;
} else if (bumpType === 'patch') {
    next = `${major}.${minor}.${patch + 1}`;
} else {
    console.error(`bump-version: unknown bump type "${bumpType}" (expected "patch" or "minor")`);
    process.exit(1);
}

pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const versionTs = readFileSync(versionTsPath, 'utf8');
const updated = versionTs.replace(/APP_VERSION = '[^']*'/, `APP_VERSION = '${next}'`);
if (updated === versionTs) {
    console.error(`bump-version: could not find APP_VERSION in ${versionTsPath}`);
    process.exit(1);
}
writeFileSync(versionTsPath, updated);

console.log(`bump-version: ${prev} -> ${next} (${bumpType})`);
