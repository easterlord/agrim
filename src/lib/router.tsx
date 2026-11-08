"use client";

/* ============================================================
 * EzFame — tiny hash-based SPA router.
 * Hash routing makes the whole app 100% compatible with GitHub
 * Pages (no server rewrites needed) while behaving like normal
 * client-side navigation.
 * Also accepts legacy entry points: "/original" as a real path
 * or "?p=/original" and maps them onto the hash route.
 * ============================================================ */

import { useCallback, useEffect, useState } from "react";

export interface RouteState {
  path: string;
  query: Record<string, string>;
}

const KNOWN_PATHS = [
  "original",
  "checkout",
  "orders",
  "track",
  "account",
  "login",
  "shop",
];

function parseHash(hash: string): RouteState {
  let h = hash.replace(/^#\/?/, "");
  if (h.startsWith("/")) h = h.slice(1);
  const [rawPath, rawQuery] = h.split("?");
  const path = (rawPath || "").replace(/\/+$/, "").toLowerCase();
  const query: Record<string, string> = {};
  if (rawQuery) {
    try {
      const sp = new URLSearchParams(rawQuery);
      sp.forEach((v, k) => (query[k] = v));
    } catch {
      /* ignore malformed query */
    }
  }
  return { path, query };
}

function readLocation(): RouteState {
  if (typeof window === "undefined") return { path: "", query: {} };

  // 1) plain hash route:  #/original
  const fromHash = parseHash(window.location.hash);
  if (fromHash.path) return fromHash;

  // 2) query param style:  ?p=/original  (GitHub Pages 404 fallback)
  try {
    const sp = new URLSearchParams(window.location.search);
    const p = sp.get("p");
    if (p) return parseHash(`#/${p.replace(/^\/+/, "")}`);
  } catch {
    /* ignore */
  }

  // 3) real path (e.g. user typed /original — GH Pages 404 redirect lands here)
  const seg = window.location.pathname.replace(/^.*\//, "").replace(/\/+$/, "").toLowerCase();
  if (seg && KNOWN_PATHS.includes(seg)) return { path: seg, query: {} };

  return { path: "", query: {} };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (typeof window === "undefined") return;
  const target = to.startsWith("/") ? to : `/${to}`;
  const hash = `#${target}`;
  try {
    if (opts.replace) {
      window.history.replaceState(null, "", hash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = hash;
    }
  } catch {
    window.location.hash = hash;
  }
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

export function useHashRoute(): RouteState {
  const [route, setRoute] = useState<RouteState>(() => readLocation());

  useEffect(() => {
    const update = () => setRoute(readLocation());
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    // pick up "?p=" / real-path entry points once mounted
    update();
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);

  return route;
}

export function useNavigate() {
  return useCallback((to: string, opts?: { replace?: boolean }) => navigate(to, opts), []);
}

export function HashLink({
  to,
  children,
  className,
  onClick,
  ariaLabel,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <a
      href={`#${to.startsWith("/") ? to : `/${to}`}`}
      className={className}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
