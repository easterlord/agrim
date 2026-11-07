"use client";

/* ============================================================
 * EzfaNep — glass navbar: routing, currency, language, theme
 * ============================================================ */

import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import {
  Check,
  ChevronDown,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Package,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/icons";
import { HashLink, navigate, useHashRoute } from "@/lib/router";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useUI, useSyncStatus } from "@/lib/store";
import { useSettings } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/types";

export function Navbar() {
  const { t, lang, setLang } = useI18n();
  const { currency, setCurrency, theme, toggleTheme } = useUI();
  const { user, signOutUser } = useAuth();
  const { settings } = useSettings();
  const sync = useSyncStatus();
  const route = useHashRoute();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const links: Array<{ to: string; label: string }> = [
    { to: "/", label: t("nav.home") },
    { to: "/orders", label: t("nav.orders") },
  ];

  const activePath = (to: string) =>
    to === "/" ? route.path === "" : route.path.startsWith(to.replace("/", ""));

  const syncLabel = sync === "online" ? t("sync.online") : sync === "connecting" ? t("sync.connecting") : t("sync.local");

  return (
    <motion.header
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-[70]"
    >
      <div
        className={cn(
          "mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 transition-all duration-500 sm:px-5",
          scrolled && "pt-2",
        )}
      >
        <div
          className={cn(
            "flex w-full items-center gap-2 rounded-2xl px-3 py-2 transition-all duration-500",
            scrolled ? "glass glass-strong" : "border border-transparent",
          )}
        >
          {/* brand */}
          <HashLink to="/" className="flex min-w-0 items-center gap-2.5">
            <Logo size={32} className="shrink-0" />
            <span className="truncate font-[family-name:var(--f-display)] text-base font-bold tracking-wider">
              <span className="text-gradient">{settings.siteName}</span>
            </span>
          </HashLink>

          {/* desktop links */}
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary">
            {links.map((l) => (
              <HashLink
                key={l.to}
                to={l.to}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activePath(l.to) ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {activePath(l.to) ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: "color-mix(in oklab, var(--acc-1) 14%, transparent)",
                      boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--acc-1) 35%, transparent)",
                    }}
                  />
                ) : null}
                <span className="relative z-10">{l.label}</span>
              </HashLink>
            ))}
          </nav>

          <div className="flex-1" />

          {/* sync status */}
          <div
            className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground lg:flex"
            title={syncLabel}
          >
            <span className={cn("dot-live", sync !== "online" && "!bg-amber-400 !shadow-amber-400")} />
            {syncLabel}
          </div>

          {/* currency switcher */}
          <div className="glass flex items-center rounded-full p-0.5" role="group" aria-label="Currency">
            {(["USD", "NPR"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={cn(
                  "relative rounded-full px-2.5 py-1 font-mono text-[11px] font-bold transition-colors",
                  currency === c ? "text-acc-1" : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={currency === c}
              >
                {currency === c ? (
                  <motion.span
                    layoutId="currency-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "color-mix(in oklab, var(--acc-1) 16%, transparent)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                ) : null}
                <span className="relative z-10">{c === "USD" ? "$" : "रु"}</span>
              </button>
            ))}
          </div>

          {/* language dropdown */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen((v) => !v)}
              className="glass flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors hover:text-acc-1"
              aria-label="Change language"
              aria-expanded={langOpen}
            >
              <Globe size={14} />
              <span className="hidden sm:inline">{LANGUAGES.find((l) => l.id === lang)?.label}</span>
              <ChevronDown size={12} className={cn("transition-transform", langOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {langOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="glass glass-strong absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-xl p-1"
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setLang(l.id);
                        setLangOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                        lang === l.id ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                      )}
                    >
                      <span>
                        {l.flag} {l.label}
                      </span>
                      {lang === l.id ? <Check size={14} className="text-acc-1" /> : null}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* theme toggle */}
          <button
            onClick={toggleTheme}
            className="glass relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ y: 14, opacity: 0, rotate: -90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: -14, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.25 }}
                className="flex"
              >
                {theme === "dark" ? <Sun size={15} className="text-amber-300" /> : <Moon size={15} className="text-violet-500" />}
              </motion.span>
            </AnimatePresence>
          </button>

          {/* account */}
          {user ? (
            <div className="relative hidden sm:block">
              <HashLink
                to="/account"
                className="glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:border-acc-1/50"
                aria-label={t("nav.account")}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--acc-1), var(--acc-2))" }}
                >
                  {(user.name || "G").slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-24 truncate text-xs font-semibold">{user.name}</span>
              </HashLink>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="btn-accent hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold sm:flex"
            >
              <LogIn size={13} />
              {t("nav.login")}
            </button>
          )}

          {/* mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="glass flex h-8 w-8 items-center justify-center rounded-full md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-3 mt-1 overflow-hidden rounded-2xl md:hidden"
          >
            <div className="glass glass-strong flex flex-col gap-1 p-3">
              {links.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <HashLink
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                      activePath(l.to) ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                    )}
                  >
                    {l.label}
                  </HashLink>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <HashLink
                  to={user ? "/account" : "/login"}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-muted"
                >
                  {user ? <User size={16} /> : <LogIn size={16} />}
                  {user ? `${t("nav.account")} — ${user.name}` : t("nav.login")}
                </HashLink>
              </motion.div>
              {user ? (
                <button
                  onClick={() => {
                    void signOutUser();
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-red-400 hover:bg-red-500/10"
                >
                  <LogOut size={16} />
                  {t("nav.logout")}
                </button>
              ) : null}
              {user?.role === "admin" ? (
                <HashLink to="/original" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-acc-1 hover:bg-muted">
                  <LayoutDashboard size={16} />
                  {t("nav.admin")}
                </HashLink>
              ) : null}
              <div className="mt-1 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Package size={12} />
                  {syncLabel}
                </span>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
