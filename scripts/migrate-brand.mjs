#!/usr/bin/env node
/**
 * One-time migration: update the already-seeded RTDB `csmm/settings`
 * with the EzFameNp brand strings + new admin credential hashes.
 * Only patches brand/credential fields — never touches orders/users/catalog.
 */
const BASE = "https://cipher-dump-default-rtdb.asia-southeast1.firebasedatabase.app";

const patches = {
  "/csmm/settings.json": {
    siteName: "EzFameNp",
    tagline: "SMM & Game Top-Up Superstore",
    adminUserHash: "49e60a7c53c51ba018595353811cefaeb20b5a27d2567fdce469cb1e77fc2312",
    adminPassHash: "22826098872362e4f91b09da2d5439386830842e74df2f5fa8c0bd6ab9b5b2a4",
    adminPasscodeHash: null, // remove legacy key
    updatedAt: Date.now(),
  },
  "/csmm/settings/chatbot.json": {
    botName: "EzFame AI",
    welcome:
      "Namaste! I'm EzFame AI. Ask me about prices, delivery time, payments or track your order (send your ORD-XXXXXX id).",
    systemPrompt:
      "You are EzFame AI, the friendly support assistant for EzFameNp — an SMM & game top-up store for Nepal. Answer in the user's language (English/Nepali/Hindi). Be short, helpful and factual. Use the store context provided to answer pricing, payment and order questions.",
  },
  // NOTE: leaf values (payments/*/accountName) must be written with PUT —
  // applied separately; RTDB rejects PATCH on leaf nodes.
  "/csmm/settings/social.json": {
    telegram: "https://t.me/ezfamenp_support",
    email: "support@ezfamenp.com",
    instagram: "https://instagram.com/ezfamenp",
  },
};

(async () => {
  for (const [path, body] of Object.entries(patches)) {
    const res = await fetch(BASE + path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log(path, "->", res.ok ? "OK" : `HTTP ${res.status}`);
    if (!res.ok) process.exitCode = 1;
  }
  const check = await (await fetch(BASE + "/csmm/settings.json")).json();
  console.log("verify siteName:", check.siteName, "| adminUserHash set:", Boolean(check.adminUserHash), "| legacy removed:", !("adminPasscodeHash" in check));
})();
