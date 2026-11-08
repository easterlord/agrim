"use client";

/* ============================================================
 * EzFame — client state (zustand).
 * Theme, currency & order draft persist across reloads.
 * ============================================================ */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState, useSyncExternalStore } from "react";
import { onSyncStatus } from "./rtdb";
import type { Currency, OrderItem, SyncStatus, ThemeMode } from "./types";

/* ---------------- UI store (theme / currency) ---------------- */

interface UIState {
  theme: ThemeMode;
  currency: Currency;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setCurrency: (c: Currency) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      currency: "USD",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "ezfame:ui", version: 1 },
  ),
);

/** apply theme class to <html> — call once from AppRoot */
export function useThemeEffect() {
  const theme = useUI((s) => s.theme);
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.toggle("dark", theme === "dark");
      root.dataset.theme = theme;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", theme === "dark" ? "#05070f" : "#f2f5fc");
    } catch {
      /* ignore */
    }
  }, [theme]);
}

/* ---------------- order draft ---------------- */

export interface OrderDraft {
  platformId: string | null;
  typeId: string | null;
  quantity: number | null;
  packageId: string | null;
  playerId?: string;
  link?: string;
}

interface DraftState extends OrderDraft {
  setDraft: (d: Partial<OrderDraft>) => void;
  clearDraft: () => void;
  /** built items ready for checkout (1 item) */
  buildItems: () => Omit<OrderItem, "priceUSD" | "priceNPR">[];
}

export const useDraft = create<DraftState>()(
  persist(
    (set, get) => ({
      platformId: null,
      typeId: null,
      quantity: null,
      packageId: null,
      playerId: "",
      link: "",
      setDraft: (d) => set(d),
      clearDraft: () =>
        set({ platformId: null, typeId: null, quantity: null, packageId: null, playerId: "", link: "" }),
      buildItems: () => {
        const { platformId, typeId, quantity, packageId, playerId, link } = get();
        if (!platformId || !typeId) return [];
        return [
          {
            platformId,
            platformName: platformId,
            serviceId: typeId,
            serviceName: typeId,
            packageName: packageId ?? undefined,
            quantity: quantity ?? undefined,
            link: link || undefined,
            ...(playerId ? {} : {}),
          },
        ];
      },
    }),
    { name: "ezfame:draft", version: 1 },
  ),
);

/* ---------------- toasts ---------------- */

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, title, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set({ toasts: [...get().toasts.slice(-3), { id, kind, title, message }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 4200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/* ---------------- chat widget ---------------- */

interface ChatState {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

export const useChat = create<ChatState>((set) => ({
  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),
}));

/* ---------------- sync status bridge ---------------- */

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("connecting");
  useEffect(() => {
    const unsub = onSyncStatus(setStatus);
    return () => {
      unsub();
    };
  }, []);
  return status;
}

/* ---------------- mounted guard (SSR-safe rendering) ---------------- */

export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}
