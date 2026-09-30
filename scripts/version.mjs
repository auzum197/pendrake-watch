#!/usr/bin/env node
// The app version is declared in six files. This script reads them all, refuses
// to answer when they disagree, and rewrites them together for `just bump`. The
// release workflow runs `check <tag version>` so a tag never ships metadata that
// contradicts it.
//
//   node scripts/version.mjs check [expected]   print the version, exit 1 on mismatch
//   node scripts/version.mjs set <version>      rewrite every field, then check
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const semver = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?`;
const jsonField = new RegExp(`("version":\\s*")(${semver})(")`);
const cargoField = new RegExp(`(^version = ")(${semver})(")`, "m");

// Each pattern matches the first occurrence only and captures the text on both
// sides, so a rewrite replaces the version characters and nothing else.
// pkgver cannot carry a hyphen, so the PKGBUILD stores 0.2.0-rc1 as 0.2.0_rc1.
const fields = [
  { file: "package.json", pattern: jsonField },
  { file: "src-tauri/tauri.conf.json", pattern: jsonField },
  { file: "src-tauri/Cargo.toml", pattern: cargoField },
  { file: "crates/Cargo.toml", pattern: cargoField },
  {
    file: "platform/macos/PendrakeSync/Info.plist",
    pattern: new RegExp(
      `(<key>CFBundleShortVersionString</key><string>)(${semver})(</string>)`,
    ),
  },
  {
    file: "packaging/arch/PKGBUILD",
    pattern: /(^pkgver=)([0-9A-Za-z._]+)()$/m,
    encode: (version) => version.replaceAll("-", "_"),
    decode: (pkgver) => pkgver.replaceAll("_", "-"),
  },
];

function readField({ file, pattern, decode }) {
  const text = readFileSync(resolve(root, file), "utf8");
  const match = text.match(pattern);
  if (!match) throw new Error(`${file}: no version field found`);
  return decode ? decode(match[2]) : match[2];
}

function writeField({ file, pattern, encode }, version) {
  const path = resolve(root, file);
  const text = readFileSync(path, "utf8");
  const encoded = encode ? encode(version) : version;
  let next = text.replace(
    pattern,
    (_, before, _old, after) => `${before}${encoded}${after}`,
  );
  if (file.endsWith("PKGBUILD"))
    next = next.replace(/^pkgrel=\d+$/m, "pkgrel=1");
  writeFileSync(path, next);
}

function check(expected) {
  const found = fields.map((field) => [field.file, readField(field)]);
  const versions = new Set(found.map(([, version]) => version));
  if (expected) versions.add(expected);
  if (versions.size > 1) {
    if (expected) console.error(`expected ${expected}`);
    for (const [file, version] of found) console.error(`${version}\t${file}`);
    process.exit(1);
  }
  console.log(found[0][1]);
}

const [command = "check", argument] = process.argv.slice(2);
switch (command) {
  case "check":
    check(argument);
    break;
  case "set": {
    if (!argument || !new RegExp(`^${semver}$`).test(argument)) {
      console.error(
        `usage: version.mjs set <X.Y.Z[-pre]>, got ${JSON.stringify(argument)}`,
      );
      process.exit(2);
    }
    for (const field of fields) writeField(field, argument);
    check(argument);
    break;
  }
  default:
    console.error(`unknown command ${command}, expected check or set`);
    process.exit(2);
}
