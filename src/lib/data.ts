"use client";

/* ============================================================
 * EzFame — React data hooks over the resilient RTDB layer.
 * All hooks merge remote values with local defaults so the UI
 * NEVER renders empty/broken state, online or offline.
 * ============================================================ */

import { useEffect, useMemo, useState } from "react";
import {
  ensureSeed,
  mergeCatalog,
  mergeSettings,
  remove,
  set,
  subscribe,
  update,
} from "./rtdb";
import { DEFAULT_CATALOG } from "./defaults";
import type { LogEntry, Order, OrderStatus, Platform, Settings, UserProfile } from "./types";

/* ---------------- settings ---------------- */

export function useSettings(): { settings: Settings; ready: boolean } {
  const [remote, setRemote] = useState<Settings | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void ensureSeed();
    const unsub = subscribe<Settings>("csmm/settings", (v) => {
      setRemote(v);
      setReady(true);
    });
    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const settings = useMemo(() => mergeSettings(remote), [remote]);
  return { settings, ready };
}

export async function saveSettingsPatch(patch: Partial<Settings>): Promise<boolean> {
  const { get } = await import("./rtdb");
  const current = await get<Settings>("csmm/settings");
  const merged = mergeSettings(current);
  return set("csmm/settings", { ...merged, ...patch, updatedAt: Date.now() });
}

/* ---------------- catalog ---------------- */

export function useCatalog(): { platforms: Platform[]; ready: boolean } {
  const [remote, setRemote] = useState<Platform[] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void ensureSeed();
    const unsub = subscribe<Platform[]>("csmm/catalog", (v) => {
      setRemote(v);
      setReady(true);
    });
    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const platforms = useMemo(() => mergeCatalog(remote), [remote]);
  return { platforms, ready };
}

export async function savePlatform(platform: Platform): Promise<boolean> {
  const { get } = await import("./rtdb");
  const remote = await get<Platform[]>("csmm/catalog");
  const list = mergeCatalog(remote);
  const idx = list.findIndex((p) => p.id === platform.id);
  if (idx >= 0) list[idx] = platform;
  else list.push(platform);
  return set("csmm/catalog", list);
}

export async function deleteServiceType(platformId: string, typeId: string): Promise<boolean> {
  const { get } = await import("./rtdb");
  const remote = await get<Platform[]>("csmm/catalog");
  const list = mergeCatalog(remote);
  const platform = list.find((p) => p.id === platformId);
  if (!platform) return false;
  platform.services = platform.services.filter((s) => s.id !== typeId);
  return set("csmm/catalog", list);
}

export function findPlatform(platforms: Platform[], id: string): Platform | undefined {
  return platforms.find((p) => p.id === id);
}

export function findService(
  platforms: Platform[],
  platformId: string,
  typeId: string,
): { platform: Platform; service: Platform["services"][number] } | null {
  const platform = platforms.find((p) => p.id === platformId);
  if (!platform) return null;
  const service = platform.services.find((s) => s.id === typeId);
  return service ? { platform, service } : null;
}

/* ---------------- orders ---------------- */

export function useAllOrders(): { orders: Order[]; ready: boolean } {
  const [map, setMap] = useState<Record<string, Order> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = subscribe<Record<string, Order>>("csmm/orders", (v) => {
      setMap(v);
      setReady(true);
    });
    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const orders = useMemo(() => {
    if (!map || typeof map !== "object") return [];
    return Object.entries(map)
      .filter(([, o]) => o && o.id)
      .map(([, o]) => ({
        ...o,
        items: Array.isArray(o.items) ? o.items : [],
      }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [map]);

  return { orders, ready };
}

export function useUserOrders(userId: string | null): { orders: Order[]; ready: boolean } {
  const { orders, ready } = useAllOrders();
  const filtered = useMemo(
    () => (userId ? orders.filter((o) => o.userId === userId) : []),
    [orders, userId],
  );
  return { orders: filtered, ready };
}

export async function createOrder(order: Order): Promise<boolean> {
  return set(`csmm/orders/${order.id}`, order);
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<boolean> {
  return update(`csmm/orders/${id}`, { ...patch, updatedAt: Date.now() });
}

export async function setOrderStatus(id: string, status: OrderStatus, adminNote?: string): Promise<boolean> {
  return update(`csmm/orders/${id}`, {
    status,
    ...(adminNote !== undefined ? { adminNote } : {}),
    updatedAt: Date.now(),
  });
}

/* ---------------- users ---------------- */

export function useUsers(): { users: UserProfile[]; ready: boolean } {
  const [map, setMap] = useState<Record<string, UserProfile> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = subscribe<Record<string, UserProfile>>("csmm/users", (v) => {
      setMap(v);
      setReady(true);
    });
    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const users = useMemo(() => {
    if (!map || typeof map !== "object") return [];
    return Object.values(map).filter((u) => u && u.uid);
  }, [map]);

  return { users, ready };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { get } = await import("./rtdb");
  return get<UserProfile>(`csmm/users/${uid}`);
}

/**
 * Upsert a user profile WITHOUT clobbering admin-controlled fields
 * (role, approval status). New records start as "pending"; legacy
 * records without a status are grandfathered as "active".
 * Returns the merged profile as stored in the database.
 */
export async function saveUserProfile(profile: UserProfile): Promise<UserProfile> {
  const existing = await getUserProfile(profile.uid);
  const merged: UserProfile = {
    ...profile,
    ...(existing?.role ? { role: existing.role } : {}),
    status: existing?.status ?? (existing ? "active" : "pending"),
    ...(existing?.suspendedAt ? { suspendedAt: existing.suspendedAt } : {}),
    createdAt: existing?.createdAt ?? profile.createdAt,
  };
  await set(`csmm/users/${profile.uid}`, merged);
  return merged;
}

/** Admin-only: hard-delete a user record. */
export async function deleteUserProfile(uid: string): Promise<boolean> {
  return remove(`csmm/users/${uid}`);
}

/** Admin-only: patch lifecycle/role fields on a user record. */
export async function patchUser(
  uid: string,
  patch: Partial<Pick<UserProfile, "status" | "role" | "suspendedAt">>,
): Promise<boolean> {
  return update(`csmm/users/${uid}`, { ...patch, lastLoginAt: Date.now() } as Record<string, unknown>);
}

/* ---------------- admin activity logs ---------------- */

export function useLogs(): { logs: LogEntry[]; ready: boolean } {
  const [map, setMap] = useState<Record<string, LogEntry> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = subscribe<Record<string, LogEntry>>("csmm/logs", (v) => {
      setMap(v);
      setReady(true);
    });
    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const logs = useMemo(() => {
    if (!map || typeof map !== "object") return [];
    return Object.values(map)
      .filter((l) => l && l.id)
      .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
      .slice(0, 300);
  }, [map]);

  return { logs, ready };
}
