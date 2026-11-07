#!/usr/bin/env node
/* ============================================================
 * EzFameNp — GitHub Pages static export builder.
 *
 *   node scripts/ghp-build.mjs
 *
 * Produces a fully static `out/` directory:
 *   • SPA index.html for the hash router
 *   • 404.html with automatic `?p=<path>` redirect fallback
 *     (so /original, /orders … work as real paths on GH Pages)
 *   • .nojekyll (serve everything, no Jekyll processing)
 * ============================================================ */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

/* ---------- 1. temporarily hide server-only dirs (API route, prisma) ---------- */
const stash = [
  { from: path.join(root, "src/app/api"), to: path.join(root, ".ghp-stash/api") },
  { from: path.join(root, "prisma"), to: path.join(root, ".ghp-stash/prisma") },
];
mkdirSync(path.join(root, ".ghp-stash"), { recursive: true });
for (const s of stash) {
  if (existsSync(s.from)) {
    rmSync(s.to, { recursive: true, force: true });
    execSync(`mv "${s.from}" "${s.to}"`);
  }
}

try {
  /* ---------- 2. static export build ---------- */
  process.env.NEXT_EXPORT = "1";
  execSync("bunx next build", { stdio: "inherit", env: process.env, cwd: root });

  /* ---------- 3. post-process out/ ---------- */
  const out = path.join(root, "out");
  if (!existsSync(out)) throw new Error("`out/` missing — export failed");

  writeFileSync(path.join(out, ".nojekyll"), "");

  // build 404.html: loads the SPA, then converts the visited path to a hash route
  const indexPath = path.join(out, "index.html");
  if (existsSync(indexPath)) {
    const index = readFileSync(indexPath, "utf8");
    const redirectScript = `
<script>
(function () {
  try {
    var seg = location.pathname.replace(/^.*\\//, '').replace(/\\/+$/, '').toLowerCase();
    var known = ['original','checkout','orders','track','account','login','shop'];
    if (seg && known.indexOf(seg) !== -1) {
      history.replaceState(null, '', location.pathname.slice(0, location.pathname.length - seg.length));
      location.replace('#/' + seg);
      return;
    }
    location.replace('#/');
  } catch (e) { location.replace('#/'); }
})();
</script>`;
    // 404.html serves the app shell + redirector
    const fallback = index.replace("</body>", `${redirectScript}</body>`);
    writeFileSync(path.join(out, "404.html"), fallback);
  }

  console.log("\n✔ GitHub Pages export ready → out/  (deploy: push out/ to gh-pages branch)");
} finally {
  /* ---------- 4. restore stashed dirs ---------- */
  for (const s of stash) {
    if (existsSync(s.to)) {
      rmSync(s.from, { recursive: true, force: true });
      execSync(`mv "${s.to}" "${s.from}"`);
    }
  }
  rmSync(path.join(root, ".ghp-stash"), { recursive: true, force: true });
}
