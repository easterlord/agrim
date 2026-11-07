"use client";

/* ============================================================
 * CipherSMM — local order mirror.
 * Orders created on this device are stored locally too, so users
 * always see their orders even if the cloud write is queued
 * (offline mode) or the DB rules reject guest writes.
 * ============================================================ */

import type { Order } from "./types";

const LS_MY = "csmm:myorders";

export function readLocalOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LS_MY);
    const arr = raw ? (JSON.parse(raw) as Order[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addLocalOrder(order: Order) {
  try {
    const arr = readLocalOrders().filter((o) => o.id !== order.id);
    arr.unshift(order);
    localStorage.setItem(LS_MY, JSON.stringify(arr.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function patchLocalOrder(id: string, patch: Partial<Order>) {
  try {
    const arr = readLocalOrders();
    const idx = arr.findIndex((o) => o.id === id);
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...patch };
      localStorage.setItem(LS_MY, JSON.stringify(arr));
    }
  } catch {
    /* ignore */
  }
}

export function clearLocalOrders() {
  try {
    localStorage.removeItem(LS_MY);
  } catch {
    /* ignore */
  }
}
