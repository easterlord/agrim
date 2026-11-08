#!/usr/bin/env node
/**
 * EzFame rebrand codemod (idempotent): EzFameNp → EzFame.
 * MUST run before inserting the exact Firebase config literals
 * (projectId "ezfamenp" etc. must NOT be touched).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = "/home/z/my-project";

const REPLACEMENTS = [
  ["EzFameNp", "EzFame"],   // display brand
  ["ezfamenp", "ezfame"],   // handles, LS keys, firebase app names, filenames
];

const raw = execSync(
  `rg -l -g '!node_modules' -g '!out' -g '!.next' -g '!dev.log' -g '!tsconfig.tsbuildinfo' -g '!bun.lock' -e 'EzFameNp|ezfamenp' ${ROOT}`,
  { encoding: "utf8" },
);
const files = raw.split("\n").map((f) => f.trim()).filter(Boolean);
for (const skip of [`${ROOT}/scripts/rebrand-ezfame.mjs`, `${ROOT}/package.json`]) {
  const i = files.indexOf(skip);
  if (i >= 0) files.splice(i, 1);
}

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
