#!/usr/bin/env node
/* ============================================================
 * EzFame — GitHub Pages static export builder (custom domain:
 * denishg.com.np).
 *
 *   node scripts/ghp-build.mjs
 *
 * Produces a fully static `out/` directory:
 *   • SPA index.html for the hash router
 *   • 404.html SPA-redirect fallback (so /original, /orders …
 *     work as real paths on GitHub Pages + the custom domain)
 *   • .nojekyll (serve everything, no Jekyll processing)
 *   • CNAME → denishg.com.np (keeps the custom domain binding)
 * ============================================================ */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const CUSTOM_DOMAIN = "denishg.com.np";

/** keep in sync with KNOWN_PATHS in src/lib/router.tsx */
const KNOWN_PATHS = [
  "original",
  "checkout",
  "orders",
  "track",
  "account",
  "login",
  "shop",
  "services",
  "mass",
  "refunds",
  "support",
];

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

  // custom domain binding — always (re)written so a bare `out/` deploy keeps it
  writeFileSync(path.join(out, "CNAME"), `${CUSTOM_DOMAIN}\n`);

  // build 404.html: loads the SPA, then converts the visited path to a hash route
  const indexPath = path.join(out, "index.html");
  if (existsSync(indexPath)) {
    const index = readFileSync(indexPath, "utf8");
    const knownJson = JSON.stringify(KNOWN_PATHS);
    const redirectScript = `
<script>
(function () {
  try {
    var seg = location.pathname.replace(/^.*\\//, '').replace(/\\/+$/, '').toLowerCase();
    var known = ${knownJson};
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

  console.log(`\n✔ GitHub Pages export ready → out/  (custom domain: ${CUSTOM_DOMAIN})`);
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
