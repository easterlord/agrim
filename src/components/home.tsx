"use client";

/* ============================================================
 * EzFame — smm.gg-school dashboard.
 *
 * Layout (xl): [ Sidebar nav | Platform pills + service builder
 *               | sticky "Your Order" summary ]
 * Mobile: nav collapses to chips, summary docks to a bottom bar.
 *
 * Design rules: flat panels, hairline borders, one blue accent,
 * platform-colored icons, Framer Motion micro-interactions.
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgePercent,
  Bot,
  Check,
  Gamepad2,
  Gauge,
  LayoutGrid,
  Layers,
  LifeBuoy,
  Link2,
  Package as PackageIcon,
  RotateCcw,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformIcon } from "@/components/icons";
import {
  CountUp,
  GlassCard,
  AccentButton,
  Segmented,
  TextInput,
} from "@/components/ui-kit";
import { Tx, useI18n } from "@/lib/i18n";
import { useCatalog, useSettings } from "@/lib/data";
import { useDraft, useUI } from "@/lib/store";
import { navigate, useHashRoute } from "@/lib/router";
import { calcQtyPrice, cn, convertUSD, findPackage, fmtNPR, fmtUSD } from "@/lib/utils";
import type { Platform, ServiceType } from "@/lib/types";

/* ============================ HERO ============================ */

const FLOAT_CHIPS = [
  { icon: "👥", text: "+1,000 Followers", className: "left-[4%] top-[24%] hidden lg:flex", delay: 0 },
  { icon: "⚡", text: "UC delivered in 5 min", className: "right-[6%] top-[30%] hidden lg:flex", delay: 0.8 },
  { icon: "❤️", text: "+5,000 Likes", className: "left-[10%] bottom-[18%] hidden lg:flex", delay: 1.6 },
  { icon: "💎", text: "Free Fire x2 Bonus", className: "right-[10%] bottom-[22%] hidden lg:flex", delay: 2.2 },
];

export function Hero() {
  const { t } = useI18n();
  const { platforms } = useCatalog();

  const scrollToShop = () => {
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32">
      {FLOAT_CHIPS.map((chip) => (
        <motion.div
          key={chip.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, -12, 0] }}
          transition={{ opacity: { delay: 0.6 + chip.delay * 0.3, duration: 0.6 }, y: { duration: 5 + chip.delay, repeat: Infinity, ease: "easeInOut" } }}
          className={cn("glass absolute z-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground", chip.className)}
        >
          <span>{chip.icon}</span>
          {chip.text}
        </motion.div>
      ))}

      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
        >
          <span className="dot-live" />
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">{t("hero.badge")}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl"
        >
          {t("hero.title1")}
          <br />
          <span className="text-gradient">{t("hero.title2")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          {t("hero.sub")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <AccentButton size="lg" onClick={scrollToShop}>
            <Rocket size={17} />
            {t("hero.cta1")}
          </AccentButton>
          <AccentButton size="lg" variant="ghost" onClick={scrollToShop}>
            {t("hero.cta2")}
          </AccentButton>
        </motion.div>

        {/* stats — 18,450+ orders · 9,300+ clients · 4.9 rating */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-3"
        >
          {[
            { value: 18450, suffix: "+", label: t("hero.stat2"), decimals: 0 },
            { value: 9300, suffix: "+", label: t("hero.stat3"), decimals: 0 },
            { value: 4.9, suffix: "★", label: t("hero.stat4"), decimals: 1 },
          ].map((s, i) => (
            <GlassCard key={s.label} className="px-3 py-4" hover>
              <div className="font-[family-name:var(--f-display)] text-xl font-extrabold text-gradient sm:text-2xl">
                <CountUp to={s.value} suffix={s.suffix} decimals={s.decimals} duration={1.4 + i * 0.2} />
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
            </GlassCard>
          ))}
        </motion.div>
      </div>

      {/* platform marquee */}
      <div className="relative mt-14 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max gap-3">
          {[...platforms, ...platforms].map((p, i) => (
            <div key={`${p.id}-${i}`} className="glass flex items-center gap-2 rounded-full px-4 py-2">
              <PlatformIcon id={p.id} size={16} />
              <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ======================= SIDEBAR NAV ======================= */

export function SidebarNav({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const route = useHashRoute();
  const path = route.path || "";

  const items = [
    { id: "", label: t("side.newOrder"), icon: <Rocket size={16} />, to: "/" },
    { id: "services", label: t("side.services"), icon: <LayoutGrid size={16} />, to: "/services" },
    { id: "orders", label: t("side.orders"), icon: <PackageIcon size={16} />, to: "/orders" },
    { id: "mass", label: t("side.mass"), icon: <Layers size={16} />, to: "/mass" },
    { id: "refunds", label: t("side.refunds"), icon: <RotateCcw size={16} />, to: "/refunds" },
    { id: "support", label: t("side.support"), icon: <LifeBuoy size={16} />, to: "/support" },
  ];

  if (compact) {
    return (
      <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label={t("side.menu")}>
        {items.map((item) => {
          const active = item.id === path;
          return (
            <button
              key={item.id || "new"}
              onClick={() => navigate(item.to)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all",
                active
                  ? "border-transparent bg-acc-1 text-white"
                  : "border-border bg-panel text-muted-foreground hover:text-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden xl:block" aria-label={t("side.menu")}>
      <GlassCard className="sticky top-24 overflow-hidden p-3">
        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {t("side.menu")}
        </p>
        <div className="space-y-1">
          {items.map((item) => {
            const active = item.id === path;
            return (
              <motion.button
                key={item.id || "new"}
                onClick={() => navigate(item.to)}
                whileTap={{ scale: 0.98 }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-acc-1 text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className={cn("shrink-0", !active && "opacity-80")}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80" /> : null}
              </motion.button>
            );
          })}
        </div>
      </GlassCard>
    </nav>
  );
}

/* ======================= PLATFORM PILLS ======================= */

function PlatformPills({
  platforms,
  active,
  onSelect,
}: {
  platforms: Platform[];
  active: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState<"social" | "game">(
    platforms.find((p) => p.id === active)?.kind ?? "social",
  );

  const filtered = useMemo(() => platforms.filter((p) => p.kind === kind), [platforms, kind]);
  const activeId = active && filtered.some((p) => p.id === active) ? active : filtered[0]?.id ?? null;

  const switchKind = (k: "social" | "game") => {
    setKind(k);
    const list = platforms.filter((p) => p.kind === k);
    if (list.length && !list.some((p) => p.id === active)) onSelect(list[0].id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t("shop.title")}</h2>
          <p className="text-xs text-muted-foreground">{t("shop.sub")}</p>
        </div>
        <Segmented
          value={kind}
          onChange={(v) => switchKind(v as "social" | "game")}
          options={[
            { value: "social", label: <span className="flex items-center gap-1.5"><Sparkles size={12} /> {t("shop.social")}</span> },
            { value: "game", label: <span className="flex items-center gap-1.5"><Gamepad2 size={12} /> {t("shop.games")}</span> },
          ]}
        />
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, i) => {
            const isActive = p.id === activeId;
            return (
              <motion.button
                layout
                key={p.id}
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 380, damping: 28 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(p.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all",
                  isActive
                    ? "border-transparent bg-acc-1 text-white"
                    : "border-border bg-panel text-muted-foreground hover:text-foreground",
                )}
              >
                <PlatformIcon id={p.id} size={17} />
                <span>{p.name}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ======================= SERVICE CARDS ======================= */

function ServiceBadge({
  tone,
  children,
}: {
  tone: "ok" | "info" | "warn" | "neutral";
  children: React.ReactNode;
}) {
  const tones = {
    ok: "border-emerald-500/35 bg-emerald-500/10 text-emerald-500",
    info: "border-sky-500/35 bg-sky-500/10 text-sky-500",
    warn: "border-amber-500/35 bg-amber-500/10 text-amber-500",
    neutral: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

function Badges({ service }: { service: ServiceType }) {
  const { t } = useI18n();
  const fast = !!service.speed && /^(0\s*-\s*1|5\s*-\s*30\s*min|instant)/i.test(service.speed);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {service.warranty ? (
        <ServiceBadge tone="ok">
          <Check size={9} />
          <Tx text={service.warranty} />
        </ServiceBadge>
      ) : null}
      {service.speed ? (
        <ServiceBadge tone="info">
          <Gauge size={9} />
          {t("panel.badgeStart")} <Tx text={service.speed} />
        </ServiceBadge>
      ) : null}
      {service.speed ? (
        <ServiceBadge tone={fast ? "warn" : "neutral"}>
          <Zap size={9} />
          {t("panel.badgeSpeed")}: {fast ? t("panel.speedFast") : t("panel.speedNormal")}
        </ServiceBadge>
      ) : null}
      {service.cancellable !== false ? (
        <ServiceBadge tone="neutral">
          <Check size={9} />
          {t("panel.badgeCancel")}
        </ServiceBadge>
      ) : null}
    </span>
  );
}

function ServiceRow({
  service,
  currency,
  rate,
  active,
  onSelect,
}: {
  service: ServiceType;
  currency: "USD" | "NPR";
  rate: number;
  active: boolean;
  onSelect: () => void;
}) {
  const shown =
    currency === "NPR"
      ? fmtNPR(convertUSD(service.pricePerKUSD ?? 0, rate))
      : fmtUSD(service.pricePerKUSD ?? 0);

  return (
    <motion.button
      layout
      onClick={onSelect}
      whileTap={{ scale: 0.985 }}
      aria-pressed={active}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all",
        active ? "border-acc-1/60 bg-accent" : "border-border bg-panel hover:border-input",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          <Tx text={service.name} />
        </span>
        <span className="mt-1.5 flex min-h-[18px] items-center">
          <Badges service={service} />
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={cn("block font-mono text-sm font-bold", active ? "text-acc-1" : "text-foreground")}>
          {shown}
        </span>
        <span className="text-[10px] text-muted-foreground">/ 1,000</span>
      </span>
    </motion.button>
  );
}

/* ======================= YOUR ORDER BOX ======================= */

function YourOrderBox({
  platform,
  service,
  pkgLabel,
  link,
  qty,
  priceUSD,
  valid,
  rate,
  currency,
  err,
  onBuy,
}: {
  platform: Platform | null;
  service: ServiceType | null;
  pkgLabel?: string;
  link: string;
  qty: number;
  priceUSD: number;
  valid: boolean;
  rate: number;
  currency: "USD" | "NPR";
  err: string;
  onBuy: () => void;
}) {
  const { t } = useI18n();
  const charge = currency === "NPR" ? fmtNPR(convertUSD(priceUSD, rate)) : fmtUSD(priceUSD);
  const hasOrder = !!platform && !!service;

  return (
    <GlassCard className="overflow-hidden p-5 xl:sticky xl:top-24 xl:h-max">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {t("panel.yourOrder")}
        </h3>
        <span className="dot-live" />
      </div>

      {hasOrder ? (
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border"
              style={{ color: platform!.color }}
            >
              <PlatformIcon id={platform!.id} size={18} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">
                <Tx text={service!.name} />
              </p>
              <p className="text-[11px] text-muted-foreground">{platform!.name}</p>
            </div>
          </div>

          {pkgLabel ? (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-xs text-muted-foreground">{t("shop.package")}</span>
              <span className="font-mono text-xs font-bold">{pkgLabel}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-xs text-muted-foreground">{t("panel.quantity")}</span>
              <span className="font-mono text-xs font-bold">{qty.toLocaleString()}</span>
            </div>
          )}

          {link ? (
            <div className="rounded-lg bg-muted px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("panel.link")}</p>
              <p className="truncate font-mono text-[11px]">{link}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("panel.charge")}
            </span>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={charge}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="font-[family-name:var(--f-display)] text-2xl font-extrabold text-gradient"
              >
                {charge}
              </motion.span>
            </AnimatePresence>
          </div>

          {currency === "NPR" ? (
            <p className="text-right text-[10px] text-muted-foreground">
              {t("panel.rateNow")} · USD 1 = NPR {rate.toFixed(2)}
            </p>
          ) : null}

          {err ? <p className="text-xs font-semibold text-red-400">{err}</p> : null}

          <motion.div whileHover={valid ? { scale: 1.015 } : undefined} whileTap={valid ? { scale: 0.985 } : undefined}>
            <AccentButton size="lg" className="w-full" onClick={onBuy} disabled={!valid || priceUSD <= 0}>
              <ShoppingBag size={16} />
              {t("shop.buyNow")}
            </AccentButton>
          </motion.div>

          <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
            <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-500" />
            {t("shop.dropNote")}
          </p>
        </div>
      ) : (
        <p className="py-8 text-center text-xs text-muted-foreground">{t("panel.orderEmpty")}</p>
      )}
    </GlassCard>
  );
}

/* ======================= DASHBOARD ======================= */

export function ShopSection() {
  const { t } = useI18n();
  const { platforms } = useCatalog();
  const { settings } = useSettings();
  const { currency } = useUI();
  const draft = useDraft();

  const [platformId, setPlatformId] = useState<string | null>(draft.platformId);
  const [typeId, setTypeId] = useState<string | null>(draft.typeId);
  const [qty, setQty] = useState<number>(draft.quantity ?? 1000);
  const [packageId, setPackageId] = useState<string | null>(draft.packageId);
  const [playerId, setPlayerId] = useState(draft.playerId ?? "");
  const [link, setLink] = useState(draft.link ?? "");
  const [err, setErr] = useState("");

  const platform = platforms.find((p) => p.id === platformId) ?? platforms.find((p) => p.kind === "social") ?? platforms[0] ?? null;
  const activeServices = useMemo(() => platform?.services.filter((s) => s.active) ?? [], [platform]);
  const service = activeServices.find((s) => s.id === typeId) ?? activeServices[0] ?? null;
  const isGame = platform?.kind === "game";
  const effPackageId =
    service?.packages?.length
      ? service.packages.some((p) => p.id === packageId)
        ? packageId
        : service.packages[0].id
      : null;

  const price = useMemo(() => {
    if (!service) return { usd: 0, valid: false, qty: 0 };
    if (service.packages?.length) {
      const pk = findPackage(service, effPackageId);
      return { usd: pk?.priceUSD ?? 0, valid: true, qty: pk?.qty ?? 0 };
    }
    const r = calcQtyPrice(service, qty);
    return { usd: r.usd, valid: r.valid, qty: r.qty };
  }, [service, effPackageId, qty]);

  const selectedPkg = service?.packages?.length ? findPackage(service, effPackageId) : null;

  const buy = () => {
    setErr("");
    if (!platform || !service) return;
    if (service.packages?.length && !effPackageId) {
      setErr(t("shop.package"));
      return;
    }
    if (!service.packages?.length && !price.valid) {
      setErr(`${t("shop.min")}: ${service.minQty ?? 100}`);
      return;
    }
    if (isGame && !playerId.trim()) {
      setErr(t("shop.uidHint"));
      document.getElementById("cfg-player")?.focus();
      return;
    }
    draft.setDraft({
      platformId: platform.id,
      typeId: service.id,
      quantity: service.packages?.length ? null : price.qty,
      packageId: service.packages?.length ? effPackageId : null,
      playerId: playerId.trim(),
      link: link.trim(),
    });
    navigate("/checkout");
  };

  const sliderFill =
    service && service.maxQty && service.maxQty > (service.minQty ?? 100)
      ? `${(((price.qty - (service.minQty ?? 100)) / (service.maxQty - (service.minQty ?? 100))) * 100).toFixed(1)}%`
      : "50%";

  return (
    <section id="shop" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6">
      {/* compact nav chips — visible below xl (sidebar takes over at xl) */}
      <div className="mb-4 xl:hidden">
        <SidebarNav compact />
      </div>
      <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_310px]">
        <SidebarNav />

        {/* main column */}
        <div className="min-w-0 space-y-6">
          <PlatformPills platforms={platforms} active={platform?.id ?? null} onSelect={setPlatformId} />

          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1">
            {/* service list */}
            <GlassCard className="overflow-hidden p-4">
              {platform ? (
                <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border"
                    style={{ color: platform.color }}
                  >
                    <PlatformIcon id={platform.id} size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{platform.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {activeServices.length} {t("nav.services").toLowerCase()}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {activeServices.map((s) => (
                  <ServiceRow
                    key={s.id}
                    service={s}
                    currency={currency}
                    rate={settings.exchangeRate}
                    active={s.id === service?.id}
                    onSelect={() => setTypeId(s.id)}
                  />
                ))}
                {platform && activeServices.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">{t("shop.selectPrompt")}</p>
                ) : null}
              </div>
            </GlassCard>

            {/* config */}
            <GlassCard className="overflow-hidden p-4 sm:p-5 xl:order-none">
              <AnimatePresence mode="wait">
                {service ? (
                  <motion.div
                    key={`${platform?.id}-${service.id}`}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold">
                          <Tx text={service.name} />
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <Badges service={service} />
                        </p>
                      </div>
                    </div>

                    {service.description ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <Tx text={service.description} />
                      </p>
                    ) : null}

                    {/* quantity based */}
                    {!service.packages?.length && service.pricePerKUSD ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("shop.quantity")}
                          </span>
                          <div className="flex items-center gap-1">
                            {[500, 1000, 5000, 10000].map((v) => (
                              <button
                                key={v}
                                onClick={() => setQty(v)}
                                className={cn(
                                  "rounded-md px-2 py-1 font-mono text-[11px] font-bold transition-colors",
                                  price.qty === v ? "bg-acc-1 text-white" : "text-muted-foreground hover:bg-muted",
                                )}
                              >
                                {v >= 1000 ? `${v / 1000}k` : v}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="range"
                          className="slider-accent"
                          style={{ ["--fill" as string]: sliderFill }}
                          min={service.minQty ?? 100}
                          max={service.maxQty ?? 100000}
                          step={service.stepQty ?? 50}
                          value={price.qty}
                          onChange={(e) => setQty(Number(e.target.value))}
                          aria-label={t("shop.quantity")}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <TextInput
                            type="number"
                            value={qty}
                            min={service.minQty}
                            max={service.maxQty}
                            step={service.stepQty}
                            onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
                            className="w-36 font-mono"
                            aria-label={t("shop.quantity")}
                          />
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {t("shop.min")} {(service.minQty ?? 100).toLocaleString()} • {t("shop.max")}{" "}
                            {(service.maxQty ?? 0).toLocaleString()}
                          </span>
                        </div>

                        {!isGame ? (
                          <div className="relative">
                            <Link2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <TextInput
                              value={link}
                              onChange={(e) => setLink(e.target.value)}
                              placeholder={t("shop.linkHint")}
                              className="pl-10"
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* packages (games) */}
                    {service.packages?.length ? (
                      <div className="space-y-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("shop.package")}
                        </span>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                          {service.packages.map((pk) => {
                            const activeP = pk.id === effPackageId;
                            return (
                              <motion.button
                                key={pk.id}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setPackageId(pk.id)}
                                className={cn(
                                  "relative rounded-xl border p-3 text-left transition-all",
                                  activeP ? "border-acc-1/60 bg-accent" : "border-border hover:border-input",
                                )}
                              >
                                {pk.hot ? (
                                  <span className="absolute -top-2 right-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                                    HOT
                                  </span>
                                ) : null}
                                <p className="text-sm font-bold">{pk.label}</p>
                                {pk.bonus ? <p className="text-[10px] font-semibold text-emerald-500">{pk.bonus}</p> : null}
                                <p className={cn("mt-1 font-mono text-xs font-bold", activeP ? "text-acc-1" : "text-muted-foreground")}>
                                  {currency === "NPR" ? fmtNPR(convertUSD(pk.priceUSD, settings.exchangeRate)) : fmtUSD(pk.priceUSD)}
                                </p>
                              </motion.button>
                            );
                          })}
                        </div>

                        <div className="relative">
                          <Gamepad2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <TextInput
                            id="cfg-player"
                            value={playerId}
                            onChange={(e) => setPlayerId(e.target.value)}
                            placeholder={`${t("shop.uidLabel")} — ${t("shop.uidHint")}`}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* mandatory drop disclaimer */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-amber-500"
                    >
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      {t("shop.dropNote")}
                    </motion.p>

                    {err ? (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold text-red-400">
                        {err}
                      </motion.p>
                    ) : null}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-64 items-center justify-center text-sm text-muted-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <PackageIcon size={16} />
                      {t("shop.selectPrompt")}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>
        </div>

        {/* sticky summary — desktop */}
        <div className="hidden xl:block">
          <YourOrderBox
            platform={platform}
            service={service}
            pkgLabel={selectedPkg?.label}
            link={link.trim()}
            qty={price.qty}
            priceUSD={price.usd}
            valid={price.valid}
            rate={settings.exchangeRate}
            currency={currency}
            err={err}
            onBuy={buy}
          />
        </div>
      </div>

      {/* mobile sticky summary bar */}
      <div className="sticky bottom-3 z-30 mt-5 xl:hidden">
        <GlassCard className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("panel.charge")}
            </p>
            <p className="font-[family-name:var(--f-display)] text-lg font-extrabold text-gradient">
              {currency === "NPR" ? fmtNPR(convertUSD(price.usd, settings.exchangeRate)) : fmtUSD(price.usd)}
            </p>
          </div>
          <AccentButton onClick={buy} disabled={!price.valid || price.usd <= 0}>
            <ShoppingBag size={15} />
            {t("shop.buyNow")}
          </AccentButton>
        </GlassCard>
      </div>
    </section>
  );
}

/* ======================= FEATURES (strip) ======================= */

export function Features() {
  const { t } = useI18n();
  const features = [
    { icon: <Zap size={20} />, title: t("features.f1t"), desc: t("features.f1d"), tint: "var(--acc-1)" },
    { icon: <ShieldCheck size={20} />, title: t("features.f2t"), desc: t("features.f2d"), tint: "var(--acc-2)" },
    { icon: <Bot size={20} />, title: t("features.f3t"), desc: t("features.f3d"), tint: "var(--acc-3)" },
    { icon: <BadgePercent size={20} />, title: t("features.f4t"), desc: t("features.f4d"), tint: "var(--ok)" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlassCard hover className="h-full p-5">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border"
                style={{ color: f.tint, background: `color-mix(in oklab, ${f.tint} 10%, transparent)` }}
              >
                {f.icon}
              </div>
              <h3 className="text-sm font-bold">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
