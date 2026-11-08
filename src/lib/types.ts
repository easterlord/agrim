/* ============================================================
 * EzFame — Core domain types
 * Shared across the data layer, stores, views and admin panel.
 * ============================================================ */

export type Lang = "en" | "ne" | "hi";
export type Currency = "USD" | "NPR";
export type ThemeMode = "dark" | "light";
export type PlatformKind = "social" | "game";

export type PlatformId =
  | "instagram"
  | "youtube"
  | "facebook"
  | "tiktok"
  | "telegram"
  | "twitter"
  | "clubhouse"
  | "linkedin"
  | "googleplus"
  | "likee"
  | "spotify"
  | "pinterest"
  | "pubg"
  | "freefire"
  | "mobilelegends"
  | "valorant"
  | "roblox";

/* ---------------- Catalog ---------------- */

export interface ServicePackage {
  id: string;
  label: string;
  /** amount of in-game currency / quantity included */
  qty?: number;
  priceUSD: number;
  hot?: boolean;
  bonus?: string;
}

export interface ServiceType {
  id: string;
  /** display name (English — auto-translated for ne/hi) */
  name: string;
  /** e.g. followers / likes / views / comments / members / plays */
  kindLabel?: string;
  /** USD price per 1000 units — quantity based services */
  pricePerKUSD?: number;
  minQty?: number;
  maxQty?: number;
  stepQty?: number;
  /** fixed packages — game top-ups */
  packages?: ServicePackage[];
  /** e.g. "0-1 h" delivery window */
  speed?: string;
  /** e.g. "30 days refill" */
  warranty?: string;
  description?: string;
  active: boolean;
}

export interface Platform {
  id: PlatformId;
  name: string;
  kind: PlatformKind;
  /** brand accent color (hex) used for icon glow / pills */
  color: string;
  /** short unit name for quantity based services */
  unit: string;
  services: ServiceType[];
}

/* ---------------- Orders ---------------- */

export interface OrderItem {
  platformId: string;
  platformName: string;
  serviceId: string;
  serviceName: string;
  packageName?: string;
  quantity?: number;
  unit?: string;
  link?: string;
  priceUSD: number;
  priceNPR: number;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

export type PaymentMethod = "crypto" | "esewa" | "khalti" | "bank";

export interface OrderPayment {
  method: PaymentMethod;
  /** crypto network name, e.g. "USDT (TRC-20)" */
  network?: string;
  txId?: string;
  receiptUrl?: string;
  submittedAt?: number;
}

export interface Order {
  id: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  guest: boolean;
  /** telegram / whatsapp / phone contact for delivery */
  contact?: string;
  items: OrderItem[];
  totalUSD: number;
  totalNPR: number;
  currencyUsed: Currency;
  payment: OrderPayment;
  status: OrderStatus;
  adminNote?: string;
  /** user accepted the social-media drop disclaimer at checkout */
  ackDrops?: boolean;
}

/* ---------------- Admin activity logs ---------------- */

export interface LogEntry {
  id: string;
  ts: number;
  /** who performed the action (master username or admin user name) */
  actor: string;
  /** short machine tag, e.g. "order.verify" */
  action: string;
  /** human-readable detail */
  detail: string;
}

/* ---------------- Settings ---------------- */

export interface CryptoWallet {
  id: string;
  network: string;
  address: string;
}

export interface LocalPaymentChannel {
  enabled: boolean;
  accountName?: string;
  accountNumber?: string;
  /** remote image url OR data-url uploaded from admin panel */
  qrUrl?: string;
  instructions?: string;
}

export interface PaymentSettings {
  crypto: {
    enabled: boolean;
    wallets: CryptoWallet[];
    instructions?: string;
  };
  esewa: LocalPaymentChannel;
  khalti: LocalPaymentChannel;
  bank: LocalPaymentChannel;
}

export interface FaqEntry {
  id: string;
  q: string;
  a: string;
}

export interface QuickAction {
  id: string;
  label: string;
  /** message sent to the bot when tapped */
  message: string;
}

export interface ChatbotSettings {
  enabled: boolean;
  botName: string;
  welcome: string;
  /** system instructions for the AI assistant */
  systemPrompt: string;
  faqs: FaqEntry[];
  quickActions: QuickAction[];
  /** optional OpenAI-compatible endpoint (OpenAI, OpenRouter, etc.) */
  apiEndpoint?: string;
  apiKey?: string;
  model?: string;
}

export interface SocialLinks {
  telegram?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
}

export interface Settings {
  siteName: string;
  tagline: string;
  /** NPR per 1 USD */
  exchangeRate: number;
  payments: PaymentSettings;
  chatbot: ChatbotSettings;
  social: SocialLinks;
  /** sha256 hex of the admin username (default: ramesh) — changeable in admin panel */
  adminUserHash: string;
  /** sha256 hex of the admin password (default: agrim) — changeable in admin panel */
  adminPassHash: string;
  supportHours?: string;
  updatedAt?: number;
}

/* ---------------- Users / Auth ---------------- */

export type AuthProviderId =
  | "google"
  | "apple"
  | "password"
  | "guest"
  | "local";

/** Account lifecycle — new signups start as "pending" until an admin approves. */
export type UserStatus = "pending" | "active" | "suspended";

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  provider: AuthProviderId;
  role: "user" | "admin";
  /** missing on legacy records — treated as "active" (grandfathered) */
  status?: UserStatus;
  createdAt: number;
  lastLoginAt: number;
  suspendedAt?: number;
}

/* ---------------- Firebase config ---------------- */

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

/* ---------------- Realtime sync status ---------------- */

export type SyncStatus = "connecting" | "online" | "offline" | "local";

export interface DataSnapshot<T> {
  data: T;
  source: "remote" | "cache" | "default";
}
