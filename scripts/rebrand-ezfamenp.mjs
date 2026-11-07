#!/usr/bin/env node
/**
 * EzFameNp rebrand codemod (idempotent).
 * Applies ordered, exact-string replacements across first-party files and
 * prints a per-pattern hit report. Re-running after a full migration = 0 hits.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = "/home/z/my-project";

// ordered — longest / most specific first where overlapping
const REPLACEMENTS = [
  ["EzfaNep", "EzFameNp"],            // display brand
  ["Ezfa AI", "EzFame AI"],           // assistant persona
  ["EZFA\n", "EZFAME\n"],             // splash mark (page.tsx)
  ["ezfanep", "ezfamenp"],            // handles, firebase app names, filenames
  ["ezfa-logo-grad", "ezfamenp-logo-grad"],
  ["ezfa:", "ezfamenp:"],             // localStorage key namespace
  ["CipherSMM", "EzFameNp"],          // legacy project name in docs/env
];

// collect first-party text files (never touch node_modules/out/.next/upload)
const raw = execSync(
  `rg -l -g '!node_modules' -g '!out' -g '!.next' -g '!dev.log' -g '!tsconfig.tsbuildinfo' -e 'EzfaNep|Ezfa AI|ezfanep|ezfa:|ezfa-logo-grad|CipherSMM' ${ROOT}`,
  { encoding: "utf8" },
);
const files = raw.split("\n").map((f) => f.trim()).filter(Boolean);
// package.json handled separately (name field edit)
const pkgIdx = files.indexOf(`${ROOT}/package.json`);
if (pkgIdx >= 0) files.splice(pkgIdx, 1);
// this codemod must never rewrite itself
const selfIdx = files.indexOf(`${ROOT}/scripts/rebrand-ezfamenp.mjs`);
if (selfIdx >= 0) files.splice(selfIdx, 1);

const report = {};
for (const file of files) {
  let text = readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of REPLACEMENTS) {
    if (text.includes(from)) {
      const n = text.split(from).length - 1;
      report[from] = (report[from] ?? 0) + n;
      text = text.split(from).join(to);
      changed = true;
    }
  }
  if (changed) writeFileSync(file, text);
}

console.log("files touched:", files.length);
for (const [from, to] of REPLACEMENTS) {
  if (report[from]) console.log(`  ${from} -> ${to}: ${report[from]}`);
}
