/* ============================================================
 * EzfaNep — Default catalog & settings (used to seed Firebase
 * RTDB on first run and as an offline fallback cache).
 * ============================================================ */

import type { Platform, Settings } from "./types";

export const DEFAULT_DB_URL =
  "https://cipher-dump-default-rtdb.asia-southeast1.firebasedatabase.app";

/** Default admin credentials — changeable in Admin ▸ Settings. */
export const DEFAULT_ADMIN_USERNAME = "ramesh";
/** sha256("ramesh") */
export const DEFAULT_ADMIN_USER_HASH =
  "49e60a7c53c51ba018595353811cefaeb20b5a27d2567fdce469cb1e77fc2312";
/** sha256("agrim") */
export const DEFAULT_ADMIN_PASS_HASH =
  "22826098872362e4f91b09da2d5439386830842e74df2f5fa8c0bd6ab9b5b2a4";

export const DEFAULT_EXCHANGE_RATE = 133.5;

const svc = (
  id: string,
  name: string,
  kindLabel: string,
  pricePerKUSD: number,
  extra: Partial<Platform["services"][number]> = {},
): Platform["services"][number] => ({
  id,
  name,
  kindLabel,
  pricePerKUSD,
  minQty: 100,
  maxQty: 100000,
  stepQty: 50,
  speed: "0-1 h",
  active: true,
  ...extra,
});

const pkg = (
  id: string,
  label: string,
  qty: number,
  priceUSD: number,
  hot = false,
  bonus?: string,
) => ({ id, label, qty, priceUSD, hot, bonus });

export const DEFAULT_CATALOG: Platform[] = [
  {
    id: "instagram",
    name: "Instagram",
    kind: "social",
    color: "#E1306C",
    unit: "followers",
    services: [
      svc("ig-followers", "Followers", "followers", 1.35, {
        warranty: "30 days refill",
        description: "High quality followers, real looking profiles with dp & posts.",
      }),
      svc("ig-likes", "Likes", "likes", 0.48, { minQty: 50, maxQty: 50000 }),
      svc("ig-views", "Video Views", "views", 0.16, { minQty: 500, maxQty: 1000000 }),
      svc("ig-reels", "Reels Views", "views", 0.22, { minQty: 500, maxQty: 1000000 }),
      svc("ig-story", "Story Views", "views", 0.35, { minQty: 200, maxQty: 50000 }),
      svc("ig-comments", "Custom Comments", "comments", 8.5, { minQty: 10, maxQty: 2000, stepQty: 5 }),
    ],
  },
  {
    id: "youtube",
    name: "YouTube",
    kind: "social",
    color: "#FF0000",
    unit: "views",
    services: [
      svc("yt-subs", "Subscribers", "subscribers", 12.5, { minQty: 50, maxQty: 20000, stepQty: 10 }),
      svc("yt-views", "Views", "views", 1.85, { minQty: 500, maxQty: 500000 }),
      svc("yt-likes", "Likes", "likes", 1.6, { minQty: 50, maxQty: 50000 }),
      svc("yt-watch", "Watch Hours", "hours", 32, { minQty: 100, maxQty: 10000, stepQty: 50, speed: "6-24 h" }),
      svc("yt-comments", "Custom Comments", "comments", 16, { minQty: 10, maxQty: 1000, stepQty: 5 }),
    ],
  },
  {
    id: "facebook",
    name: "Facebook",
    kind: "social",
    color: "#1877F2",
    unit: "likes",
    services: [
      svc("fb-followers", "Page Followers", "followers", 1.45, { minQty: 100, maxQty: 100000 }),
      svc("fb-likes", "Post Likes", "likes", 0.62, { minQty: 50, maxQty: 50000 }),
      svc("fb-views", "Video Views", "views", 0.35, { minQty: 500, maxQty: 500000 }),
      svc("fb-members", "Group Members", "members", 2.4, { minQty: 100, maxQty: 20000 }),
    ],
  },
  {
    id: "tiktok",
    name: "TikTok",
    kind: "social",
    color: "#FE2C55",
    unit: "followers",
    services: [
      svc("tt-followers", "Followers", "followers", 2.25, { minQty: 100, maxQty: 100000 }),
      svc("tt-likes", "Likes", "likes", 0.75, { minQty: 50, maxQty: 100000 }),
      svc("tt-views", "Views", "views", 0.12, { minQty: 500, maxQty: 5000000 }),
      svc("tt-comments", "Custom Comments", "comments", 6.2, { minQty: 10, maxQty: 2000, stepQty: 5 }),
    ],
  },
  {
    id: "telegram",
    name: "Telegram",
    kind: "social",
    color: "#229ED9",
    unit: "members",
    services: [
      svc("tg-members", "Channel Members", "members", 2.85, { minQty: 100, maxQty: 50000, speed: "1-6 h" }),
      svc("tg-views", "Post Views", "views", 0.09, { minQty: 500, maxQty: 500000 }),
      svc("tg-reactions", "Reactions", "reactions", 0.55, { minQty: 50, maxQty: 20000 }),
      svc("tg-premium", "Premium Members", "members", 9.8, { minQty: 50, maxQty: 10000, speed: "1-12 h" }),
    ],
  },
  {
    id: "twitter",
    name: "Twitter / X",
    kind: "social",
    color: "#e7e9ea",
    unit: "followers",
    services: [
      svc("x-followers", "Followers", "followers", 4.6, { minQty: 100, maxQty: 50000 }),
      svc("x-likes", "Likes", "likes", 1.15, { minQty: 50, maxQty: 50000 }),
      svc("x-retweets", "Retweets", "retweets", 1.85, { minQty: 50, maxQty: 20000 }),
      svc("x-views", "Impressions", "views", 0.2, { minQty: 500, maxQty: 1000000 }),
    ],
  },
  {
    id: "clubhouse",
    name: "Clubhouse",
    kind: "social",
    color: "#F1E0C5",
    unit: "followers",
    services: [
      svc("ch-followers", "Followers", "followers", 6.2, { minQty: 50, maxQty: 20000 }),
      svc("ch-room", "Room Listeners", "listeners", 3.4, { minQty: 100, maxQty: 10000, speed: "1-6 h" }),
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    kind: "social",
    color: "#0A66C2",
    unit: "followers",
    services: [
      svc("li-followers", "Followers", "followers", 8.2, { minQty: 100, maxQty: 20000 }),
      svc("li-connections", "Connections", "connections", 7.4, { minQty: 100, maxQty: 10000, speed: "6-24 h" }),
      svc("li-likes", "Post Likes", "likes", 2.6, { minQty: 50, maxQty: 10000 }),
    ],
  },
  {
    id: "googleplus",
    name: "Google+",
    kind: "social",
    color: "#DB4437",
    unit: "followers",
    services: [
      svc("g-followers", "Profile Followers", "followers", 2.4, { minQty: 100, maxQty: 20000 }),
      svc("g-ones", "+1 Likes", "likes", 1.05, { minQty: 50, maxQty: 10000 }),
    ],
  },
  {
    id: "likee",
    name: "Likee",
    kind: "social",
    color: "#FF4E6B",
    unit: "followers",
    services: [
      svc("lk-followers", "Followers", "followers", 2.55, { minQty: 100, maxQty: 50000 }),
      svc("lk-likes", "Likes", "likes", 0.95, { minQty: 50, maxQty: 50000 }),
      svc("lk-views", "Views", "views", 0.15, { minQty: 500, maxQty: 1000000 }),
    ],
  },
  {
    id: "spotify",
    name: "Spotify",
    kind: "social",
    color: "#1DB954",
    unit: "plays",
    services: [
      svc("sp-followers", "Followers", "followers", 3.2, { minQty: 100, maxQty: 50000 }),
      svc("sp-plays", "Plays", "plays", 0.92, { minQty: 1000, maxQty: 1000000, speed: "1-3 h" }),
      svc("sp-monthly", "Monthly Listeners", "listeners", 5.4, { minQty: 500, maxQty: 50000, speed: "1-3 d" }),
    ],
  },
  {
    id: "pinterest",
    name: "Pinterest",
    kind: "social",
    color: "#E60023",
    unit: "followers",
    services: [
      svc("pi-followers", "Followers", "followers", 3.05, { minQty: 100, maxQty: 20000 }),
      svc("pi-saves", "Saves", "saves", 1.25, { minQty: 50, maxQty: 20000 }),
      svc("pi-impressions", "Impressions", "views", 0.45, { minQty: 500, maxQty: 500000 }),
    ],
  },
  {
    id: "pubg",
    name: "PUBG Mobile UC",
    kind: "game",
    color: "#F2A900",
    unit: "UC",
    services: [
      {
        id: "pubg-uc",
        name: "PUBG Mobile — UC Top-Up",
        kindLabel: "UC",
        minQty: 1,
        maxQty: 1,
        stepQty: 1,
        active: true,
        speed: "5-30 min",
        description: "Instant UC top-up via player UID. Works on all PUBG Mobile servers.",
        packages: [
          pkg("pubg-60", "60 UC", 60, 1.09),
          pkg("pubg-325", "325 UC", 325, 5.29),
          pkg("pubg-660", "660 UC", 660, 10.49),
          pkg("pubg-1800", "1800 UC", 1800, 27.99, true, "+300 bonus"),
          pkg("pubg-3850", "3850 UC", 3850, 54.99),
          pkg("pubg-8100", "8100 UC", 8100, 109.99),
        ],
      },
    ],
  },
  {
    id: "freefire",
    name: "Free Fire Diamonds",
    kind: "game",
    color: "#FF4655",
    unit: "diamonds",
    services: [
      {
        id: "ff-diamonds",
        name: "Free Fire — Diamonds Top-Up",
        kindLabel: "Diamonds",
        minQty: 1,
        maxQty: 1,
        stepQty: 1,
        active: true,
        speed: "5-30 min",
        description: "Diamonds delivered directly to your Free Fire player ID.",
        packages: [
          pkg("ff-25", "25 Diamonds", 25, 0.55),
          pkg("ff-50", "50 Diamonds", 50, 0.99),
          pkg("ff-115", "115 Diamonds", 115, 2.19),
          pkg("ff-240", "240 Diamonds", 240, 4.49),
          pkg("ff-610", "610 Diamonds", 610, 10.99, true, "+60 bonus"),
          pkg("ff-1240", "1240 Diamonds", 1240, 21.99),
        ],
      },
    ],
  },
  {
    id: "mobilelegends",
    name: "Mobile Legends",
    kind: "game",
    color: "#3B82F6",
    unit: "diamonds",
    services: [
      {
        id: "ml-diamonds",
        name: "Mobile Legends — Diamonds Top-Up",
        kindLabel: "Diamonds",
        minQty: 1,
        maxQty: 1,
        stepQty: 1,
        active: true,
        speed: "5-30 min",
        description: "Double-check your User ID + Zone ID before ordering.",
        packages: [
          pkg("ml-86", "86 Diamonds", 86, 1.49),
          pkg("ml-172", "172 Diamonds", 172, 2.98),
          pkg("ml-257", "257 Diamonds", 257, 4.45),
          pkg("ml-706", "706 Diamonds", 706, 11.99, true, "+65 bonus"),
          pkg("ml-1412", "1412 Diamonds", 1412, 23.49),
          pkg("ml-2195", "2195 Diamonds", 2195, 35.99),
        ],
      },
    ],
  },
  {
    id: "valorant",
    name: "Valorant VP",
    kind: "game",
    color: "#FF4655",
    unit: "VP",
    services: [
      {
        id: "val-vp",
        name: "Valorant — Points Top-Up",
        kindLabel: "VP",
        minQty: 1,
        maxQty: 1,
        stepQty: 1,
        active: true,
        speed: "10-60 min",
        description: "Radianite & VP loaded via Riot ID (name#tag).",
        packages: [
          pkg("val-475", "475 VP", 475, 4.99),
          pkg("val-1000", "1000 VP", 1000, 9.99),
          pkg("val-2050", "2050 VP", 2050, 19.99),
          pkg("val-3650", "3650 VP", 3650, 34.99),
          pkg("val-5350", "5350 VP", 5350, 49.99),
        ],
      },
    ],
  },
  {
    id: "roblox",
    name: "Roblox Robux",
    kind: "game",
    color: "#E2231A",
    unit: "Robux",
    services: [
      {
        id: "rb-robux",
        name: "Roblox — Robux Top-Up",
        kindLabel: "Robux",
        minQty: 1,
        maxQty: 1,
        stepQty: 1,
        active: true,
        speed: "10-60 min",
        description: "Robux delivered via gamepass — username required.",
        packages: [
          pkg("rb-80", "80 Robux", 80, 1.19),
          pkg("rb-400", "400 Robux", 400, 5.49),
          pkg("rb-800", "800 Robux", 800, 10.49),
          pkg("rb-1700", "1700 Robux", 1700, 21.99, true),
          pkg("rb-4500", "4500 Robux", 4500, 56.99),
        ],
      },
    ],
  },
];

export const DEFAULT_SETTINGS: Settings = {
  siteName: "EzfaNep",
  tagline: "SMM & Game Top-Up Superstore",
  exchangeRate: DEFAULT_EXCHANGE_RATE,
  payments: {
    crypto: {
      enabled: true,
      wallets: [
        {
          id: "usdt-trc20",
          network: "USDT (TRC-20)",
          address: "TQn9Y2khEsLJW1ChVWFMSMeRDow5oRE2xK",
        },
        {
          id: "btc",
          network: "Bitcoin (BTC)",
          address: "bc1qexamplewalletaddressupdatexyza0c9",
        },
      ],
      instructions:
        "Send the exact amount, then paste your transaction hash (TxID) below. 1 confirmation is enough.",
    },
    esewa: {
      enabled: true,
      accountName: "EzfaNep Store",
      accountNumber: "9801234567",
      qrUrl: "",
      instructions:
        "Open eSewa app → Send Money → enter the eSewa number above → pay the exact NPR amount → submit the transaction reference (e.g. 000AB1C).",
    },
    khalti: {
      enabled: true,
      accountName: "EzfaNep Store",
      accountNumber: "9812345678",
      qrUrl: "",
      instructions:
        "Open Khalti app → Send Payment → enter the Khalti number above → pay the exact NPR amount → submit the transaction ID.",
    },
    bank: {
      enabled: true,
      accountName: "EzfaNep Traders Pvt. Ltd.",
      accountNumber: "0123 4567 8901 (NIC Asia Bank)",
      qrUrl: "",
      instructions:
        "Bank transfer accepted from all Nepali banks. Use your order ID as the transfer remark and upload the voucher screenshot.",
    },
  },
  chatbot: {
    enabled: true,
    botName: "Ezfa AI",
    welcome:
      "Namaste! I'm Ezfa AI. Ask me about prices, delivery time, payments or track your order (send your ORD-XXXXXX id).",
    systemPrompt:
      "You are Ezfa AI, the friendly support assistant for EzfaNep — an SMM & game top-up store for Nepal. Answer in the user's language (English/Nepali/Hindi). Be short, helpful and factual. Use the store context provided to answer pricing, payment and order questions.",
    faqs: [
      {
        id: "faq-1",
        q: "How long does delivery take?",
        a: "Most social media orders start within 0-1 hour. Game top-ups (UC, Diamonds, VP) are delivered in 5-30 minutes after payment verification.",
      },
      {
        id: "faq-2",
        q: "Which payment methods do you accept?",
        a: "eSewa, Khalti, Bank transfer (Nepal) and Crypto (USDT TRC-20 / BTC). All NPR prices use the live exchange rate from the admin panel.",
      },
      {
        id: "faq-3",
        q: "Is there a refund policy?",
        a: "Yes — if an order is not delivered or is wrongly delivered, you get a full refill or refund within 30 days. Open a support ticket via Telegram.",
      },
      {
        id: "faq-4",
        q: "Do you need my account password?",
        a: "Never. We only need your public username / profile link / game UID. Never share your password with anyone.",
      },
    ],
    quickActions: [
      { id: "qa-1", label: "View pricing", message: "What are your prices?" },
      { id: "qa-2", label: "Track my order", message: "Track my order" },
      { id: "qa-3", label: "Payment help", message: "How can I pay?" },
      { id: "qa-4", label: "Talk to human", message: "I want to talk to a human agent" },
    ],
    apiEndpoint: "",
    apiKey: "",
    model: "gpt-4o-mini",
  },
  social: {
    telegram: "https://t.me/ezfanep_support",
    whatsapp: "https://wa.me/9779812345678",
    email: "support@ezfanep.com",
    instagram: "https://instagram.com/ezfanep",
    facebook: "",
    youtube: "",
  },
  adminUserHash: DEFAULT_ADMIN_USER_HASH,
  adminPassHash: DEFAULT_ADMIN_PASS_HASH,
  supportHours: "24/7 live support",
  updatedAt: 0,
};
