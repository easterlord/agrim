#!/usr/bin/env node
/**
 * EzFame migration — patches the seeded RTDB settings with:
 *  • siteName "EzFame" (+ bot persona)
 *  • master admin credentials agrim / ramesh (sha256 hashes)
 *  • crypto payments HIDDEN by default (admin toggle re-enables)
 *  • EzFame social handles
 * Only patches brand/credential/visibility fields — never orders/users/catalog.
 */
const BASE = "https://cipher-dump-default-rtdb.asia-southeast1.firebasedatabase.app";
import { createHash } from "node:crypto";
const sha = (s) => createHash("sha256").update(s).digest("hex");

const patches = {
  "/csmm/settings.json": {
    siteName: "EzFame",
    tagline: "SMM & Game Top-Up Superstore",
    adminUserHash: sha("agrim"),
    adminPassHash: sha("ramesh"),
    updatedAt: Date.now(),
  },
  "/csmm/settings/chatbot.json": {
    botName: "EzFame AI",
    welcome:
      "Namaste! I'm EzFame AI. Ask me about prices, delivery time, payments or track your order (send your ORD-XXXXXX id).",
    systemPrompt:
      "You are EzFame AI, the friendly support assistant for EzFame — an SMM & game top-up store for Nepal. Answer in the user's language (English/Nepali/Hindi). Be short, helpful and factual. Use the store context provided to answer pricing, payment and order questions.",
  },
  "/csmm/settings/payments/crypto.json": {
    enabled: false,
  },
  "/csmm/settings/social.json": {
    telegram: "https://t.me/ezfame_support",
    email: "support@ezfame.com",
    instagram: "https://instagram.com/ezfame",
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
  // leaf values need PUT
  for (const [path, val] of [
    ["/csmm/settings/payments/esewa/accountName.json", "EzFame Store"],
    ["/csmm/settings/payments/khalti/accountName.json", "EzFame Store"],
    ["/csmm/settings/payments/bank/accountName.json", "EzFame Traders Pvt. Ltd."],
  ]) {
    const res = await fetch(BASE + path, { method: "PUT", body: JSON.stringify(val) });
    console.log(path, "->", res.ok ? "OK" : `HTTP ${res.status}`);
  }
  const check = await (await fetch(BASE + "/csmm/settings.json")).json();
  console.log(
    "verify:",
    check.siteName,
    "| userHash=agrim:",
    check.adminUserHash === sha("agrim"),
    "| passHash=ramesh:",
    check.adminPassHash === sha("ramesh"),
    "| crypto hidden:",
    check.payments?.crypto?.enabled === false,
  );
})();
