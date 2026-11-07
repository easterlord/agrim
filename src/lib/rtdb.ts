"use client";

/* ============================================================
 * EzfaNep — resilient Firebase Realtime Database layer.
 *
 * Strategy (zero-crash guarantee):
 *   1. Firebase JS SDK  (true realtime WebSocket) — used when a
 *      databaseURL is available (works even without apiKey for
 *      open-rule databases).
 *   2. REST + SSE stream — direct endpoint fallback, no SDK.
 *   3. Polling (10s) — if streaming is unavailable.
 *   4. localStorage cache + write queue — offline mode. Every
 *      write is applied locally first and replayed on reconnect.
 *
 * No function in this module ever throws.
 * ============================================================ */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  get as dbGet,
  set as dbSet,
  update as dbUpdate,
  remove as dbRemove,
  type Database,
} from "firebase/database";
import { DEFAULT_CATALOG, DEFAULT_DB_URL, DEFAULT_SETTINGS } from "./defaults";
import { sanitize, deepMerge, genId } from "./utils";
import type { FirebaseClientConfig, Platform, Settings, SyncStatus } from "./types";

/* ---------------- config resolution ---------------- */

const LS_CONFIG = "ezfa:fbconfig";
const LS_CACHE = "ezfa:cache:v1";
const LS_QUEUE = "ezfa:wq:v1";

export function getFirebaseConfig(): FirebaseClientConfig {
  const fallback: FirebaseClientConfig = {
    apiKey: "",
    authDomain: "",
    databaseURL: DEFAULT_DB_URL,
    projectId: "cipher-dump",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  };

  // 1) admin-entered runtime override
  try {
    const raw = localStorage.getItem(LS_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FirebaseClientConfig>;
      return { ...fallback, ...parsed, databaseURL: parsed.databaseURL || fallback.databaseURL };
    }
  } catch {
    /* ignore */
  }

  // 2) build-time env vars
  const env = process.env;
  const cfg: FirebaseClientConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    databaseURL:
      env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
      env.NEXT_PUBLIC_FIREBASE_DB_URL ||
      fallback.databaseURL,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || fallback.projectId,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
  return cfg;
}

export function saveFirebaseConfigOverride(cfg: Partial<FirebaseClientConfig> | null) {
  try {
    if (!cfg) localStorage.removeItem(LS_CONFIG);
    else localStorage.setItem(LS_CONFIG, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

export function firebaseAuthConfigured(): boolean {
  try {
    const cfg = getFirebaseConfig();
    if (cfg.apiKey && cfg.authDomain && cfg.appId) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/* ---------------- status emitter ---------------- */

type StatusListener = (s: SyncStatus) => void;
const statusListeners = new Set<StatusListener>();
let currentStatus: SyncStatus = "connecting";

export function onSyncStatus(cb: StatusListener): () => void {
  statusListeners.add(cb);
  cb(currentStatus);
  return () => statusListeners.delete(cb);
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

function setStatus(s: SyncStatus) {
  if (currentStatus === s) return;
  currentStatus = s;
  statusListeners.forEach((cb) => {
    try {
      cb(s);
    } catch {
      /* ignore */
    }
  });
}

/* ---------------- local cache & write queue ---------------- */

type CacheMap = Record<string, unknown>;
let cache: CacheMap = {};
let cacheLoaded = false;

function loadCache() {
  if (cacheLoaded || typeof window === "undefined") return;
  cacheLoaded = true;
  try {
    const raw = localStorage.getItem(LS_CACHE);
    if (raw) cache = JSON.parse(raw) as CacheMap;
  } catch {
    cache = {};
  }
}

function persistCache() {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify(cache));
  } catch {
    /* quota — ignore */
  }
}

function cacheSet(path: string, value: unknown) {
  loadCache();
  cache[path] = value;
  persistCache();
}

function cacheGet<T>(path: string): T | null {
  loadCache();
  return (cache[path] as T) ?? null;
}

interface QueuedOp {
  id: string;
  path: string;
  mode: "set" | "update" | "remove";
  value?: unknown;
  ts: number;
}

let queue: QueuedOp[] = [];

function loadQueue() {
  try {
    const raw = localStorage.getItem(LS_QUEUE);
    if (raw) queue = JSON.parse(raw) as QueuedOp[];
  } catch {
    queue = [];
  }
}

function persistQueue() {
  try {
    localStorage.setItem(LS_QUEUE, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

function enqueue(op: Omit<QueuedOp, "id" | "ts">) {
  loadQueue();
  queue.push({ ...op, id: genId("op"), ts: Date.now() });
  persistQueue();
}

/* ---------------- SDK init ---------------- */

let app: FirebaseApp | null = null;
let database: Database | null = null;
let sdkFailed = false;

function initSdk(): Database | null {
  if (database || sdkFailed) return database;
  try {
    const cfg = getFirebaseConfig();
    const existing = getApps().find((a) => a.name === "ezfanep");
    app = existing ?? initializeApp({ databaseURL: cfg.databaseURL }, "ezfanep");
    database = getDatabase(app);
  } catch {
    sdkFailed = true;
    database = null;
  }
  return database;
}

/* ---------------- REST helpers ---------------- */

function restRoot(): string {
  return getFirebaseConfig().databaseURL.replace(/\/+$/, "");
}

function withTimeout(ms: number): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

async function restGet<T>(path: string): Promise<T | null> {
  const { signal, done } = withTimeout(7000);
  try {
    const res = await fetch(`${restRoot()}/${path}.json`, { signal, cache: "no-store" });
    if (!res.ok) throw new Error(`rest-${res.status}`);
    const json = (await res.json()) as T;
    return json;
  } finally {
    done();
  }
}

async function restWrite(
  path: string,
  mode: "set" | "update" | "remove",
  value?: unknown,
): Promise<boolean> {
  const { signal, done } = withTimeout(7000);
  try {
    let res: Response;
    if (mode === "remove") {
      res = await fetch(`${restRoot()}/${path}.json`, { method: "DELETE", signal });
    } else if (mode === "set") {
      res = await fetch(`${restRoot()}/${path}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value ?? null),
        signal,
      });
    } else {
      res = await fetch(`${restRoot()}/${path}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value ?? {}),
        signal,
      });
    }
    if (!res.ok) throw new Error(`rest-${res.status}`);
    return true;
  } finally {
    done();
  }
}

/* ---------------- object-path helpers (for SSE patches) ---------------- */

function setAlong(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split("/").filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (last) cur[last] = value;
}

function deleteAlong(obj: Record<string, unknown>, path: string) {
  const parts = path.split("/").filter(Boolean);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== "object") return;
    cur = cur[k] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1];
  if (last) delete cur[last];
}

/* ---------------- SSE stream (REST realtime) ---------------- */

function startSSE(
  path: string,
  onNode: (node: unknown) => void,
  onFail: () => void,
): () => void {
  const ctrl = new AbortController();
  let closed = false;

  (async () => {
    try {
      const res = await fetch(`${restRoot()}/${path}.json`, {
        headers: { Accept: "text/event-stream" },
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok || !res.body) throw new Error("sse-status");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let eventName = "";
      let node: unknown = cacheGet<unknown>(path);

      const apply = (type: string, data: Record<string, unknown>) => {
        const rel = String(data.path ?? "/").replace(/^\/+/, "/");
        const val = data.data;
        if (type === "put") {
          if (rel === "/" || rel === "") node = val;
          else if (node && typeof node === "object" && !Array.isArray(node)) {
            if (val === null || val === undefined) deleteAlong(node as Record<string, unknown>, rel);
            else setAlong(node as Record<string, unknown>, rel, val);
          } else if (val !== null && val !== undefined) {
            node = {};
            setAlong(node as Record<string, unknown>, rel, val);
          }
          onNode(node);
        } else if (type === "patch") {
          if (
            val &&
            typeof val === "object" &&
            node &&
            typeof node === "object" &&
            !Array.isArray(node)
          ) {
            const base = rel === "/" ? "" : rel;
            for (const [k, v] of Object.entries(val)) {
              setAlong(node as Record<string, unknown>, base ? `${base}/${k}` : k, v);
            }
            onNode(node);
          }
        } else if (type === "cancel") {
          throw new Error("sse-cancelled");
        }
      };

      while (!closed) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).replace(/\r$/, "");
          buf = buf.slice(nl + 1);
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:") && eventName) {
            const dataStr = line.slice(5).trim();
            if (dataStr) {
              try {
                apply(eventName, JSON.parse(dataStr) as Record<string, unknown>);
              } catch {
                /* malformed event — skip */
              }
            }
            eventName = "";
          }
        }
      }
      throw new Error("sse-ended");
    } catch {
      if (!closed) onFail();
    }
  })();

  return () => {
    closed = true;
    try {
      ctrl.abort();
    } catch {
      /* ignore */
    }
  };
}

/* ---------------- polling fallback ---------------- */

function startPolling<T>(path: string, cb: (v: T | null) => void): () => void {
  const t = setInterval(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    const v = await restGet<T>(path).catch(() => null);
    if (v !== null && v !== undefined) {
      setStatus("online");
      cacheSet(path, v);
      cb(v);
    }
  }, 10000);
  return () => clearInterval(t);
}

/* ---------------- public API ---------------- */

export interface Unsubscribe {
  (): void;
}

/**
 * Live-subscribe to a node. Emits immediately from cache, then from
 * the best available realtime source. Never throws.
 */
export function subscribe<T>(
  path: string,
  cb: (value: T | null, source: "cache" | "remote") => void,
): Unsubscribe {
  loadCache();
  let lastJson = "";
  const emit = (v: T | null, source: "cache" | "remote") => {
    const json = JSON.stringify(v ?? null);
    if (json === lastJson && source === "remote") return;
    lastJson = json;
    try {
      cb(v, source);
    } catch {
      /* listener error — never propagate */
    }
  };

  // 1) instant cache echo
  emit(cacheGet<T>(path), "cache");

  const teardown: Array<() => void> = [];
  let stopped = false;

  const applyRemote = (v: T | null) => {
    setStatus("online");
    if (v !== null && v !== undefined) cacheSet(path, v);
    emit(v, "remote");
  };

  const trySdk = () => {
    const db = initSdk();
    if (!db || stopped) return false;
    try {
      let unsub: () => void = () => undefined;
      unsub = onValue(
        ref(db, path),
        (snap) => applyRemote((snap.val() as T) ?? null),
        () => {
          try {
            unsub();
          } catch {
            /* ignore */
          }
          tryRest();
        },
      );
      teardown.push(unsub);
      return true;
    } catch {
      return false;
    }
  };

  const tryRest = () => {
    if (stopped) return;
    void (async () => {
      const v = await restGet<T>(path).catch(() => undefined);
      if (v === undefined) {
        // network failure → offline mode + retry with polling
        setStatus("offline");
        teardown.push(startPolling(path, cb as (v: unknown) => void));
        return;
      }
      applyRemote(v);
      teardown.push(
        startSSE(
          path,
          (node) => applyRemote(node as T),
          () => {
            if (!stopped) teardown.push(startPolling(path, cb as (v: unknown) => void));
          },
        ),
      );
    })();
  };

  if (!trySdk()) tryRest();

  return () => {
    stopped = true;
    teardown.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
  };
}

/** One-shot read with remote-first, cache-fallback semantics. */
export async function get<T>(path: string): Promise<T | null> {
  const db = initSdk();
  if (db) {
    try {
      const snap = await dbGet(ref(db, path));
      const v = (snap.val() as T) ?? null;
      if (v !== null) cacheSet(path, v);
      setStatus("online");
      return v;
    } catch {
      /* fall through to REST */
    }
  }
  try {
    const v = await restGet<T>(path);
    if (v !== null && v !== undefined) {
      cacheSet(path, v);
      setStatus("online");
      return v;
    }
    return null;
  } catch {
    setStatus("offline");
    return cacheGet<T>(path);
  }
}

/** Write-through set: applies locally, then syncs remotely (queued on failure). */
export async function set(path: string, value: unknown): Promise<boolean> {
  const clean = sanitize(value);
  cacheSet(path, clean);
  const db = initSdk();
  if (db) {
    try {
      await dbSet(ref(db, path), clean);
      setStatus("online");
      void flushQueue();
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    const ok = await restWrite(path, "set", clean);
    if (ok) {
      setStatus("online");
      void flushQueue();
      return true;
    }
  } catch {
    /* fall through */
  }
  enqueue({ path, mode: "set", value: clean });
  setStatus((getSyncStatus() === "online" ? "online" : "offline") as SyncStatus);
  return false;
}

/** Write-through update (partial merge). */
export async function update(path: string, value: Record<string, unknown>): Promise<boolean> {
  const clean = sanitize(value) as Record<string, unknown>;
  const merged = { ...((cacheGet<Record<string, unknown>>(path) ?? {}) as object), ...clean };
  cacheSet(path, merged);
  const db = initSdk();
  if (db) {
    try {
      await dbUpdate(ref(db, path), clean);
      setStatus("online");
      void flushQueue();
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    const ok = await restWrite(path, "update", clean);
    if (ok) {
      setStatus("online");
      void flushQueue();
      return true;
    }
  } catch {
    /* fall through */
  }
  enqueue({ path, mode: "update", value: clean });
  return false;
}

export async function remove(path: string): Promise<boolean> {
  cacheSet(path, null);
  const db = initSdk();
  if (db) {
    try {
      await dbRemove(ref(db, path));
      void flushQueue();
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    const ok = await restWrite(path, "remove");
    if (ok) return true;
  } catch {
    /* fall through */
  }
  enqueue({ path, mode: "remove" });
  return false;
}

/** Replay queued offline writes (oldest first). */
export async function flushQueue(): Promise<number> {
  loadQueue();
  if (!queue.length) return 0;
  const remaining: QueuedOp[] = [];
  let flushed = 0;
  for (const op of queue) {
    try {
      const ok = await restWrite(op.path, op.mode, op.value);
      if (ok) flushed++;
      else remaining.push(op);
    } catch {
      remaining.push(op);
    }
  }
  queue = remaining;
  persistQueue();
  return flushed;
}

/* ---------------- seeding & maintenance ---------------- */

let seeding: Promise<void> | null = null;

/** Ensure remote nodes exist; falls back silently to local defaults. */
export function ensureSeed(): Promise<void> {
  if (seeding) return seeding;
  seeding = (async () => {
    try {
      const [catalog, settings] = await Promise.all([
        get<unknown>("csmm/catalog"),
        get<unknown>("csmm/settings"),
      ]);
      if (!catalog) {
        await set("csmm/catalog", DEFAULT_CATALOG).catch(() => false);
      }
      if (!settings) {
        await set("csmm/settings", { ...DEFAULT_SETTINGS, updatedAt: Date.now() }).catch(() => false);
      }
    } catch {
      /* offline — local defaults still work */
    }
  })();
  return seeding;
}

export function resetLocalData() {
  try {
    localStorage.removeItem(LS_CACHE);
    localStorage.removeItem(LS_QUEUE);
  } catch {
    /* ignore */
  }
  cache = {};
  queue = [];
  cacheLoaded = false;
}

export function exportLocalData(): string {
  loadCache();
  loadQueue();
  return JSON.stringify({ cache, queue, exportedAt: new Date().toISOString() }, null, 2);
}

/** merged settings: remote over defaults (forward-compatible) */
export function mergeSettings(remote: Settings | null): Settings {
  if (!remote) return { ...DEFAULT_SETTINGS };
  return deepMerge({ ...DEFAULT_SETTINGS }, remote);
}

/** merged catalog: remote platforms over defaults (keeps new admin fields) */
export function mergeCatalog(remote: unknown): Platform[] {
  if (!remote) return DEFAULT_CATALOG;
  let list: Platform[];
  if (Array.isArray(remote)) {
    list = remote as Platform[];
  } else if (typeof remote === "object") {
    // RTDB may return the array as a keyed object map
    list = Object.values(remote as Record<string, Platform>);
  } else {
    return DEFAULT_CATALOG;
  }
  if (!list.length) return DEFAULT_CATALOG;
  return list
    .filter((p) => p && p.id)
    .map((p) => {
      const def = DEFAULT_CATALOG.find((d) => d.id === p.id);
      const merged = deepMerge(def ?? p, p);
      return {
        ...merged,
        services: (merged.services ?? []).filter((s) => s && s.id),
      };
    });
}

/* ---------------- connection listeners ---------------- */

if (typeof window !== "undefined") {
  loadCache();
  loadQueue();
  window.addEventListener("online", () => {
    void flushQueue();
    setStatus("connecting");
    setTimeout(() => void restGet("csmm/settings").then(() => setStatus("online")).catch(() => setStatus("offline")), 1500);
  });
  window.addEventListener("offline", () => setStatus("offline"));
  setInterval(() => void flushQueue(), 30000);
}
