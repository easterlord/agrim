/* ============================================================
 * EzFame — shared helpers
 * ============================================================ */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Currency, OrderItem, ServicePackage, ServiceType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ---------------- currency & pricing ---------------- */

export function convertUSD(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}

export function fmtUSD(v: number): string {
  if (!isFinite(v)) return "$0.00";
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtNPR(v: number): string {
  if (!isFinite(v)) return "Rs 0";
  return `Rs ${Math.round(v).toLocaleString("en-US")}`;
}

export function fmtMoney(v: number, currency: Currency, rate: number): string {
  return currency === "USD" ? fmtUSD(v) : fmtNPR(convertUSD(v, rate));
}

export interface PriceResult {
  usd: number;
  qty: number;
  valid: boolean;
}

/** Calculate live price for a quantity-based service */
export function calcQtyPrice(service: ServiceType, rawQty: number): PriceResult {
  const min = service.minQty ?? 100;
  const max = service.maxQty ?? 100000;
  const step = service.stepQty ?? 1;
  const qty = Math.min(max, Math.max(min, Math.round(rawQty / step) * step));
  if (!service.pricePerKUSD || qty < min) return { usd: 0, qty, valid: false };
  const usd = Math.round(((qty / 1000) * service.pricePerKUSD + Number.EPSILON) * 100) / 100;
  return { usd, qty, valid: qty >= min };
}

export function findPackage(
  service: ServiceType,
  packageId?: string | null,
): ServicePackage | null {
  if (!service.packages?.length) return null;
  return service.packages.find((p) => p.id === packageId) ?? service.packages[0];
}

/* ---------------- ids ---------------- */

const B36 = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function genOrderId(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += B36[Math.floor(Math.random() * B36.length)];
  }
  return `ORD-${s}`;
}

export function genId(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------------- crypto (WebCrypto) ---------------- */

function subtle(): SubtleCrypto | null {
  try {
    if (typeof crypto !== "undefined" && crypto?.subtle) return crypto.subtle;
  } catch {
    /* ignore */
  }
  return null;
}

/** djb2 fallback for environments without WebCrypto (never used in modern browsers) */
function fallbackHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return `f${h.toString(16).padStart(8, "0")}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const s = subtle();
  if (!s) return fallbackHash(text);
  try {
    const buf = await s.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return fallbackHash(text);
  }
}

export function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  try {
    crypto.getRandomValues(arr);
  } catch {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------------- misc ---------------- */

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function timeAgo(ts: number, lang = "en"): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return lang === "en" ? "just now" : "भर्खरै";
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (lang === "ne" || lang === "hi") {
    if (d > 0) return `${d} दिन अघि`;
    if (h > 0) return `${h} घण्टा अघि`;
    return `${m} मिनेट अघि`;
  }
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

export function fmtDateTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return new Date(ts).toISOString().slice(0, 16).replace("T", " ");
  }
}

/** remove undefined values (Firebase rejects them) */
export function sanitize<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => sanitize(v)).filter((v) => v !== undefined) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = sanitize(v);
    }
    return out as T;
  }
  return value;
}

export function deepMerge<T>(base: T, override: unknown): T {
  if (override === null || override === undefined) return base;
  if (Array.isArray(base) || Array.isArray(override) || typeof base !== "object") {
    return override as T;
  }
  if (typeof override !== "object") return override as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    if (v === null) continue;
    out[k] = k in (base as Record<string, unknown>)
      ? deepMerge((base as Record<string, unknown>)[k], v)
      : v;
  }
  return out as T;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/** read a File and downscale-compress it to a jpeg data-url (max ~640px, ~0.72 q) */
export function fileToCompressedDataUrl(file: File, maxSide = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read-failed"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("decode-failed"));
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("canvas-failed"));
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      reject(e instanceof Error ? e : new Error("file-failed"));
    }
  });
}

export function orderTotal(items: OrderItem[]): { usd: number; npr: number } {
  return {
    usd: items.reduce((s, i) => s + i.priceUSD, 0),
    npr: items.reduce((s, i) => s + i.priceNPR, 0),
  };
}
