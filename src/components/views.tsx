"use client";

/* ============================================================
 * EzfaNep — orders, account & auth views
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  Clock,
  CreditCard,
  Globe,
  HardDriveDownload,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Search,
  Send,
  Sun,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PlatformIcon } from "@/components/icons";
import {
  EmptyState,
  Field,
  GlassCard,
  AccentButton,
  SectionTitle,
  Segmented,
  Spinner,
  StatusBadge,
  TextInput,
} from "@/components/ui-kit";
import { Tx, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useAllOrders, useSettings } from "@/lib/data";
import { useToasts, useUI } from "@/lib/store";
import { useHashRoute, navigate } from "@/lib/router";
import { readLocalOrders, clearLocalOrders } from "@/lib/localOrders";
import { resetLocalData } from "@/lib/rtdb";
import { cn, fmtDateTime, fmtNPR, fmtUSD, timeAgo } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

/* ============================ ORDERS ============================ */

const STATUS_KEY: Record<OrderStatus, string> = {
  pending: "orders.pending",
  processing: "orders.processing",
  completed: "orders.completed",
  rejected: "orders.rejected",
  cancelled: "orders.cancelled",
};

const STATUS_STEP: Record<OrderStatus, number> = {
  pending: 1,
  processing: 2,
  completed: 3,
  rejected: 0,
  cancelled: 0,
};

function OrderCard({ order }: { order: Order }) {
  const { t, lang } = useI18n();
  const step = STATUS_STEP[order.status];
  const item = order.items?.[0];

  return (
    <GlassCard className="p-5" hover>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-extrabold tracking-wider text-acc-1">{order.id}</span>
          <StatusBadge status={order.status} label={t(STATUS_KEY[order.status])} />
        </div>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground" title={fmtDateTime(order.createdAt)}>
          <Clock size={11} />
          {timeAgo(order.createdAt, lang)}
        </span>
      </div>

      {item ? (
        <div className="mt-3 flex items-start gap-3">
          <span className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <PlatformIcon id={item.platformId} size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              <Tx text={item.serviceName} />
            </p>
            <p className="text-xs text-muted-foreground">
              {item.platformName}
              {item.packageName ? ` · ${item.packageName}` : item.quantity ? ` · ${(item.quantity || 0).toLocaleString()} ${item.unit ?? ""}` : ""}
            </p>
            {item.link ? (
              <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{item.link}</p>
            ) : null}
          </div>
          <span className="font-mono text-sm font-bold">
            {order.currencyUsed === "NPR" ? fmtNPR(order.totalNPR) : fmtUSD(order.totalUSD)}
          </span>
        </div>
      ) : null}

      {/* timeline */}
      {order.status !== "rejected" && order.status !== "cancelled" ? (
        <div className="mt-4 flex items-center gap-1.5">
          {[t("orders.pending"), t("orders.processing"), t("orders.completed")].map((label, i) => {
            const idx = i + 1;
            const reached = step >= idx;
            return (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-all duration-500",
                      reached ? "bg-acc-1 shadow-[0_0_8px_var(--acc-1)]" : "bg-muted-foreground/30",
                    )}
                  />
                  <span className={cn("text-[9px] font-bold uppercase tracking-wide", reached ? "text-acc-1" : "text-muted-foreground/60")}>
                    {label}
                  </span>
                </div>
                {idx < 3 ? (
                  <div className={cn("mb-4 h-px flex-1", step > idx ? "bg-acc-1/60" : "bg-border")} />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CreditCard size={12} />
          {t("orders.payment")}: {order.payment.method}
          {order.payment.network ? ` (${order.payment.network})` : ""}
          {order.payment.txId ? ` · ${order.payment.txId.slice(0, 18)}` : ""}
        </span>
        {order.adminNote ? (
          <span className="rounded-md bg-muted px-2 py-0.5">
            {t("orders.adminNote")}: {order.adminNote}
          </span>
        ) : null}
      </div>
    </GlassCard>
  );
}

export function OrdersView() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { orders: dbOrders, ready } = useAllOrders();
  const [lookup, setLookup] = useState("");
  const [lookupResult, setLookupResult] = useState<Order | null | "none">();

  const merged = useMemo(() => {
    const local = readLocalOrders();
    const mine = user ? dbOrders.filter((o) => o.userId === user.uid) : [];
    const map = new Map<string, Order>();
    const dbById = new Map(dbOrders.map((o) => [o.id, o]));
    // local mirror first, but let fresher cloud copies (status updates) win
    for (const o of local) {
      const cloud = dbById.get(o.id);
      map.set(o.id, cloud ? { ...o, ...cloud, items: o.items ?? cloud.items ?? [] } : o);
    }
    for (const o of mine) {
      map.set(o.id, { ...map.get(o.id), ...o, items: o.items ?? [] });
    }
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [dbOrders, user]);

  const doLookup = () => {
    const id = lookup.trim().toUpperCase();
    if (!id) return;
    const found = merged.find((o) => o.id === id) ?? dbOrders.find((o) => o.id === id);
    setLookupResult(found ?? "none");
  };

  return (
    <section className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
      <SectionTitle eyebrow="ORDER TRACKING" title={t("orders.title")} />

      <GlassCard className="mb-6 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLookup()}
              placeholder={`${t("orders.lookup")} — ORD-XXXXXX`}
              className="pl-9 font-mono uppercase"
            />
          </div>
          <AccentButton onClick={doLookup}>{t("orders.lookupBtn")}</AccentButton>
        </div>
        <AnimatePresence>
          {lookupResult ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {lookupResult === "none" ? (
                <p className="pt-3 text-center text-xs font-semibold text-red-400">{t("orders.notFound")} — {lookup.toUpperCase()}</p>
              ) : (
                <div className="pt-4">
                  <OrderCard order={lookupResult} />
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </GlassCard>

      {!ready ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : merged.length === 0 ? (
        <EmptyState
          icon={<History size={26} />}
          title={t("orders.empty")}
          action={<AccentButton onClick={() => navigate("/")}>{t("hero.cta1")}</AccentButton>}
        />
      ) : (
        <div className="space-y-4">
          {merged.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.4 }}
            >
              <OrderCard order={o} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================ ACCOUNT ============================ */

export function AccountView() {
  const { t, lang, setLang } = useI18n();
  const { user, signOutUser } = useAuth();
  const { settings } = useSettings();
  const { theme, setTheme, currency, setCurrency } = useUI();
  const { push } = useToasts();

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl px-4 pb-20 pt-28 sm:pt-32">
        <EmptyState
          icon={<UserIcon size={26} />}
          title={t("nav.login")}
          action={<AccentButton onClick={() => navigate("/login")}>{t("auth.signIn")}</AccentButton>}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
      <SectionTitle eyebrow="PROFILE" title={t("account.title")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-6 sm:col-span-2" hover>
          <div className="flex items-center gap-4">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
              style={{ background: "linear-gradient(135deg, var(--acc-1), var(--acc-2))" }}
            >
              {(user.name || "G").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{user.name}</p>
              {user.email ? <p className="truncate text-sm text-muted-foreground">{user.email}</p> : null}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user.provider === "guest" ? t("account.guest") : `${t("account.provider")}: ${user.provider}`}
                {" · "}
                {t("account.memberSince")} {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            {user.role === "admin" ? (
              <AccentButton size="sm" onClick={() => navigate("/original")}>
                <LayoutDashboard size={14} />
                {t("account.admin")}
              </AccentButton>
            ) : null}
          </div>
        </GlassCard>

        <GlassCard className="space-y-5 p-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("account.theme")}</p>
            <Segmented
              value={theme}
              onChange={(v) => setTheme(v as "dark" | "light")}
              options={[
                { value: "dark", label: <span className="flex items-center gap-1"><Moon size={11} /> {t("theme.dark")}</span> },
                { value: "light", label: <span className="flex items-center gap-1"><Sun size={11} /> {t("theme.light")}</span> },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("account.currency")}</p>
            <Segmented
              value={currency}
              onChange={(v) => setCurrency(v as "USD" | "NPR")}
              options={[
                { value: "USD", label: "USD ($)" },
                { value: "NPR", label: "NPR (रु)" },
              ]}
            />
          </div>
        </GlassCard>

        <GlassCard className="space-y-5 p-6">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Globe size={12} />
              {t("account.language")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(["en", "ne", "hi"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all",
                    lang === l ? "pill-active bg-accent" : "border-border/70 hover:border-acc-1/40",
                  )}
                >
                  {l === "en" ? "English" : l === "ne" ? "नेपाली" : "हिन्दी"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Send size={12} />
              {t("account.support")}
            </p>
            <div className="flex flex-wrap gap-2">
              {settings.social.telegram ? (
                <a href={settings.social.telegram} target="_blank" rel="noreferrer noopener" className="glass glass-hover flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold">
                  <Send size={13} /> Telegram
                </a>
              ) : null}
              {settings.social.whatsapp ? (
                <a href={settings.social.whatsapp} target="_blank" rel="noreferrer noopener" className="glass glass-hover flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold">
                  <MessageCircle size={13} /> WhatsApp
                </a>
              ) : null}
              {settings.social.email ? (
                <a href={`mailto:${settings.social.email}`} className="glass glass-hover flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold">
                  <Mail size={13} /> Email
                </a>
              ) : null}
            </div>
          </div>
        </GlassCard>

        <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-5 sm:col-span-2">
          <button
            onClick={() => {
              resetLocalData();
              push("success", t("account.clearCache"), "✓");
            }}
            className="flex items-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <HardDriveDownload size={14} />
            {t("account.clearCache")}
          </button>
          <button
            onClick={() => {
              clearLocalOrders();
              push("success", t("account.clearCache"), "orders");
            }}
            className="flex items-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <Trash2 size={14} />
            {t("orders.title")}
          </button>
          <AccentButton
            variant="danger"
            onClick={() => {
              void signOutUser();
              navigate("/");
            }}
          >
            <LogOut size={14} />
            {t("nav.logout")}
          </AccentButton>
        </GlassCard>
      </div>
    </section>
  );
}

/* ============================ LOGIN ============================ */

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

export function LoginView() {
  const { t } = useI18n();
  const { user, mode, signInGoogle, signInApple, signInEmail, signUpEmail, signInGuest } = useAuth();
  const { push } = useToasts();

  const [tab, setTab] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/account");
  }, [user]);

  const errText = (code?: string): string => {
    switch (code) {
      case "auth/invalid-email":
        return t("auth.errEmail");
      case "auth/weak-password":
        return t("auth.errPass");
      case "auth/user-not-found":
        return t("auth.errUser");
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return t("auth.errWrong");
      case "auth/email-already-in-use":
        return t("auth.errExists");
      default:
        return t("auth.errDefault");
    }
  };

  const run = async (fn: () => Promise<{ ok: boolean; code?: string }>) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) push("error", errText(res.code), res.code);
  };

  return (
    <section className="mx-auto max-w-4xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
      <div className="grid overflow-hidden rounded-3xl lg:grid-cols-2">
        {/* brand side */}
        <div
          className="relative hidden flex-col justify-between p-8 lg:flex"
          style={{
            background:
              "linear-gradient(150deg, color-mix(in oklab, var(--acc-1) 22%, transparent), color-mix(in oklab, var(--acc-2) 26%, transparent) 55%, color-mix(in oklab, var(--acc-3) 22%, transparent))",
          }}
        >
          <div>
            <p className="font-[family-name:var(--f-display)] text-2xl font-extrabold text-gradient">EzfaNep</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{t("auth.sub")}</p>
          </div>
          <ul className="space-y-3 text-sm">
            {[t("hero.stat2"), t("hero.stat4"), t("hero.stat3")].map((line, i) => (
              <motion.li
                key={line}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.12 }}
                className="flex items-center gap-2 font-semibold"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-acc-1" />
                {line}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* form side */}
        <GlassCard strong className="rounded-none p-7 sm:p-9" >
          <h1 className="text-2xl font-extrabold">{t("auth.welcome")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.sub")}</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={() => void run(signInGoogle)}
              disabled={busy}
              className="glass flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:border-acc-1/40"
            >
              <GoogleGlyph /> Google
            </button>
            <button
              onClick={() => void run(signInApple)}
              disabled={busy}
              className="glass flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:border-acc-1/40"
            >
              <AppleGlyph /> Apple
            </button>
          </div>
          {mode === "local" ? (
            <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">{t("auth.oauthHint")}</p>
          ) : null}

          <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <Segmented
            className="mb-4 w-full justify-center"
            value={tab}
            onChange={(v) => setTab(v as "in" | "up")}
            options={[
              { value: "in", label: t("auth.signIn") },
              { value: "up", label: t("auth.signUp") },
            ]}
          />

          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => (tab === "in" ? signInEmail(email, pass) : signUpEmail(name, email, pass)));
            }}
          >
            {tab === "up" ? (
              <Field label={t("auth.name")}>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarya Sharma" autoComplete="name" />
              </Field>
            ) : null}
            <Field label={t("auth.email")}>
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@mail.com"
                autoComplete="email"
              />
            </Field>
            <Field label={t("auth.password")}>
              <TextInput
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete={tab === "in" ? "current-password" : "new-password"}
              />
            </Field>
            <AccentButton type="submit" className="w-full" size="lg" disabled={busy}>
              <Box size={16} />
              {tab === "in" ? t("auth.signIn") : t("auth.signUp")}
            </AccentButton>
          </form>

          <button
            onClick={() => {
              signInGuest();
              navigate("/");
            }}
            className="mt-4 w-full rounded-xl border border-dashed border-border py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-acc-1/50 hover:text-foreground"
          >
            {t("auth.guest")}
          </button>
        </GlassCard>
      </div>
    </section>
  );
}
