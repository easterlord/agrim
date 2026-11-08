"use client";

/* ============================================================
 * EzFame — resilient Firebase Realtime Database layer.
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
import { DEFAULT_CATALOG, DEFAULT_DB_URL, DEFAULT_FIREBASE_CONFIG, RTDB_URL_CANDIDATES, DEFAULT_SETTINGS } from "./defaults";
import { sanitize, deepMerge, genId, randomHex } from "./utils";
import type { FirebaseClientConfig, LogEntry, Platform, Settings, SyncStatus } from "./types";

/* ---------------- config resolution ---------------- */

const LS_CONFIG = "ezfame:fbconfig";
const LS_CACHE = "ezfame:cache:v1";
const LS_QUEUE = "ezfame:wq:v1";
const LS_DB_URL = "ezfame:rtdburl";

export function getFirebaseConfig(): FirebaseClientConfig {
  // 0) exact project config (strict baseline)
  const base: FirebaseClientConfig = { ...DEFAULT_FIREBASE_CONFIG };

  // 1) admin-entered runtime override (full replace)
  try {
    const raw = localStorage.getItem(LS_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FirebaseClientConfig>;
      return { ...base, ...parsed, databaseURL: parsed.databaseURL || base.databaseURL };
    }
  } catch {
    /* ignore */
  }

  // 2) build-time env vars (optional overrides — secret/push keys always kept)
  const env = process.env;
  return {
    ...base,
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || base.apiKey,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || base.authDomain,
    databaseURL:
      env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
      env.NEXT_PUBLIC_FIREBASE_DB_URL ||
      resolvedDbUrl ||
      base.databaseURL,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || base.projectId,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || base.storageBucket,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || base.messagingSenderId,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || base.appId,
    measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || base.measurementId,
  };
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

/* ---------------- database URL resolution (probe once) ---------------- */

let resolvedDbUrl: string | null = null;
let urlPromise: Promise<string> | null = null;

/** Only endpoints of THIS project are acceptable — never probe cross-project. */
function sameProject(url: string): boolean {
  try {
    return /^(https:\/\/)?[a-z0-9-]*ezfamenp-default-rtdb\.(firebasedatabase\.app|firebaseio\.com)/i.test(
      url.replace(/^https?:\/\//, "https://"),
    );
  } catch {
    return false;
  }
}

async function probeUrl(url: string, timeoutMs = 4000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/.json?shallow=true`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    return res.ok || res.status === 401; // 401 still proves the endpoint exists
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Resolve the reachable RTDB endpoint: admin override → cached probe
 * result → candidate probe (same project only). Never throws; resolves
 * to the exact configured URL even when every probe fails.
 */
export function resolveDatabaseUrl(): Promise<string> {
  if (resolvedDbUrl) return Promise.resolve(resolvedDbUrl);
  if (urlPromise) return urlPromise;

  urlPromise = (async () => {
    // explicit admin override always wins (validated to be this project)
    try {
      const raw = localStorage.getItem(LS_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FirebaseClientConfig>;
        if (parsed.databaseURL && sameProject(parsed.databaseURL)) {
          resolvedDbUrl = parsed.databaseURL;
          return resolvedDbUrl;
        }
      }
    } catch {
      /* ignore */
    }
    if (typeof window === "undefined") {
      resolvedDbUrl = DEFAULT_FIREBASE_CONFIG.databaseURL;
      return resolvedDbUrl;
    }

    // previously probed + cached (must belong to this project)
    try {
      const cached = localStorage.getItem(LS_DB_URL);
      if (cached && sameProject(cached) && (await probeUrl(cached, 3000))) {
        resolvedDbUrl = cached;
        return resolvedDbUrl;
      }
    } catch {
      /* ignore */
    }

    for (const candidate of RTDB_URL_CANDIDATES) {
      if (await probeUrl(candidate)) {
        resolvedDbUrl = candidate;
        try {
          localStorage.setItem(LS_DB_URL, candidate);
        } catch {
          /* ignore */
        }
        return resolvedDbUrl;
      }
    }

    resolvedDbUrl = DEFAULT_DB_URL;
    return resolvedDbUrl;
  })();

  return urlPromise;
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
    const existing = getApps().find((a) => a.name === "ezfame");
    app = existing ?? initializeApp({ databaseURL: cfg.databaseURL }, "ezfame");
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

/**
 * REST path with legacy-database-secret auth. When RTDB rules require
 * authentication, the SDK websocket gets it from the project config;
 * the REST/SSE fallback uses the secret supplied in the console.
 */
function restUrl(path: string): string {
  const clean = path.replace(/^\/+/, "").replace(/\/+$/, "");
  let url = clean ? `${restRoot()}/${clean}.json` : `${restRoot()}/.json`;
  const secret = getFirebaseConfig().databaseSecret;
  if (secret) url += `${url.includes("?") ? "&" : "?"}auth=${encodeURIComponent(secret)}`;
  return url;
}

function withTimeout(ms: number): { signal: AbortSignal; done: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

async function restGet<T>(path: string): Promise<T | null> {
  const { signal, done } = withTimeout(7000);
  try {
    const res = await fetch(restUrl(path), { signal, cache: "no-store" });
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
      res = await fetch(restUrl(path), { method: "DELETE", signal });
    } else if (mode === "set") {
      res = await fetch(restUrl(path), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value ?? null),
        signal,
      });
    } else {
      res = await fetch(restUrl(path), {
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
      const res = await fetch(restUrl(path), {
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
  let started = false;

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

  const start = () => {
    if (started || stopped) return;
    started = true;
    if (!trySdk()) tryRest();
  };

  // wait for the RTDB endpoint probe, then open the realtime stream
  void resolveDatabaseUrl().then(start, start);

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
  await resolveDatabaseUrl();
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
  await resolveDatabaseUrl();
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
  await resolveDatabaseUrl();
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
  await resolveDatabaseUrl();
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
      await resolveDatabaseUrl();
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

/* ---------------- admin activity logs ---------------- */

/** Append an admin action to csmm/logs. Never throws. */
export async function pushLog(action: string, detail: string, actor = "master"): Promise<void> {
  try {
    const entry: LogEntry = {
      id: `${Date.now().toString(36)}-${randomHex(4)}`,
      ts: Date.now(),
      actor,
      action,
      detail,
    };
    await set(`csmm/logs/${entry.id}`, entry);
  } catch {
    /* logging is best-effort */
  }
}

export function resetLocalData() {
  try {
    localStorage.removeItem(LS_CACHE);
    localStorage.removeItem(LS_QUEUE);
    localStorage.removeItem(LS_DB_URL);
  } catch {
    /* ignore */
  }
  cache = {};
  queue = [];
  cacheLoaded = false;
  // re-resolve the RTDB endpoint on next use
  resolvedDbUrl = null;
  urlPromise = null;
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
